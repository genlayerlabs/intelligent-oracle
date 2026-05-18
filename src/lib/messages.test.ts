import { describe, expect, it } from "vitest";
import { getMessageText, isHiddenStartMessage, normalizeStoredMessage } from "@/lib/messages";

describe("message helpers", () => {
  it("normalizes legacy content messages into UIMessage parts", () => {
    const message = normalizeStoredMessage({
      id: "legacy-1",
      role: "assistant",
      content: "Hello from the old format",
    });

    expect(message.id).toBe("legacy-1");
    expect(message.parts).toEqual([{ type: "text", text: "Hello from the old format" }]);
    expect(getMessageText(message)).toBe("Hello from the old format");
  });

  it("detects the hidden start message", () => {
    const message = normalizeStoredMessage({
      role: "user",
      content: "__start__",
    });

    expect(isHiddenStartMessage(message)).toBe(true);
  });
});
