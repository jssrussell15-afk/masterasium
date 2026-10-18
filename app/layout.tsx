import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { TestModeBanner } from "@/components/test-mode-banner";
import { testModeEnabled } from "@/lib/site/app-env";
import { analyticsToken, isWorkersDevHost } from "@/lib/site/hosts";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  const workers = isWorkersDevHost(host);
  return {
    metadataBase: new URL("https://masterasium.com"),
    title: "Masterasium",
    description:
      "Calm, self-paced math that follows your province's curriculum. Practice is free while we test.",
    robots: workers ? { index: false, follow: false } : { index: true, follow: true },
    alternates: workers ? { canonical: "https://masterasium.com" } : undefined,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const token = analyticsToken(process.env.NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN);
  const testMode = await testModeEnabled();
  return (
    <html lang="en" className={`${sourceSans.variable} ${fraunces.variable} min-h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {testMode ? <TestModeBanner /> : null}
        {children}
        {token ? <AnalyticsBeacon token={token} /> : null}
      </body>
    </html>
  );
}
