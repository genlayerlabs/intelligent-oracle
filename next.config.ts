import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/wizard",
        destination: "/assistant",
        permanent: true,
      },
      {
        source: "/wizard/:path*",
        destination: "/assistant/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          destination: "/explorer",
          has: [
            {
              type: "host",
              value: "explorer.intelligentoracle.com",
            },
          ],
        },
      ],
    };
  },
};

export default nextConfig;
