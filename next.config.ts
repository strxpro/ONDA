import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  devIndicators: false, // no dev badge in screenshots / the recorded presentation
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // placeholder gallery photos until the owner uploads real ones
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
    ],
  },
  experimental: {
    optimizePackageImports: ["gsap", "motion", "@phosphor-icons/react"],
  },
};

export default withNextIntl(nextConfig);
