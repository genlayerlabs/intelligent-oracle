import { shortenAddress } from "@/lib/address";

interface AddressTextProps {
  address?: string;
  maxLength?: number;
  showFull?: boolean;
  className?: string;
}

export function AddressText({ address, maxLength = 12, showFull = false, className }: AddressTextProps) {
  return (
    <span title={address} className={className}>
      {showFull ? address : shortenAddress(address, maxLength)}
    </span>
  );
}
