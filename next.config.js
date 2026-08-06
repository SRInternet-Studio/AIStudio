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
    ],
  },
};

module.exports = nextConfig;
