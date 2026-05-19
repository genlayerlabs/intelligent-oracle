import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, tool } from "ai";
import { buildInitialPrompt } from "@/lib/assistant-prompt";
import {
  evaluateOracleConfig,
  oracleConfigCandidateSchema,
} from "@/lib/oracle-config";
import {
  fetchSourcesCatalog,
  formatCatalogForPrompt,
} from "@/lib/sources-catalog";
import type { OracleChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin) return {};

  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!allowed.includes(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export function OPTIONS(request: Request) {
  return new Response("OK", { headers: getCorsHeaders(request) });
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-5-mini";

  if (!apiKey) {
    return Response.json(
      { error: "OPENROUTER_API_KEY is not configured." },
      { status: 500, headers: corsHeaders },
    );
  }

  const body = (await request.json().catch(() => null)) as { messages?: OracleChatMessage[] } | null;
  if (!Array.isArray(body?.messages)) {
    return Response.json(
      { error: "Request body must include a messages array." },
      { status: 400, headers: corsHeaders },
    );
  }

  const openrouter = createOpenRouter({
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey,
  });

  const resolvedCatalog = await fetchSourcesCatalog();
  const sourcesCatalogBlock = formatCatalogForPrompt(resolvedCatalog);

  const result = streamText({
    model: openrouter.chat(model),
    system: buildInitialPrompt({ sourcesCatalogBlock }),
    messages: await convertToModelMessages(body.messages),
    tools: {
      proposeOracleConfig: tool({
        description: "Validate and present the complete oracle configuration.",
        inputSchema: oracleConfigCandidateSchema,
        execute: async (candidate) => evaluateOracleConfig(candidate),
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    headers: corsHeaders,
    onError: () => "The assistant could not complete this response.",
  });
}
