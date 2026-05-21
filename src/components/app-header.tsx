"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { genLayerChain } from "@/lib/genlayer-config";
import { useOpenWalletConnection } from "@/lib/use-privy-wallet";
import { cn } from "@/lib/utils";
import { shortenAddress } from "@/lib/address";

interface AppHeaderProps {
  active: "assistant" | "explorer";
  oracleAddress?: string;
}

export function AppHeader({ active, oracleAddress }: AppHeaderProps) {
  const explorerHref = oracleAddress ? `/oracle/${oracleAddress}` : "/explorer";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-white/90 text-[#2e2e2e] backdrop-blur-xl">
      <div className="mx-auto grid min-h-20 w-[90%] max-w-[1300px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-3 sm:gap-3">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label="Intelligent Oracle home">
          <Image
            src="/brand/genlayer-mark.svg"
            alt=""
            width={30}
            height={28}
            priority
          />
          <span className="hidden truncate text-base font-medium tracking-normal text-[#2e2e2e] sm:block">
            Intelligent Oracle
          </span>
        </Link>
        <nav className="flex min-w-0 justify-self-end rounded-md border border-black/10 bg-white/70 p-1 text-sm font-medium">
          <Link
            href="/assistant"
            className={cn(
              "rounded px-2 py-1.5 transition sm:px-3",
              active === "assistant"
                ? "bg-black text-white"
                : "text-black/60 hover:text-black",
            )}
          >
            Assistant
          </Link>
          <Link
            href={explorerHref}
            className={cn(
              "rounded px-2 py-1.5 transition sm:px-3",
              active === "explorer"
                ? "bg-black text-white"
                : "text-black/60 hover:text-black",
            )}
          >
            Explorer
          </Link>
        </nav>
        <div className="flex items-center gap-1.5 justify-self-end sm:gap-2">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function WalletButton() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const openWalletConnection = useOpenWalletConnection();
  const wrongNetwork = Boolean(isConnected && address && chainId !== genLayerChain.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button type="button" variant="outline" size="sm" disabled className="w-[4.75rem] border-black/15 bg-transparent px-2 text-[#2e2e2e] sm:w-[6.75rem]">
        Wallet
      </Button>
    );
  }

  if (!isConnected || !address) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={openWalletConnection} className="border-black/15 bg-transparent px-2 text-[#2e2e2e] hover:bg-black hover:text-white sm:px-3">
        Connect
      </Button>
    );
  }

  if (wrongNetwork) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => switchChain({ chainId: genLayerChain.id })} className="border-black/15 bg-transparent px-2 text-[#2e2e2e] hover:bg-black hover:text-white sm:px-3">
        Switch
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={openWalletConnection} className="max-w-32 border-black/15 bg-transparent text-[#2e2e2e] hover:bg-black hover:text-white">
      <span className="truncate">{shortenAddress(address, 12)}</span>
    </Button>
  );
}
