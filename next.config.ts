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
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
      // Backend-served uploads (prod)
      {
        protocol: "https",
        hostname: "api.kasakai.in",
        pathname: "/uploads/**",
      },
      { protocol: "http", hostname: "api.kasakai.in", pathname: "/uploads/**" },
      // Azure App Service backend
      {
        protocol: "https",
        hostname:
          "kasakai-backend-hta7fydfarbdf8bh.centralindia-01.azurewebsites.net",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "pub-ccd9e78e9dec4ad6a14a20eeea6cb535.r2.dev",
      },
    ],
  },
  // The player dashboard used to live under /dashboard/player/<id>. The id was
  // always the logged-in player's own — the session already knows it — so the
  // routes are now plain /dashboard/*. Notifications already stored in the DB,
  // bookmarks and old links still name the id, so they are redirected here
  // rather than 404ing. `:path*` matches zero segments too, so this one rule
  // covers the bare /dashboard/player/<id> as well as every subpage.
  async redirects() {
    return [
      {
        source: "/dashboard/player/:id/:path*",
        destination: "/dashboard/:path*",
        permanent: true,
      },
    ];
  },

  experimental: {
    optimizePackageImports: ["react", "react-dom"],
  },
};

export default nextConfig;
