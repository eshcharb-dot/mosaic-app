import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@mosaic/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default nextConfig
