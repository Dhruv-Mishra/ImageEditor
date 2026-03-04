/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile web-haptics so its ES2022+ class fields work on older iOS Safari
  transpilePackages: ['web-haptics'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/crop-suggest',
        destination: 'http://127.0.0.1:8000/api/crop-suggest',
      },
      {
        source: '/api/health',
        destination: 'http://127.0.0.1:8000/api/health',
      },
    ];
  },
};

export default nextConfig;
