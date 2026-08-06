# Contributing

> Thanks for considering a contribution! AIStudiois an open-source,
> non-commercial learning project — every improvement is welcome.

## How to Contribute

1. **Fork** the repository and create a topic branch from `main`
   (e.g. `feature/tts-playlist` or `fix/sidebar-flicker`).
2. Make your changes, following the [Coding Standards](#coding-standards).
3. Verify locally: `npx tsc --noEmit` passes and `npm run build` succeeds.
4. Open a **Pull Request** with a clear description of the change, the
   motivation, and screenshots/GIFs for UI changes.

## Development Setup

```bash
git clone https://github.com/SRInternet-Studio/AIStudio.git
cd AIStudio
npm install
npm run dev      # http://localhost:3000
```

- Node.js ≥ 18.17 (Next.js 14 requirement).
- The app auto-creates `data/ai-studio.db` on first run — no external DB
  needed.
- Configure an API endpoint in **Settings → API configuration** to test chat.

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR.
- Reference related issues in the description.
- No new runtime dependencies unless clearly justified.
- Do not commit `data/*.db`, `.next/`, `node_modules/` or screenshots taken
  during debugging.
- Updates affecting docs should touch **both** the English (root) and Chinese
  (`Docs/`) versions.

## Coding Standards

- **Components**: PascalCase files under `src/components/<area>/`.
- **State**: global UI state lives in `src/store/chatStore.ts` (Zustand);
  avoid prop drilling.
- **Styling**: Tailwind with theme tokens (`bg-background`, `text-foreground`,
  `bg-card`, ...) — never hardcoded colors, to keep dark/light themes intact.
- **Logging**: prefix console logs with `[ComponentName]`.
- **API routes**: `force-dynamic`, JSON responses shaped
  `{ success, data | error }`.
- **Comments**: keep functional warnings (ordering, z-index, hydration) —
  remove purely descriptive commentary.
