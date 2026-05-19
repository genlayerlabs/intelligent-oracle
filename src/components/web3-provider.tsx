"use client";

import { PrivyProvider, type ConnectedWallet, type EIP1193Provider } from "@privy-io/react-auth";
import { createConfig, WagmiProvider, type SetActiveWalletForWagmiType } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import type { Chain } from "viem";
import { http } from "wagmi";
import {
  genLayerChain,
  getGenLayerRpcUrl,
  getPrivyAppId,
  getPrivyClientId,
} from "@/lib/genlayer-config";
import { PRIVY_WALLET_LIST } from "@/lib/use-privy-wallet";

const walletChain = genLayerChain as Chain;

const wagmiConfig = createConfig({
  chains: [walletChain],
  transports: {
    [walletChain.id]: http(getGenLayerRpcUrl()),
  },
  ssr: true,
});

const setActiveWalletForWagmi: SetActiveWalletForWagmiType = ({ wallets, user }) => {
  const primaryAddress = user?.wallet?.address?.toLowerCase();
  const wallet = primaryAddress
    ? wallets.find((item) => item.address.toLowerCase() === primaryAddress) ?? wallets[0]
    : wallets[0];

  return wallet ? withEventedEthereumProvider(wallet) : undefined;
};

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    patchWalletProviderEvents();
    return new QueryClient();
  });
  const privyAppId = getPrivyAppId();
  const privyClientId = getPrivyClientId();

  if (!privyAppId) {
    return <PrivyConfigError />;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      clientId={privyClientId}
      config={{
        appearance: {
          accentColor: "#9733fa",
          logo: "/brand/genlayer-mark.svg",
          showWalletLoginFirst: true,
          walletChainType: "ethereum-only",
          walletList: PRIVY_WALLET_LIST,
        },
        defaultChain: walletChain,
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
        },
        loginMethods: ["wallet"],
        supportedChains: [walletChain],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig} setActiveWalletForWagmi={setActiveWalletForWagmi}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

function withEventedEthereumProvider(wallet: ConnectedWallet): ConnectedWallet {
  return new Proxy(wallet, {
    get(target, prop, receiver) {
      if (prop === "getEthereumProvider") {
        return async () => ensureProviderEvents(await target.getEthereumProvider());
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function ensureProviderEvents(provider: EIP1193Provider): EIP1193Provider {
  type ProviderWithEventAliases = EIP1193Provider & {
    addListener?: EIP1193Provider["on"];
    off?: EIP1193Provider["removeListener"];
  };

  const eventProvider = provider as ProviderWithEventAliases;
  const existingOn = eventProvider.on ?? eventProvider.addListener;
  const existingRemoveListener = eventProvider.removeListener ?? eventProvider.off;

  if (typeof eventProvider.on === "function" && typeof eventProvider.removeListener === "function") {
    return provider;
  }

  return new Proxy(provider, {
    get(target, prop, receiver) {
      if (prop === "on" || prop === "addListener") {
        return typeof existingOn === "function" ? existingOn.bind(target) : noopProviderListener;
      }

      if (prop === "removeListener" || prop === "off") {
        return typeof existingRemoveListener === "function"
          ? existingRemoveListener.bind(target)
          : noopProviderListener;
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function noopProviderListener() {}

function patchWalletProviderEvents() {
  if (typeof window === "undefined") {
    return;
  }

  const browserWindow = window as WindowWithEthereum;
  patchMutableProvider(browserWindow.ethereum);

  if (!browserWindow.__intelligentOracleWalletEventPatch) {
    browserWindow.__intelligentOracleWalletEventPatch = true;
    browserWindow.addEventListener("eip6963:announceProvider", (event) => {
      patchMutableProvider((event as Eip6963AnnounceEvent).detail?.provider);
    });
  }

  browserWindow.dispatchEvent(new Event("eip6963:requestProvider"));
}

function patchMutableProvider(provider: MutableEthereumProvider | undefined) {
  if (!provider || typeof provider !== "object") {
    return;
  }

  provider.providers?.forEach(patchMutableProvider);

  setProviderMethod(provider, "on", provider.on ?? provider.addListener ?? noopProviderListener);
  setProviderMethod(
    provider,
    "removeListener",
    provider.removeListener ?? provider.off ?? noopProviderListener,
  );
  setProviderMethod(provider, "addListener", provider.addListener ?? provider.on ?? noopProviderListener);
  setProviderMethod(provider, "off", provider.off ?? provider.removeListener ?? noopProviderListener);
}

function setProviderMethod(
  provider: MutableEthereumProvider,
  method: keyof Pick<MutableEthereumProvider, "on" | "removeListener" | "addListener" | "off">,
  value: NonNullable<MutableEthereumProvider[typeof method]>,
) {
  if (typeof provider[method] === "function") {
    return;
  }

  try {
    provider[method] = value;
  } catch {
    try {
      Object.defineProperty(provider, method, {
        configurable: true,
        value,
      });
    } catch {
      // Some injected wallets expose read-only provider objects. Leave those untouched.
    }
  }
}

type MutableEthereumProvider = Partial<
  Pick<EIP1193Provider, "request">
> & {
  addListener?: ProviderEventMethod;
  off?: ProviderEventMethod;
  on?: ProviderEventMethod;
  removeListener?: ProviderEventMethod;
  providers?: MutableEthereumProvider[];
};

type ProviderEventMethod = (eventName: string, listener: (...args: unknown[]) => void) => unknown;

type Eip6963AnnounceEvent = Event & {
  detail?: {
    provider?: MutableEthereumProvider;
  };
};

type WindowWithEthereum = Window & {
  __intelligentOracleWalletEventPatch?: boolean;
  ethereum?: MutableEthereumProvider;
};

function PrivyConfigError() {
  return (
    <div className="brand-app-shell flex min-h-screen items-center justify-center bg-[#f1f0f3] px-6 text-[#2e2e2e] dark:bg-[#0a0a14] dark:text-white">
      <div className="max-w-lg rounded-md border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
          Wallet configuration required
        </p>
        <h1 className="mt-3 text-2xl font-medium text-black dark:text-white">
          Privy app ID is missing
        </h1>
        <p className="mt-3 text-sm leading-6 text-black/65 dark:text-white/65">
          Set <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono dark:bg-white/10">NEXT_PUBLIC_PRIVY_APP_ID</code> in your environment and restart the Next.js dev server.
        </p>
      </div>
    </div>
  );
}
