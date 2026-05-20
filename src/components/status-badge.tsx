interface StatusBadgeProps {
  status?: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status || "Unknown";
  const lower = normalized.toLowerCase();
  const className = lower.includes("resolved")
    ? "border-[color:var(--brand-lavender)]/30 bg-[color:color-mix(in_oklab,var(--brand-lavender)_12%,transparent)] text-[color:var(--brand-lavender)]"
    : lower.includes("error") || lower.includes("fail")
      ? "border-destructive/20 bg-destructive/10 text-destructive"
      : lower.includes("pending")
        ? "border-amber-500/30 bg-warning-soft text-amber-700 dark:text-amber-200"
        : "border-[color:var(--brand-blue)]/20 bg-[color:color-mix(in_oklab,var(--brand-blue)_8%,transparent)] text-[color:var(--brand-blue)] dark:text-white";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {normalized}
    </span>
  );
}
