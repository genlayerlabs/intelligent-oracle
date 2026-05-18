export type CardTone = "white" | "lavender" | "pink" | "dark";

export function cardSurface(tone: CardTone): string {
  switch (tone) {
    case "white":
      return "bg-white border border-black/10 text-[#2e2e2e]";
    case "lavender":
      return "bg-[color:color-mix(in_oklab,var(--brand-lavender)_10%,transparent)] text-[#2e2e2e]";
    case "pink":
      return "bg-[color:color-mix(in_oklab,var(--brand-pink)_10%,transparent)] text-[#2e2e2e]";
    case "dark":
      return "brand-navy-bloom text-white";
  }
}
