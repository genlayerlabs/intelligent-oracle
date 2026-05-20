import { generateId, type UIMessage } from "ai";

type StoredMessage = Partial<UIMessage> & {
  content?: unknown;
};

export function getMessageText(message: Pick<UIMessage, "parts"> | StoredMessage) {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  return "content" in message && typeof message.content === "string" ? message.content : "";
}

export function normalizeStoredMessage(message: unknown): UIMessage {
  if (!message || typeof message !== "object") {
    return createTextMessage("assistant", "");
  }

  const stored = message as StoredMessage;
  const role = stored.role === "user" || stored.role === "assistant" || stored.role === "system"
    ? stored.role
    : "assistant";

  if (Array.isArray(stored.parts)) {
    return {
      id: typeof stored.id === "string" ? stored.id : generateId(),
      role,
      metadata: stored.metadata,
      parts: stored.parts,
    };
  }

  return createTextMessage(
    role,
    typeof stored.content === "string" ? stored.content : "",
    typeof stored.id === "string" ? stored.id : undefined,
  );
}

export function createTextMessage(role: UIMessage["role"], text: string, id = generateId()): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
  };
}

export function isHiddenStartMessage(message: UIMessage) {
  return message.role === "user" && getMessageText(message).trim().startsWith("__start__");
}
