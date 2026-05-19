"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  active: "assistant" | "explorer";
  oracleAddress?: string;
}

export function AppHeader({ active, oracleAddress }: AppHeaderProps) {
  const explorerHref = oracleAddress ? `/oracle/${oracleAddress}` : "/explorer";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-white/90 text-[#2e2e2e] backdrop-blur-xl dark:border-white/10 dark:bg-[#0a0a14]/90 dark:text-white">
      <div className="mx-auto grid min-h-20 w-[90%] max-w-[1300px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-3 sm:gap-3">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label="Intelligent Oracle home">
          <Image
            src="/brand/genlayer-mark.svg"
            alt=""
            width={30}
            height={28}
            className="dark:invert"
            priority
          />
          <span className="hidden truncate text-base font-medium tracking-normal text-[#2e2e2e] dark:text-white sm:block">
            Intelligent Oracle
          </span>
        </Link>
        <nav className="flex min-w-0 justify-self-end rounded-md border border-black/10 bg-white/70 p-1 text-sm font-medium dark:border-white/10 dark:bg-white/5">
          <Link
            href="/assistant"
            className={cn(
              "rounded px-2 py-1.5 transition sm:px-3",
              active === "assistant"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-black/60 hover:text-black dark:text-white/65 dark:hover:text-white",
            )}
          >
            Assistant
          </Link>
          <Link
            href={explorerHref}
            className={cn(
              "rounded px-2 py-1.5 transition sm:px-3",
              active === "explorer"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-black/60 hover:text-black dark:text-white/65 dark:hover:text-white",
            )}
          >
            Explorer
          </Link>
        </nav>
        <div className="flex items-center gap-1.5 justify-self-end sm:gap-2">
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        if (!mounted) {
          return (
            <Button type="button" variant="outline" size="sm" disabled className="w-[4.75rem] border-black/15 bg-transparent px-2 text-[#2e2e2e] sm:w-[6.75rem] dark:border-white/20 dark:text-white">
              Wallet
            </Button>
          );
        }

        if (!account || !chain) {
          return (
            <Button type="button" variant="outline" size="sm" onClick={openConnectModal} className="border-black/15 bg-transparent px-2 text-[#2e2e2e] hover:bg-black hover:text-white sm:px-3 dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black">
              Connect
            </Button>
          );
        }

        if (chain.unsupported) {
          return (
            <Button type="button" variant="outline" size="sm" onClick={openChainModal} className="border-black/15 bg-transparent px-2 text-[#2e2e2e] hover:bg-black hover:text-white sm:px-3 dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black">
              Switch
            </Button>
          );
        }

        return (
          <Button type="button" variant="outline" size="sm" onClick={openAccountModal} className="max-w-32 border-black/15 bg-transparent text-[#2e2e2e] hover:bg-black hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black">
            <span className="truncate">{account.displayName}</span>
          </Button>
        );
      }}
    </ConnectButton.Custom>
  );
}
