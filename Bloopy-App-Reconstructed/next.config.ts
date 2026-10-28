import type { NextConfig } from "next";

/**
 * Baseline security headers for every route.
 *
 * Notes:
 *  - geolocation stays allowed for same-origin because the optional weather
 *    signal (lib/bloopyWeather) can use it; everything else is denied.
 *  - HSTS is a no-op over plain http (localhost) and hardens production https.
 *  - A strict Content-Security-Policy is intentionally not set here: Next.js
 *    inlines scripts/styles, so a meaningful CSP needs nonce plumbing — a
 *    broken-but-present CSP would be worse than these solid baseline headers.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
