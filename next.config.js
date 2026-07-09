/** @type {import('next').NextConfig} */
const path = require("node:path");

const isProd =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

// Next.js (Turbopack/App Router) injects bootstrap inline scripts. A hash or
// nonce in script-src makes browsers ignore 'unsafe-inline', which blocks
// hydration — Run demo / D do nothing and Actions stay on skeletons.
// Prefer 'unsafe-inline' (+ 'unsafe-eval' in dev) until a nonce-based CSP
// covers both the theme init script and Next runtime.
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

if (isProd) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["pg"],
  // Pin workspace root so Turbopack does not infer a parent lockfile directory.
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
