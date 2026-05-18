import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Web3Provider } from "@/components/web3-provider";
import { switzer } from "@/lib/fonts";
import "@rainbow-me/rainbowkit/styles.css";
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
    <html lang="en" className={switzer.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Web3Provider>
            <TooltipProvider>{children}</TooltipProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
