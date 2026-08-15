// ESLint flat config (ESLint 9 + eslint-config-next 16).
// Replaces the legacy .eslintrc.json ("extends": "next/core-web-vitals");
// Next 16 removed `next lint`, so `npm run lint` now runs ESLint directly.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const nextConfigs = Array.isArray(nextCoreWebVitals)
  ? nextCoreWebVitals
  : [nextCoreWebVitals];

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "release/**",
    ],
  },
  ...nextConfigs,
  {
    // Keep parity with the legacy .eslintrc behavior: these pre-existing
    // patterns were WARNINGS before the ESLint 9 / react-hooks v7 upgrade
    // promoted them to errors. Downgrade them back so `npm run lint` and
    // `next build` (which fails on lint errors) are not blocked by legacy
    // code; fix them incrementally instead.
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      // eslint-config-next 16 ships react-hooks v7, whose React Compiler
      // diagnostics are ERRORS by default and flag many pre-existing legacy
      // patterns (hoisted declarations, effect setState, inferred mutation).
      // The compiler itself is opt-in and NOT enabled for this app, so keep
      // these advisory: warn instead of error, fix incrementally.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/memoized-effect-dependencies": "warn",
      "react-hooks/exhaustive-effect-dependencies": "warn",
      "react-hooks/no-deriving-state-in-effects": "warn",
      "react-hooks/memo-dependencies": "warn",
      "@next/next/no-img-element": "warn",
      "jsx-a11y/media-has-caption": "warn",
    },
  },
];
