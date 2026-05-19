"use client";

import { useConnectWallet, type WalletListEntry } from "@privy-io/react-auth";
import { useCallback } from "react";

export const PRIVY_WALLET_LIST: WalletListEntry[] = [
  "metamask",
  "rainbow",
  "detected_ethereum_wallets",
  "wallet_connect_qr",
];

export function useOpenWalletConnection(description = "Connect your wallet to sign oracle transactions.") {
  const { connectWallet } = useConnectWallet();

  return useCallback(() => {
    connectWallet({
      description,
      walletChainType: "ethereum-only",
      walletList: PRIVY_WALLET_LIST,
    });
  }, [connectWallet, description]);
}
