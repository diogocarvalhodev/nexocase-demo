/** @type {import('next').NextConfig} */
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:8000';
const SHOWCASE_MODE = process.env.NEXT_PUBLIC_SHOWCASE_MODE === 'true';
// standalone output is required for Docker; Vercel manages its own output
const IS_VERCEL = !!process.env.VERCEL;

const nextConfig = {
  ...(IS_VERCEL ? {} : { output: 'standalone' }),
  async rewrites() {
    if (SHOWCASE_MODE) {
      return [];
    }

    return [
      {
        source: '/backend/:path*',
        destination: `${INTERNAL_API_URL}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
