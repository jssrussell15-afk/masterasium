import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // OpenNext on Cloudflare serves the Cache Components shell and then
  // never streams the rest of the page, so the browser stays on Loading.
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  void import("@opennextjs/cloudflare")
    .then(({ initOpenNextCloudflareForDev }) => initOpenNextCloudflareForDev())
    .catch(() => {
      console.warn(
        "Skipping the Cloudflare dev runtime. next dev still works. npm run preview needs macOS 13.5 or later.",
      );
    });
}
