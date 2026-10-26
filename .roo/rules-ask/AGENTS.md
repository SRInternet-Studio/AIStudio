# Project Documentation Rules (Non-Obvious Only)

- `src/` is a Next.js App Router application (server routes, client components, lib), not a generic source folder.
- `data/` is created at runtime for `ai-studio.db`; it is not committed and may not exist until the app runs.
- `tests/` sits at repo root and uses Node's built-in test runner with TS type stripping plus a custom `@/` resolve hook (`tests/register.mjs`).
- `GeminiDocs/` is standalone Gemini API reference material, independent of the main app docs under `Docs/` and `wiki/`.
- `public/Pictures/` mirrors repo `Pictures/` for static serving; screenshots are referenced from docs and UI.
- `Docs/` duplicates some root markdown; authoritative project docs may be in `wiki/` instead.
