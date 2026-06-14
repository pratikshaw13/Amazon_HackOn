/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['secondlife-ai-products.s3.amazonaws.com', 'secondlife-ai-products.s3.ap-south-1.amazonaws.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
