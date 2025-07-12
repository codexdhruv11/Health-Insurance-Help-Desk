/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add node-loader for .node files
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Handle @react-pdf/renderer
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
        'pdfkit': false,
      };
    }

    // Ignore canvas in server-side
    if (isServer) {
      config.externals.push('canvas');
    }

    return config;
  },
  experimental: {
    webpackBuildWorker: true,
  },
};

import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);