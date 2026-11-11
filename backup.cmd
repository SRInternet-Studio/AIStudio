@echo off
setlocal EnableDelayedExpansion

REM ==========================================================================
REM  AI Studio hot (online) database backup
REM
REM  Snapshots the live SQLite database through SQLite's Online Backup API,
REM  so the running app is never stopped, restarted or blocked for longer
REM  than a single page batch. Safe to run unattended (Task Scheduler, SYSTEM
REM  account) while the service is serving traffic.
REM
REM  Usage: double-click, or run from the project root:
REM      backup.cmd
REM  Optional overrides:
REM      backup.cmd [src_dir] [dest_dir] [max_backups] [compress]
REM
REM  Retention: at most MAX_BACKUPS archives, oldest removed first. Edit the
REM  value below.
REM ==========================================================================

REM ---- configuration -------------------------------------------------------
set MAX_BACKUPS=5
set COMPRESS=1
set DB_NAME=ai-studio.db
set PY_SCRIPT=scripts\backup-db.py
set LOG_DIR=data\backup\log
set RETRY_MAX=3
set RETRY_DELAY=30
REM ---------------------------------------------------------------------------

set SRC_DIR=data
set DEST_DIR=data\backup

if not "%~1"=="" set SRC_DIR=%~1
if not "%~2"=="" set DEST_DIR=%~2
if not "%~3"=="" set MAX_BACKUPS=%~3
if not "%~4"=="" set COMPRESS=%~4

set ROOT=%~dp0
if not exist "%ROOT%%LOG_DIR%" mkdir "%ROOT%%LOG_DIR%"

REM Fixed-width timestamp via PowerShell: %DATE%/%TIME% parsing depends on the
REM system locale and breaks under a non-standard regional format.
set STAMP=
for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"`) do set STAMP=%%T
if "%STAMP%"=="" (
    echo [ERROR] Failed to read the current time.
    exit /b 4
)
set LOG=%ROOT%%LOG_DIR%\backup_%STAMP%.log

echo [backup] start %STAMP% >> "%LOG%"

REM Resolve an interpreter without relying on PATH: Task Scheduler runs with a
REM minimal environment under which `python` is often unreachable.
set PY=
for %%C in (python.exe py.exe) do (
    if not defined PY (
        for /f "usebackq delims=" %%P in (`where %%C 2^>nul`) do (
            if not defined PY set PY=%%P
        )
    )
)
if not defined PY (
    for %%P in (
        "%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
        "%ProgramFiles%\Python314\python.exe"
        "%ProgramFiles%\Python313\python.exe"
        "%ProgramFiles%\Python312\python.exe"
        "%ProgramFiles%\Python311\python.exe"
        "C:\Python314\python.exe"
        "C:\Python313\python.exe"
        "C:\Python312\python.exe"
        "C:\Python311\python.exe"
    ) do (
        if not defined PY if exist %%P set PY=%%P
    )
)

if not defined PY (
    echo [ERROR] No Python interpreter found. Install Python 3.11+ or add it to PATH. >> "%LOG%"
    echo [ERROR] No Python interpreter found. Install Python 3.11+ or add it to PATH.
    exit /b 3
)

echo [backup] python=%PY% >> "%LOG%"

set ATTEMPT=1
:RETRY
"%PY%" "%ROOT%%PY_SCRIPT%" --db "%ROOT%%SRC_DIR%\%DB_NAME%" --dest "%ROOT%%DEST_DIR%" --max-backups %MAX_BACKUPS% --compress %COMPRESS% --log "%LOG%"
set RC=%ERRORLEVEL%

if "%RC%"=="0" (
    echo [backup] success >> "%LOG%"
    exit /b 0
)

echo [backup] attempt %ATTEMPT% failed rc=%RC% >> "%LOG%"
if %ATTEMPT% GEQ %RETRY_MAX% (
    echo [ERROR] Backup failed after %RETRY_MAX% attempts ^(rc=%RC%^). See %LOG% >> "%LOG%"
    echo [ERROR] Backup failed after %RETRY_MAX% attempts ^(rc=%RC%^). See %LOG%
    exit /b %RC%
)

set /a ATTEMPT+=1
echo [backup] retrying in %RETRY_DELAY%s >> "%LOG%"
timeout /t %RETRY_DELAY% /nobreak >nul
goto RETRY
