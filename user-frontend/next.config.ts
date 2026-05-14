import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "media.insider.in" },
      { protocol: "https", hostname: "b.zmtcdn.com" },
      // Backend-served uploads (dev)
      { protocol: "http",  hostname: "localhost", port: "5000", pathname: "/uploads/**" },
      // Backend-served uploads (prod)
      { protocol: "https", hostname: "api.kasakai.in", pathname: "/uploads/**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["react", "react-dom"],
  },
};

export default nextConfig;
