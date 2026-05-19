import { FALLBACK_SOURCES_CATALOG } from "./sources-catalog.generated";

const SOURCES_URL =
  "https://gym.genlayer.foundation/api/benchmarks/sources-bench/sources";

const LIVE_FETCH_TIMEOUT_MS = 4000;
const LIVE_CACHE_SECONDS = 3600;

export type SourceStatus = "direct" | "alt" | "blocked";

export interface CatalogSource {
  source: string;
  status: SourceStatus;
  alternative?: string;
  reason?: string;
}

export interface SourcesCatalog {
  generatedAt: string;
  count: number;
  sources: CatalogSource[];
}

export interface ResolvedCatalog {
  catalog: SourcesCatalog;
  source: "live" | "fallback";
}

const SAFE_HOST_RE = /^[a-zA-Z0-9._\-/]{1,200}$/;

export function sanitizeCatalog(raw: SourcesCatalog): SourcesCatalog {
  const sources = raw.sources.filter((s) => {
    if (typeof s?.source !== "string" || !SAFE_HOST_RE.test(s.source)) return false;
    if (s.alternative !== undefined && !SAFE_HOST_RE.test(s.alternative)) return false;
    return s.status === "direct" || s.status === "alt" || s.status === "blocked";
  });
  return { ...raw, sources, count: sources.length };
}

export async function fetchSourcesCatalog(): Promise<ResolvedCatalog> {
  try {
    const res = await fetch(SOURCES_URL, {
      next: { revalidate: LIVE_CACHE_SECONDS },
      signal: AbortSignal.timeout(LIVE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as SourcesCatalog;
    if (!Array.isArray(data?.sources)) throw new Error("malformed catalog");
    return { catalog: sanitizeCatalog(data), source: "live" };
  } catch {
    return { catalog: FALLBACK_SOURCES_CATALOG, source: "fallback" };
  }
}

export function formatCatalogForPrompt(resolved: ResolvedCatalog): string {
  const { catalog, source } = resolved;
  const direct: string[] = [];
  const alt: string[] = [];
  const blocked: string[] = [];

  for (const s of catalog.sources) {
    if (s.status === "direct") direct.push(s.source);
    else if (s.status === "alt" && s.alternative)
      alt.push(`${s.source} → ${s.alternative}`);
    else if (s.status === "blocked") blocked.push(s.source);
  }
  direct.sort();
  alt.sort();
  blocked.sort();

  const header =
    source === "live"
      ? `Live web-access catalog (fetched from gym.genlayer.foundation, generated ${catalog.generatedAt}, ${catalog.count} hosts).`
      : `Web-access catalog (snapshot, generated ${catalog.generatedAt}, ${catalog.count} hosts — live fetch unavailable, using build-time copy).`;

  return [
    `${header} This catalog is the authoritative ground-truth for whether the resolution engine can actually reach a host. If it conflicts with the topic guidance above, the catalog wins.`,
    "",
    `REACHABLE — validators can fetch these directly (${direct.length}):`,
    direct.join(", "),
    "",
    `REROUTE — host is blocked, but the listed alternative works. If the user names the left side, draft with the right side and explain the swap in your chat reply (${alt.length}):`,
    alt.join("; "),
    "",
    `BLOCKED — no reachable path is known. Never draft against these; if the user names one, say so and propose a substitute from REACHABLE (${blocked.length}):`,
    blocked.join(", "),
  ].join("\n");
}
