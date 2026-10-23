import type { NextConfig } from "next"
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
  },
} satisfies NextConfig

export default nextConfig
