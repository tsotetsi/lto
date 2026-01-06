import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Essential for the Docker runner stage
  reactCompiler: true,
};

export default nextConfig;
