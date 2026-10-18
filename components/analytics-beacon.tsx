import Script from "next/script";

/**
 * Cloudflare Web Analytics. The beacon is omitted unless a token is passed.
 * It does not set a cookie and it is not given a name, PIN, or email.
 */
export function AnalyticsBeacon({ token }: { token: string }) {
  return (
    <Script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
