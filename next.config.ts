import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    // Pin workspace root so Turbopack resolves node_modules from web/
    // instead of walking up to the parent opsuite/ Expo project.
    root: __dirname,
  },
};

export default nextConfig;
