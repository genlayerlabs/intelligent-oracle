<script setup lang="ts">
import { useRuntimeConfig } from "#app";
import { Chat } from "@ai-sdk/vue";
import { DefaultChatTransport, generateId, type UIMessage } from "ai";
import { computed, ref, onMounted, nextTick, watch } from "vue";
import confetti from "canvas-confetti";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-json";
import AppHeader from "~/components/AppHeader.vue";

const highlightJson = (code: string) => {
  return Prism.highlight(code, Prism.languages.json, "json");
};

enum DEPLOYMENT_STATUS {
  NONE = "NONE",
  DEPLOYING = "DEPLOYING",
  DEPLOYED = "DEPLOYED",
  FAILED = "FAILED",
}

const getDeployButtonTextFromStatus = (status: DEPLOYMENT_STATUS) => {
  if (status === DEPLOYMENT_STATUS.DEPLOYING) return "Deploying...";
  if (status === DEPLOYMENT_STATUS.DEPLOYED) return "Deployed";
  if (status === DEPLOYMENT_STATUS.FAILED) return "Deployment Failed";
  return "Deploy";
};

const config = useRuntimeConfig();
const chatInitiated = ref(false);
const configCopied = ref(false);
const deployedOracleAddress = ref("");
const icDeploymentStatus = ref(DEPLOYMENT_STATUS.NONE);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const messagesContainer = ref<HTMLDivElement | null>(null);
const inputText = ref("");

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Storage helpers
type StoredUIMessage = UIMessage & { content?: string };

const normalizeStoredMessage = (message: StoredUIMessage): UIMessage => {
  if (message.parts?.length || typeof message.content !== "string") {
    return message;
  }

  const { content, ...rest } = message;
  return {
    ...rest,
    parts: [{ type: "text", text: content }],
  } as UIMessage;
};

const getStoredMessages = (): UIMessage[] => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("io-wizard.conversation");
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizeStoredMessage) : [];
  } catch {
    localStorage.removeItem("io-wizard.conversation");
    return [];
  }
};

const getStoredChatId = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("io-wizard.chatId");
};

const saveToStorage = (messages: UIMessage[], id: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("io-wizard.conversation", JSON.stringify(messages));
  localStorage.setItem("io-wizard.chatId", id);
};

const chatId = ref<string>(getStoredChatId() || generateId());

// AI SDK v6: useChat is gone. Use the Chat class with a transport.
const chat = new Chat<UIMessage>({
  id: chatId.value,
  transport: new DefaultChatTransport({
    api: config.public.chatApiUrl as string,
  }),
  messages: getStoredMessages(),
  onFinish: () => {
    saveToStorage(chat.messages, chatId.value);
    setTimeout(() => {
      inputRef.value?.focus();
      scrollToBottom();
    }, 0);
  },
  onError: (error) => {
    console.error("Chat error:", error);
  },
});

// Vue reactivity: chat.messages and chat.status are reactive on the instance.
const messages = computed<UIMessage[]>(() => chat.messages);
const status = computed(() => chat.status);
const error = computed(() => chat.error);
const isLoading = computed(() => status.value === "submitted" || status.value === "streaming");
const disabled = computed(() => isLoading.value || error.value != null);

// Helper to read text content from a UI message's parts array
const messageText = (m: UIMessage): string =>
  (m.parts ?? [])
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.text ?? "")
    .join("");

watch(messages, () => {
  nextTick(scrollToBottom);
}, { deep: true });

const autoResize = (e: Event) => {
  const textarea = e.target as HTMLTextAreaElement;
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage(e);
  }
};

const sendMessage = (e: Event) => {
  e.preventDefault();
  const text = inputText.value.trim();
  if (!text) return;
  icDeploymentStatus.value = DEPLOYMENT_STATUS.NONE;
  void chat.sendMessage({ text });
  inputText.value = "";
  if (inputRef.value) {
    inputRef.value.style.height = "auto";
  }
};

const startChat = () => {
  void chat.sendMessage({ text: "__start__" });
};

onMounted(() => {
  if (!chat.messages.length) {
    setTimeout(() => startChat(), 1000);
  }
  chatInitiated.value = true;
  setTimeout(() => {
    inputRef.value?.focus();
    scrollToBottom();
  }, 0);
});

const copyToClipboard = (text: string) => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      configCopied.value = true;
      setTimeout(() => {
        configCopied.value = false;
      }, 1500);
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
};

const deployIntelligentContract = async (jsonContent: string) => {
  try {
    icDeploymentStatus.value = DEPLOYMENT_STATUS.DEPLOYING;
    const response = await fetch(`${config.public.bridgeApiUrl}/deploy-intelligent-oracle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonContent,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === "error") {
      throw new Error(`Deployment failed: ${result.message}`);
    }

    const oracleAddress = result.oracleAddress as string | undefined;
    if (!oracleAddress) {
      throw new Error("Deployment response did not include an oracle address.");
    }

    deployedOracleAddress.value = oracleAddress;
    console.log("Deployment successful:", result);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    icDeploymentStatus.value = DEPLOYMENT_STATUS.DEPLOYED;
  } catch (error) {
    console.error("Error deploying Intelligent Contract:", error);
    icDeploymentStatus.value = DEPLOYMENT_STATUS.FAILED;
  }
};

const formatMessage = (content: string) => {
  const jsonRegex = /```json\n([\s\S]*?)(?:```|$)/g;
  const match = jsonRegex.exec(content);

  if (!match) {
    return {
      formattedContent: { beforeJson: content, afterJson: "" },
    };
  }

  try {
    const [beforeJson, ...afterJsonParts] = content.split(jsonRegex);
    const afterJson = afterJsonParts.slice(1).join("").trim();

    const formattedContent = {
      beforeJson: beforeJson.trim(),
      afterJson: afterJson ? `\n${afterJson}` : "",
    };

    const parsedJson = JSON.parse(match[1]);
    const formattedJson = JSON.stringify(parsedJson, null, 2);
    const highlightedJson = highlightJson(formattedJson);

    return { formattedContent, jsonContent: parsedJson, highlightedJson };
  } catch {
    const formattedContent = {
      beforeJson: content.replace(
        jsonRegex,
        `<pre><code class="language-json">Generating JSON...</code></pre>`
      ),
      afterJson: "",
    };
    return { formattedContent };
  }
};

const lastJsonMessageId = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (formatMessage(messageText(messages.value[i])).jsonContent) {
      return messages.value[i].id;
    }
  }
  return null;
});

const resetConversation = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("io-wizard.conversation");
    localStorage.removeItem("io-wizard.chatId");
  }
  chat.messages = [];
  chatId.value = generateId();
  deployedOracleAddress.value = "";
  icDeploymentStatus.value = DEPLOYMENT_STATUS.NONE;
  startChat();
};

const stop = () => {
  void chat.stop();
};

const retry = () => {
  void chat.regenerate();
};
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppHeader :explorer-url="config.public.explorerUrl" :oracle-address="deployedOracleAddress" />

    <div class="max-w-3xl mx-auto px-4 pt-24 flex justify-end">
      <button
        @click="resetConversation"
        class="px-4 py-2 bg-highlight text-white rounded hover:bg-opacity-90 transition-colors flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clip-rule="evenodd"
          />
        </svg>
        Create New Oracle
      </button>
    </div>

    <div
      ref="messagesContainer"
      class="flex flex-col w-full max-w-3xl h-[calc(100vh-12rem)] mx-auto stretch text-primary-text font-sans overflow-y-auto px-4 pt-4"
    >
      <div class="pt-8 pb-24">
        <div v-for="m in messages.slice(1)" :key="m.id" class="whitespace-pre-wrap mb-4">
          <span class="font-bold" :class="{ 'text-highlight': m.role !== 'user' }">{{
            m.role === "user" ? "You: " : "Intelligent Oracle Assistant: "
          }}</span>
          <span v-html="formatMessage(messageText(m)).formattedContent.beforeJson"></span>
          <div v-if="formatMessage(messageText(m)).jsonContent" class="json-viewer-wrapper">
            <pre><code class="language-json" v-html="formatMessage(messageText(m)).highlightedJson"></code></pre>
          </div>
          <span v-html="formatMessage(messageText(m)).formattedContent.afterJson"></span>
          <div v-if="m.id === lastJsonMessageId" class="flex flex-col gap-2 mt-4">
            <div class="flex gap-2">
              <button
                @click="copyToClipboard(JSON.stringify(formatMessage(messageText(m)).jsonContent, null, 2))"
                class="px-4 py-2 border border-highlight rounded hover:bg-highlight hover:text-white transition-colors text-highlight"
              >
                {{ configCopied ? "Copied!" : "Copy to Clipboard" }}
              </button>
              <button
                @click="deployIntelligentContract(JSON.stringify(formatMessage(messageText(m)).jsonContent))"
                :disabled="
                  icDeploymentStatus === DEPLOYMENT_STATUS.DEPLOYING ||
                  icDeploymentStatus === DEPLOYMENT_STATUS.DEPLOYED
                "
                class="px-4 py-2 bg-highlight text-white rounded hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ getDeployButtonTextFromStatus(icDeploymentStatus) }}
              </button>
            </div>

            <div v-if="deployedOracleAddress" class="mt-4 p-6 bg-green-100 rounded border border-green-800">
              <p class="text-green-800 text-lg mb-4">
                Your Intelligent Oracle has been successfully deployed at:
                <span class="font-mono font-medium block mt-2">{{ deployedOracleAddress }}</span>
              </p>
              <a
                :href="`${config.public.explorerUrl}/oracle/${deployedOracleAddress}`"
                target="_blank"
                class="inline-flex items-center px-4 py-2 bg-highlight text-white rounded hover:bg-opacity-90 transition-colors"
              >
                View in the explorer
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 ml-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="mt-4 text-secondary-text">
          <div>Loading...</div>
          <button
            type="button"
            class="px-4 py-2 mt-4 text-highlight border border-highlight rounded hover:bg-highlight hover:text-white transition-colors"
            @click="stop"
          >
            Stop
          </button>
        </div>

        <div v-if="error" class="mt-4">
          <div class="text-accent">An error occurred.</div>
          <button
            type="button"
            class="px-4 py-2 mt-4 text-highlight border border-highlight rounded hover:bg-highlight hover:text-white transition-colors"
            @click="retry"
          >
            Retry
          </button>
        </div>

        <div class="mt-8">
          <form
            @submit="sendMessage"
            class="fixed bottom-0 left-1/2 -translate-x-1/2 flex gap-2 w-full max-w-3xl px-4 mb-8"
          >
            <textarea
              ref="inputRef"
              class="flex-1 p-4 border border-highlight rounded shadow-xl bg-background text-primary-text placeholder-secondary-text resize-none overflow-hidden"
              v-model="inputText"
              placeholder="Say something..."
              :disabled="disabled"
              @keydown.enter="handleKeyDown"
              @input="autoResize"
            ></textarea>
            <button
              type="submit"
              :disabled="disabled"
              class="px-4 py-2 bg-highlight text-white rounded hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-fit"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
pre {
  background-color: #2a2a2a;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
  color: #e0e0e0;
  border: 1px solid #444;
}

code {
  font-family: "Courier New", Courier, monospace;
  color: #e0e0e0;
}

@media (prefers-color-scheme: light) {
  pre {
    background-color: #f0f0f0;
    color: #333;
    border: 1px solid #ccc;
  }

  code {
    color: #333;
  }
}

.msg-btn,
.copy-btn,
.deploy-btn {
  all: unset;
}

.json-viewer-wrapper pre {
  margin: 0;
  background-color: #1e1e1e;
  border-radius: 0.25rem;
  padding: 1rem;
  overflow-x: auto;
}

.json-viewer-wrapper code {
  font-family: "Fira Code", monospace;
  font-size: 0.9em;
  max-width: 100%;
  display: inline-block;
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-all;
}

@media (prefers-color-scheme: light) {
  .json-viewer-wrapper pre {
    background-color: #f5f5f5;
  }
}

.overflow-y-auto {
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.overflow-y-auto::-webkit-scrollbar {
  display: none;
}

textarea {
  min-height: 44px;
  max-height: 200px;
  line-height: 1.5;
}
</style>
