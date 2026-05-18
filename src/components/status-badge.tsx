interface StatusBadgeProps {
  status?: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status || "Unknown";
  const lower = normalized.toLowerCase();
  const className = lower.includes("resolved")
    ? "border-accent-foreground/20 bg-accent text-accent-foreground"
    : lower.includes("error") || lower.includes("fail")
      ? "border-destructive/20 bg-destructive/10 text-destructive"
      : lower.includes("pending")
        ? "border-amber-500/30 bg-warning-soft text-amber-700 dark:text-amber-200"
        : "border-primary/20 bg-primary/10 text-primary";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {normalized}
    </span>
  );
}
