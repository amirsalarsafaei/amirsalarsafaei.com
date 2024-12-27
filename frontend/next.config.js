const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', 'troika-three-text'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@generated': path.resolve(__dirname, '../autogenerated/ts')
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {

    ignoreBuildErrors: true,
  },
  pageExtensions: ['tsx', 'ts', 'jsx', 'js']
};

module.exports = nextConfig;
