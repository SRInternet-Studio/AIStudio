/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep the Edge-TTS WebSocket stack (msedge-tts → ws → bufferutil/utf-8-validate)
    // out of the webpack bundle. When bundled, ws' optional native addon fails to load,
    // causing `bufferUtil.mask is not a function` at runtime. Marking them external makes
    // Next.js require them from node_modules at runtime so the native addons resolve.
    serverComponentsExternalPackages: [
      "msedge-tts",
      "ws",
      "bufferutil",
      "utf-8-validate",
      // RAG local embeddings: @huggingface/transformers pulls in onnxruntime-node
      // (native binaries) and sharp — keep them out of the webpack bundle so they
      // resolve from node_modules at runtime (same pattern as msedge-tts).
      "@huggingface/transformers",
      "onnxruntime-node",
      "sharp",
    ],
  },
};

module.exports = nextConfig;
