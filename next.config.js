/** @type {import('next').NextConfig} */
const nextConfig = {
  // Large media attachments are sent as base64 inside the JSON body of
  // /api/chat. When the opt-in "Compress media" toggle is ON the payload
  // carries BOTH the compressed copy (for the model) and the untouched
  // original (for the DB) — and even a plain upload of a 50MB video inflates
  // to ~67MB of base64. Next.js buffers the request body for the proxy and
  // truncates it at 10MB by default (request.json() then throws, surfacing a
  // misleading 413). Raise the proxy body buffer so large attachments reach
  // the handler intact; the 70MB guard in /api/chat is the authority.
  experimental: {
    proxyClientMaxBodySize: "100mb",
  },
  // Next 15+: experimental.serverComponentsExternalPackages was renamed to
  // top-level serverExternalPackages (the old key is silently ignored).
  // Keep the Edge-TTS WebSocket stack (msedge-tts → ws → bufferutil/utf-8-validate)
  // out of the bundle. When bundled, ws' optional native addon fails to load,
  // causing `bufferUtil.mask is not a function` at runtime. Marking them external makes
  // Next.js require them from node_modules at runtime so the native addons resolve.
  serverExternalPackages: [
    "msedge-tts",
    "ws",
    "bufferutil",
    "utf-8-validate",
    // RAG local embeddings: @huggingface/transformers pulls in onnxruntime-node
    // (native binaries) and sharp — keep them out of the bundle so they
    // resolve from node_modules at runtime (same pattern as msedge-tts).
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp",
  ],
};

module.exports = nextConfig;
