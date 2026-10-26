# Project Debug Rules (Non-Obvious Only)

- Middleware (`src/middleware.ts`) only redirects unauthenticated page requests; it cannot verify the unlock cookie. Real auth enforcement is `requireUnlock()` in each DB API route. Debugging locked requests requires checking route handlers, not middleware.
- `/api/chat` stream errors persist partial assistant output automatically. If generated text appears missing after a crash, inspect the `blocks` table — `persistAssistantMessage` stores partial content idempotently.
- Large attachment failures usually surface as HTML 413 pages from a reverse proxy. `InputBox.tsx` and `/api/chat` both enforce a 70 MB base64-char cap and return JSON 413, but a proxy may still cut the body before it reaches Next.js.
- Local RAG embedding downloads patch both `globalThis.fetch` and `https.get/https.request`. If download failures persist, verify `enableDownloadProxy()` restore logic runs; otherwise later requests keep a dead proxy dispatcher.
- Windows file-handle release after tests can race. `tests/stream-error-save.test.ts` retries `fs.rmSync` on `tmpDir` because `libsql` may hold the file briefly after `client.close()`.
- `next build` fails on ESLint errors in Next 16. If build breaks on hook-deps warnings, remember they are downgraded to `warn` in `eslint.config.mjs`; only new violations should block CI.
