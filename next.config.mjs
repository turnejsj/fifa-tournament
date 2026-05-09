import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
let supabaseHostname = "localhost"
try {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (u) supabaseHostname = new URL(u).hostname
} catch {
  /* ignore */
}

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
}

export default nextConfig
