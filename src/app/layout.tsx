import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { switzer } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenLayer Intelligent Oracle — trustless resolution from the live web",
  description:
    "Design prediction-market oracles in plain English. Validators read live web sources and reach consensus via equivalence principle — without trusting a single API.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={switzer.variable}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
