import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)));

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Keep Turbopack from picking up the package-lock in the user's home directory.
    root: projectRoot,
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .filter(Boolean)
    .concat("**.devtunnels.ms", "**.trycloudflare.com"),
};

export default nextConfig;
