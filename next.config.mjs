/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ws", "@supabase/realtime-js"],
  },
};

export default nextConfig;
