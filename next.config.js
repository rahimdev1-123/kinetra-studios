/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",

  // Keep this TRUE while you're still developing.
  // Change to false before deploying once all TypeScript errors are fixed.
  typescript: {
    ignoreBuildErrors: true,
  },

  // Enable React checks during development.
  reactStrictMode: true,

  // Hide the X-Powered-By header.
  poweredByHeader: false,

  async headers() {
    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), browsing-topics=()",
      },
      {
        key: "X-DNS-Prefetch-Control",
        value: "off",
      },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin",
      },
      {
        key: "Cross-Origin-Resource-Policy",
        value: "same-origin",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;