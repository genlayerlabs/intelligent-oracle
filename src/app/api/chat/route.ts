import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, tool } from "ai";
import { buildInitialPrompt } from "@/lib/assistant-prompt";
import {
  evaluateOracleConfig,
  oracleConfigCandidateSchema,
} from "@/lib/oracle-config";
import type { OracleChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(request: Request) {
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

  const result = streamText({
    model: openrouter.chat(model),
    system: buildInitialPrompt(),
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
