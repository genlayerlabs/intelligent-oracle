export interface JsonExtraction {
  raw: string;
  parsed: unknown;
}

export function extractJsonFromText(text: string): JsonExtraction | null {
  const fenced = /```json\s*([\s\S]*?)\s*```/i.exec(text);
  const candidates = fenced ? [fenced[1]] : findBalancedJsonCandidates(text);

  for (const candidate of candidates) {
    try {
      return {
        raw: fenced ? fenced[0] : candidate,
        parsed: JSON.parse(candidate),
      };
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function findBalancedJsonCandidates(text: string) {
  const candidates: string[] = [];
  const startIndexes = [...text].map((char, index) => (char === "{" ? index : -1)).filter((index) => index >= 0);

  for (const start of startIndexes) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;

      if (depth === 0) {
        candidates.push(text.slice(start, index + 1));
        break;
      }
    }
  }

  return candidates;
}
