/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['secondlife-ai-products.s3.amazonaws.com'],
  },
}

module.exports = nextConfig
