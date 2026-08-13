import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to serve client assets/HMR when opened from the LAN IP
  // or a Cloudflare quick tunnel (otherwise the page renders but never hydrates).
  allowedDevOrigins: [
    "192.168.5.249",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
