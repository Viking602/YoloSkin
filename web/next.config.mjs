/** @type {import('next').NextConfig} */
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
}

export default nextConfig
