import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_WEBSOCKET_ORIGIN: process.env.NEXT_PUBLIC_WEBSOCKET_ORIGIN ?? "ws://localhost:3001",
  },
};

export default nextConfig;
