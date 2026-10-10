import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/standings",
        destination: "/teams#standings",
        permanent: false,
      },
      {
        source: "/matchups",
        destination: "/teams#matchups",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
