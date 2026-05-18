"use client";

import {
  darkTheme,
  getDefaultConfig,
  lightTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useState } from "react";
import type { Chain } from "viem";
import { http, WagmiProvider } from "wagmi";
import {
  genLayerChain,
  getGenLayerRpcUrl,
  getWalletConnectProjectId,
} from "@/lib/genlayer-config";

const walletChain = genLayerChain as Chain;

const wagmiConfig = getDefaultConfig({
  appName: "Intelligent Oracle",
  projectId: getWalletConnectProjectId(),
  chains: [walletChain],
  transports: {
    [walletChain.id]: http(getGenLayerRpcUrl()),
  },
  ssr: true,
});

const rainbowLight = lightTheme({
  accentColor: "#282b5d",
  accentColorForeground: "#ffffff",
  borderRadius: "medium",
});

const rainbowDark = darkTheme({
  accentColor: "#9b6af6",
  accentColorForeground: "#0a0a14",
  borderRadius: "medium",
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const { resolvedTheme } = useTheme();
  const rainbowTheme = resolvedTheme === "dark" ? rainbowDark : rainbowLight;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact" theme={rainbowTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
