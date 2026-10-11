import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    // Sleeper CDN: player headshots and team logos for the header search.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sleepercdn.com",
        pathname: "/content/nfl/players/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "sleepercdn.com",
        pathname: "/images/team_logos/nfl/**",
        search: "",
      },
    ],
  },
}

export default nextConfig
