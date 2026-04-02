import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@mosaic/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
}

export default nextConfig
