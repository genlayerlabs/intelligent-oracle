export function shortenAddress(address?: string, maxLength = 12) {
  if (!address) return "Unknown";
  if (address.length <= maxLength) return address;

  const prefixLength = Math.max(6, Math.floor((maxLength - 1) / 2));
  const suffixLength = Math.max(4, maxLength - prefixLength - 1);
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}
