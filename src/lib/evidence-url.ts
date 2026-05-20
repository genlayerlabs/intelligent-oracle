const URL_SCHEME = /^[a-z][a-z\d+\-.]*:\/\//i;

export type EvidenceUrlResult =
  | { success: true; url: string; hostname: string }
  | { success: false; error: string };

export function normalizeSourceDomain(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const candidate = URL_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(candidate).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return trimmed
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim();
  }
}

export function normalizeEvidenceUrl(value: string): EvidenceUrlResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { success: false, error: "Provide an evidence URL." };
  }

  const candidate = URL_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { success: false, error: "Use a valid evidence URL, for example https://apps.apple.com/us/charts/iphone." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { success: false, error: "Evidence URL must start with https:// or http://." };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!hostname) {
    return { success: false, error: "Evidence URL must include a domain." };
  }

  return { success: true, url: parsed.toString(), hostname };
}

export function normalizeEvidenceUrlForDomains(
  value: string,
  allowedDomains: string[],
): EvidenceUrlResult {
  const normalized = normalizeEvidenceUrl(value);
  if (!normalized.success) return normalized;

  const domains = allowedDomains.map(normalizeSourceDomain).filter(Boolean);
  if (domains.length > 0 && !domains.includes(normalized.hostname)) {
    return {
      success: false,
      error: `Evidence URL must use one of the configured domains: ${domains.join(", ")}.`,
    };
  }

  return normalized;
}
