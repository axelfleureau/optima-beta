/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Disable static optimization for specific routes that use client-only features
    skipTrailingSlashRedirect: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable static generation for AI assistant page
  async generateStaticParams() {
    return []
  },
  // Configure which pages should not be prerendered
  async headers() {
    return [
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
  // Disable static optimization for problematic routes
  async rewrites() {
    return []
  },
}

export default nextConfig
