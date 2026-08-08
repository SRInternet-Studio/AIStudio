/**
 * Test bootstrap for `npm test` (Node's built-in test runner).
 *
 * Node runs the TS test files natively via type stripping, but it does not
 * know about the tsconfig "@/*" path alias used across src/. This module
 * registers a synchronous resolve hook mapping "@/x" -> "<root>/src/x(.ts)".
 */
import { registerHooks } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC = path.resolve(import.meta.dirname, "..", "src");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const rel = specifier.slice(2);
      const candidates = [
        path.join(SRC, rel + ".ts"),
        path.join(SRC, rel + ".tsx"),
        path.join(SRC, rel, "index.ts"),
        path.join(SRC, rel),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
