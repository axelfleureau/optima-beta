/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    allowedDevOrigins: [
      '*.replit.dev',
      '.replit.dev',
    ],
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  // Webpack configuration to fix chunk loading timeout
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Increase chunk loading timeout to 60 seconds (default is 120000ms/2min)
      config.output.chunkLoadTimeout = 60000
    }
    return config
  },
  // Allow all hosts for Replit proxy environment
  async rewrites() {
    return []
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/ai-assistant',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  // Move skipTrailingSlashRedirect out of experimental as per Next.js 15 requirements
  skipTrailingSlashRedirect: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
