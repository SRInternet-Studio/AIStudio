#!/usr/bin/env python3
"""Hot (online) backup for the AI Studio SQLite database.

Produces a consistent snapshot of a live database through SQLite's Online
Backup API, so the running application is never stopped, restarted or blocked
for more than the length of a single page batch.

The snapshot is written to a scratch directory, verified, and only then moved
into the retention directory. Unattended runs (Task Scheduler, SYSTEM
account) are logged line by line to a file.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import glob
import os
import shutil
import sqlite3
import subprocess
import sys
import time
import zipfile

# Pages copied per Online Backup API batch. A small batch lets a concurrent
# writer grab the lock between batches, which is what keeps the snapshot
# cheap for the live service.
BATCH_PAGES = 512
BATCH_SLEEP = 0.02
BUSY_TIMEOUT_MS = 30_000
VERIFY_RETRIES = 3
SQLITE3_CANDIDATES = (
    "sqlite3.exe",
    os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), "SQLite", "sqlite3.exe"),
    os.path.join(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"), "SQLite", "sqlite3.exe"),
)


class Logger:
    def __init__(self, path: str | None):
        self._fh = open(path, "a", encoding="utf-8") if path else None

    def __call__(self, level: str, msg: str) -> None:
        line = f"{_dt.datetime.now().isoformat(timespec='seconds')} [{level}] {msg}"
        print(line, flush=True)
        if self._fh:
            self._fh.write(line + "\n")
            self._fh.flush()

    def close(self) -> None:
        if self._fh:
            self._fh.close()


def find_sqlite3() -> str | None:
    for cand in SQLITE3_CANDIDATES:
        if os.path.isabs(cand):
            if os.path.isfile(cand):
                return cand
            continue
        found = shutil.which(cand)
        if found:
            return found
    return None


def run_sqlite3_cli(exe: str, src: str, dst: str, log: Logger) -> None:
    """Snapshot via the sqlite3 shell's .backup command (also Online Backup API)."""
    script = f".backup '{dst}'"
    cmd = [exe, "-bail", "-cmd", script, src]
    log("INFO", f"sqlite3 CLI backup: {' '.join(cmd)}")
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if proc.returncode != 0:
        raise RuntimeError(f"sqlite3 CLI failed rc={proc.returncode}: {proc.stderr.strip() or proc.stdout.strip()}")


def run_python_backup(src: str, dst: str, log: Logger) -> None:
    """Snapshot via Python's sqlite3 backup (SQLite Online Backup API)."""
    src_uri = f"file:{src}?mode=ro"
    src_con = sqlite3.connect(src_uri, uri=True, timeout=BUSY_TIMEOUT_MS / 1000)
    try:
        dst_con = sqlite3.connect(dst, timeout=BUSY_TIMEOUT_MS / 1000)
        try:
            src_con.backup(dst_con, pages=BATCH_PAGES, sleep=BATCH_SLEEP)
        finally:
            dst_con.close()
    finally:
        src_con.close()


def snapshot(src: str, dst: str, log: Logger, prefer_cli: bool) -> str:
    """Create the snapshot, retrying while the source is busy."""
    sqlite3_exe = find_sqlite3() if prefer_cli else None
    if sqlite3_exe:
        log("INFO", f"sqlite3.exe found: {sqlite3_exe}")
    else:
        log("INFO", "sqlite3.exe not available — falling back to Python sqlite3 backup API")

    last_err: Exception | None = None
    for attempt in range(1, VERIFY_RETRIES + 1):
        try:
            if sqlite3_exe:
                run_sqlite3_cli(sqlite3_exe, src, dst, log)
            else:
                run_python_backup(src, dst, log)
            return "cli" if sqlite3_exe else "python-api"
        except sqlite3.OperationalError as exc:
            last_err = exc
            log("WARN", f"snapshot attempt {attempt}/{VERIFY_RETRIES} failed: {exc}")
            time.sleep(2 * attempt)
        except Exception as exc:  # noqa: BLE001 - report and retry anything transient
            last_err = exc
            log("WARN", f"snapshot attempt {attempt}/{VERIFY_RETRIES} failed: {exc}")
            time.sleep(2 * attempt)
    raise RuntimeError(f"snapshot failed after {VERIFY_RETRIES} attempts: {last_err}")


def inspect(path: str, log: Logger) -> dict:
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=BUSY_TIMEOUT_MS / 1000)
    try:
        cur = con.cursor()
        info: dict = {}
        cur.execute("PRAGMA journal_mode")
        info["journal_mode"] = cur.fetchone()[0]
        cur.execute("PRAGMA quick_check")
        info["quick_check"] = cur.fetchone()[0]
        if info["quick_check"] != "ok":
            cur.execute("PRAGMA integrity_check")
            info["integrity_check"] = cur.fetchone()[0]
        for table in ("messages", "blocks"):
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                info[table] = cur.fetchone()[0]
            except sqlite3.Error:
                info[table] = -1
        return info
    finally:
        con.close()


def verify(path: str, log: Logger) -> dict:
    info = inspect(path, log)
    if info.get("quick_check") != "ok":
        raise RuntimeError(f"snapshot failed verification: quick_check={info.get('quick_check')} "
                           f"integrity_check={info.get('integrity_check')}")
    log("INFO", f"snapshot verified: journal_mode={info['journal_mode']} "
                f"messages={info['messages']} blocks={info['blocks']}")
    return info


def archive(tmp_db: str, dest_dir: str, stamp: str, compress: bool, log: Logger) -> str:
    if compress:
        target = os.path.join(dest_dir, f"ai-studio-backup_{stamp}.db.zip")
        started = time.time()
        with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zf:
            zf.write(tmp_db, arcname="ai-studio.db")
        log("INFO", f"archived to {target} ({os.path.getsize(target)} bytes, "
                    f"{time.time() - started:.1f}s)")
    else:
        target = os.path.join(dest_dir, f"ai-studio-backup_{stamp}.db")
        shutil.move(tmp_db, target)
        log("INFO", f"moved to {target} ({os.path.getsize(target)} bytes)")
    return target


def prune(dest_dir: str, max_backups: int, log: Logger) -> None:
    entries = sorted(glob.glob(os.path.join(dest_dir, "ai-studio-backup_*")))
    stale = entries[:-max_backups] if max_backups > 0 else []
    for path in stale:
        try:
            os.remove(path)
            log("INFO", f"pruned old backup: {os.path.basename(path)}")
        except OSError as exc:
            log("WARN", f"failed to prune {path}: {exc}")
    log("INFO", f"retention: {len(entries) - len(stale)}/{max_backups} backups kept")


def main() -> int:
    parser = argparse.ArgumentParser(description="Hot backup of the AI Studio SQLite database.")
    parser.add_argument("--db", required=True, help="Path to the live database file.")
    parser.add_argument("--dest", required=True, help="Retention directory for finished backups.")
    parser.add_argument("--scratch", default=None, help="Scratch directory for the snapshot (default: <dest>/.tmp).")
    parser.add_argument("--max-backups", type=int, default=5)
    parser.add_argument("--compress", type=int, default=1, choices=(0, 1))
    parser.add_argument("--log", default=None, help="Log file path (appended).")
    parser.add_argument("--no-cli", action="store_true", help="Skip sqlite3.exe detection and use the Python API.")
    args = parser.parse_args()

    src = os.path.abspath(args.db)
    dest_dir = os.path.abspath(args.dest)
    scratch = os.path.abspath(args.scratch) if args.scratch else os.path.join(dest_dir, ".tmp")
    stamp = _dt.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

    log = Logger(args.log)
    started = time.time()
    tmp_db = ""
    try:
        log("INFO", f"hot backup start db={src} dest={dest_dir} scratch={scratch} "
                    f"max_backups={args.max_backups} compress={args.compress}")
        if not os.path.isfile(src):
            log("ERROR", f"database not found: {src}")
            return 2

        os.makedirs(dest_dir, exist_ok=True)
        os.makedirs(scratch, exist_ok=True)
        tmp_db = os.path.join(scratch, f"snapshot-{stamp}.db")
        if os.path.exists(tmp_db):
            os.remove(tmp_db)

        engine = snapshot(src, tmp_db, log, prefer_cli=not args.no_cli)
        size = os.path.getsize(tmp_db)
        log("INFO", f"snapshot written via {engine}: {tmp_db} ({size} bytes)")

        verify(tmp_db, log)

        archive(tmp_db, dest_dir, stamp, bool(args.compress), log)
        prune(dest_dir, args.max_backups, log)

        log("INFO", f"hot backup finished in {time.time() - started:.1f}s")
        return 0
    except Exception as exc:  # noqa: BLE001 - top-level guard for unattended runs
        log("ERROR", f"backup failed: {exc}")
        import traceback
        for line in traceback.format_exc().splitlines():
            log("ERROR", line)
        return 1
    finally:
        if tmp_db and os.path.exists(tmp_db):
            try:
                os.remove(tmp_db)
            except OSError:
                pass
        log.close()


if __name__ == "__main__":
    sys.exit(main())
