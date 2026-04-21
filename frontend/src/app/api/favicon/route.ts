import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="g" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2563EB"/>
      <stop offset="1" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="52" height="52" rx="12" fill="url(#g)"/>
  <path d="M21 44V20h3.2l15 18.6V20H43v24h-3.1L24.8 25.2V44H21Z" fill="white"/>
  <circle cx="47" cy="17" r="4" fill="white" fill-opacity="0.32"/>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
