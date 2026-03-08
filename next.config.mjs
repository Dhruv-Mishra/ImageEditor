/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
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
  // Expose env vars to server-side API routes
  serverRuntimeConfig: {
    NVIDIA_VISION_API_KEY: process.env.NVIDIA_VISION_API_KEY,
    NVIDIA_EMBED_API_KEY: process.env.NVIDIA_EMBED_API_KEY,
  },
};

export default nextConfig;
