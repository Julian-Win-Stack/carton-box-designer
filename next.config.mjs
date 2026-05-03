/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@neplex/vectorizer', 'sharp'],
  },
};

export default nextConfig;
