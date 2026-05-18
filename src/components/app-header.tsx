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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Intelligent Oracle home">
          <Image
            src="/brand/genlayer-mark.svg"
            alt=""
            width={26}
            height={24}
            className="dark:invert"
            priority
          />
          <span className="text-base font-semibold tracking-tight text-foreground">
            Intelligent Oracle
          </span>
        </Link>
        <nav className="flex min-w-0 justify-self-end rounded-md border border-border bg-card p-1 text-sm shadow-sm">
          <Link
            href="/assistant"
            className={cn(
              "rounded px-2 py-1.5 transition sm:px-3",
              active === "assistant"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Assistant
          </Link>
          <Link
            href={explorerHref}
            className={cn(
              "rounded px-2 py-1.5 transition sm:px-3",
              active === "explorer"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Explorer
          </Link>
          <Link
            href="/docs"
            className="rounded px-2 py-1.5 text-muted-foreground transition hover:text-foreground sm:px-3"
          >
            Docs
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
            <Button type="button" variant="outline" size="sm" disabled className="w-[4.75rem] px-2 sm:w-[6.75rem]">
              Wallet
            </Button>
          );
        }

        if (!account || !chain) {
          return (
            <Button type="button" variant="outline" size="sm" onClick={openConnectModal} className="px-2 sm:px-3">
              Connect
            </Button>
          );
        }

        if (chain.unsupported) {
          return (
            <Button type="button" variant="outline" size="sm" onClick={openChainModal} className="px-2 sm:px-3">
              Switch
            </Button>
          );
        }

        return (
          <Button type="button" variant="outline" size="sm" onClick={openAccountModal} className="max-w-32">
            <span className="truncate">{account.displayName}</span>
          </Button>
        );
      }}
    </ConnectButton.Custom>
  );
}
