import { Web3Provider } from "@/components/web3-provider";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Web3Provider>{children}</Web3Provider>;
}
