"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, generateId } from "ai";
import confetti from "canvas-confetti";
import {
  AlertCircle,
  ArrowRight,
  Braces,
  CalendarDays,
  Check,
  Clipboard,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Globe2,
  Link2,
  ListChecks,
  Plus,
  RefreshCcw,
  Rocket,
  Sparkles,
  Split,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { AppHeader } from "@/components/app-header";
import { BrandMark } from "@/components/brand/brand-mark";
import { WaveDecoration } from "@/components/brand/wave-decoration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  getMessageText,
  isHiddenStartMessage,
  normalizeStoredMessage,
} from "@/lib/messages";
import {
  formatValidationError,
  oracleConfigToJson,
  parseOracleConfig,
  parseOracleDraft,
} from "@/lib/oracle-config";
import { cn } from "@/lib/utils";
import { useGenLayer } from "@/lib/use-genlayer";
import { useOpenWalletConnection } from "@/lib/use-privy-wallet";
import type {
  OracleChatMessage,
  OracleConfig,
  OracleConfigCandidate,
  ProposeOracleConfigOutput,
} from "@/lib/types";

const CONVERSATION_STORAGE_KEY = "io-wizard.conversation";
const CHAT_ID_STORAGE_KEY = "io-wizard.chatId";

const STARTER_EXAMPLES: { title: string; hint: string; prompt: string }[] = [
  {
    title: "Weather",
    hint: "Will it snow in New York this coming Christmas Day?",
    prompt: "Will it snow in New York this coming Christmas Day?",
  },
  {
    title: "Soccer",
    hint: "Will Spain win the next FIFA World Cup?",
    prompt: "Will Spain win the next FIFA World Cup?",
  },
  {
    title: "App Store",
    hint: "Will ChatGPT be the #1 free iPhone app at the end of next month?",
    prompt: "Will ChatGPT be the #1 free iPhone app at the end of next month?",
  },
];

const VALID_REFINEMENT_CHIPS = [
  "Tighten the resolution rule",
  "Add another source domain",
  "Push the resolution date back a week",
];

const MARKDOWN_CLASS_NAME = [
  "max-w-none text-[0.94rem] leading-6 text-foreground",
  "[&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-4",
  "[&_a:hover]:decoration-foreground",
  "[&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-semibold",
  "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold",
  "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-foreground",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-3",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left",
].join(" ");

enum CreationStatus {
  None = "NONE",
  Creating = "CREATING",
  Created = "CREATED",
  Failed = "FAILED",
}

type DraftPanelStatus =
  | "empty"
  | "drafting"
  | "needs_changes"
  | "ready"
  | "creating"
  | "created"
  | "failed";

type SourceMode = "domains" | "urls";

interface ChatSession {
  id: string;
  messages: OracleChatMessage[];
}

interface LatestDraft {
  messageId: string;
  output: ProposeOracleConfigOutput;
}

interface FieldErrors {
  title?: string;
  description?: string;
  potentialOutcomes?: string;
  rules?: string;
  sources?: string;
  earliestResolutionDate?: string;
}

function loadSession(): ChatSession {
  let messages: OracleChatMessage[] = [];
  const storedId = window.localStorage.getItem(CHAT_ID_STORAGE_KEY);
  const storedConversation = window.localStorage.getItem(CONVERSATION_STORAGE_KEY);

  if (storedConversation) {
    try {
      const parsed = JSON.parse(storedConversation) as unknown;
      messages = Array.isArray(parsed)
        ? parsed.map((message) => normalizeStoredMessage(message) as OracleChatMessage)
        : [];
    } catch {
      window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    }
  }

  return {
    id: storedId || generateId(),
    messages,
  };
}

function saveSession(messages: OracleChatMessage[], id: string) {
  window.localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(messages));
  window.localStorage.setItem(CHAT_ID_STORAGE_KEY, id);
}

function clearSession() {
  window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
  window.localStorage.removeItem(CHAT_ID_STORAGE_KEY);
}

function sessionFromConfig(config: OracleConfig): ChatSession {
  const message = {
    id: generateId(),
    role: "assistant" as const,
    parts: [
      {
        type: "tool-proposeOracleConfig" as const,
        toolCallId: generateId(),
        state: "output-available" as const,
        input: {},
        output: { status: "valid" as const, config, issues: [] },
      },
    ],
  };
  return {
    id: generateId(),
    messages: [message as unknown as OracleChatMessage],
  };
}

function getCreateButtonText(status: CreationStatus, walletConnected: boolean) {
  if (!walletConnected) return "Connect wallet";
  if (status === CreationStatus.Creating) return "Creating";
  if (status === CreationStatus.Created) return "Created";
  if (status === CreationStatus.Failed) return "Retry";
  return "Create oracle";
}

function findLatestDraft(messages: OracleChatMessage[]): LatestDraft | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = message.parts[partIndex];
      if (
        part.type === "tool-proposeOracleConfig" &&
        part.state === "output-available" &&
        part.output
      ) {
        return {
          messageId: message.id,
          output: part.output,
        };
      }
    }
  }
  return null;
}

function findStreamingInput(messages: OracleChatMessage[]): OracleConfigCandidate | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = message.parts[partIndex];
      if (
        part.type === "tool-proposeOracleConfig" &&
        (part.state === "input-streaming" || part.state === "input-available") &&
        part.input &&
        typeof part.input === "object"
      ) {
        return part.input as OracleConfigCandidate;
      }
    }
  }
  return null;
}

function candidateFromConfig(config: OracleConfig): OracleConfigCandidate {
  return {
    predictionMarketId: config.predictionMarketId,
    title: config.title,
    description: config.description,
    potentialOutcomes: config.potentialOutcomes,
    rules: config.rules,
    dataSourceDomains: config.dataSourceDomains,
    resolutionURLs: config.resolutionURLs,
    earliestResolutionDate: config.earliestResolutionDate,
  };
}

function getDraftPanelStatus({
  creationStatus,
  isGenerating,
  hasVisibleErrors,
  isValid,
}: {
  creationStatus: CreationStatus;
  isGenerating: boolean;
  hasVisibleErrors: boolean;
  isValid: boolean;
}): DraftPanelStatus {
  if (creationStatus === CreationStatus.Creating) return "creating";
  if (creationStatus === CreationStatus.Created) return "created";
  if (creationStatus === CreationStatus.Failed) return "failed";
  if (isGenerating) return "drafting";
  if (isValid) return "ready";
  if (hasVisibleErrors) return "needs_changes";
  return "empty";
}

function getRepairSuggestions(issues: string[]) {
  const issueText = issues.join(" ").toLowerCase();
  if (issueText.includes("exactly two") || issueText.includes("outcome")) {
    return [
      "Make this a Yes/No market with exactly two outcomes.",
      "Rewrite the market as one binary question.",
      "Keep only the two final settlement outcomes.",
    ];
  }
  if (issueText.includes("source") || issueText.includes("url") || issueText.includes("domain")) {
    return [
      "Use data source domains only.",
      "Use fixed resolution URLs only.",
      "Add one reliable public source for resolution.",
    ];
  }
  if (issueText.includes("date")) {
    return [
      "Set the earliest resolution date to the day after the event.",
      "Use a YYYY-MM-DD resolution date.",
      "Move the resolution date after the expected result.",
    ];
  }
  return [
    "Fix the missing draft details.",
    "Make the rules more specific.",
    "Review the market and produce a valid draft.",
  ];
}

function mapValidationToFields(issues: readonly { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const top = typeof issue.path[0] === "symbol" ? undefined : issue.path[0];
    if (top === "title" && !errors.title) errors.title = issue.message;
    else if (top === "description" && !errors.description) errors.description = issue.message;
    else if (top === "potentialOutcomes" && !errors.potentialOutcomes) errors.potentialOutcomes = issue.message;
    else if (top === "rules" && !errors.rules) errors.rules = issue.message;
    else if ((top === "dataSourceDomains" || top === "resolutionURLs") && !errors.sources) errors.sources = issue.message;
    else if (top === "earliestResolutionDate" && !errors.earliestResolutionDate) errors.earliestResolutionDate = issue.message;
  }
  return errors;
}

type DraftFieldKey =
  | "title"
  | "description"
  | "potentialOutcomes"
  | "rules"
  | "dataSourceDomains"
  | "resolutionURLs"
  | "earliestResolutionDate";

const DRAFT_FIELD_KEYS: readonly DraftFieldKey[] = [
  "title",
  "description",
  "potentialOutcomes",
  "rules",
  "dataSourceDomains",
  "resolutionURLs",
  "earliestResolutionDate",
];

function aiAttemptedFieldKeys(candidate: OracleConfigCandidate | null): Set<DraftFieldKey> {
  const set = new Set<DraftFieldKey>();
  if (!candidate) return set;
  for (const key of DRAFT_FIELD_KEYS) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim().length > 0) set.add(key);
    else if (Array.isArray(value) && value.length > 0) set.add(key);
  }
  return set;
}

function mergeFieldErrors(primary: FieldErrors, fallback: FieldErrors): FieldErrors {
  return {
    title: primary.title ?? fallback.title,
    description: primary.description ?? fallback.description,
    potentialOutcomes: primary.potentialOutcomes ?? fallback.potentialOutcomes,
    rules: primary.rules ?? fallback.rules,
    sources: primary.sources ?? fallback.sources,
    earliestResolutionDate: primary.earliestResolutionDate ?? fallback.earliestResolutionDate,
  };
}

function filterFieldErrors(errors: FieldErrors, visible: Set<DraftFieldKey>): FieldErrors {
  const sourcesVisible = visible.has("dataSourceDomains") || visible.has("resolutionURLs");
  return {
    title: visible.has("title") ? errors.title : undefined,
    description: visible.has("description") ? errors.description : undefined,
    potentialOutcomes: visible.has("potentialOutcomes") ? errors.potentialOutcomes : undefined,
    rules: visible.has("rules") ? errors.rules : undefined,
    sources: sourcesVisible ? errors.sources : undefined,
    earliestResolutionDate: visible.has("earliestResolutionDate") ? errors.earliestResolutionDate : undefined,
  };
}

function countFilledFields(draft: OracleConfigCandidate): number {
  let n = 0;
  if (draft.title?.trim()) n += 1;
  if (draft.description?.trim()) n += 1;
  if ((draft.potentialOutcomes ?? []).filter((value) => value.trim()).length === 2) n += 1;
  if ((draft.rules ?? []).filter((value) => value.trim()).length >= 1) n += 1;
  if (
    (draft.dataSourceDomains ?? []).filter((value) => value.trim()).length > 0 ||
    (draft.resolutionURLs ?? []).filter((value) => value.trim()).length > 0
  ) {
    n += 1;
  }
  if (draft.earliestResolutionDate?.trim()) n += 1;
  return n;
}

function diffFieldCount(a: OracleConfigCandidate, b: OracleConfigCandidate): number {
  let n = 0;
  for (const key of DRAFT_FIELD_KEYS) {
    if (JSON.stringify(a[key] ?? null) !== JSON.stringify(b[key] ?? null)) n += 1;
  }
  return n;
}

const TOTAL_DRAFT_FIELDS = 6;

// WizardChat draft state machine:
//   editedDraft (OracleConfigCandidate | null)
//     null    => no AI draft has been applied yet (pre-first-draft, or just reset)
//     value   => the panel renders this; either auto-applied from AI or user-edited
//   userHasEdited (boolean)
//     true    => updateDraftField has fired since the last apply; new AI drafts
//                queue as pending banner instead of overwriting
//     false   => new AI drafts auto-apply silently (initial draft + refinements
//                the user hasn't touched yet)
//   pendingDraftMessageId (string | null)
//     non-null => the banner ("New AI draft ready — N changes") is showing
//   lastAppliedDraftIdRef
//     tracks the AI message id whose draft we last applied OR dismissed; gates
//     the auto-apply effect from re-applying the same draft
//   touchedFields + submitAttempted
//     gate visibility of strict-required errors; reset on apply/session change
//
// Lifecycle:
//   1. User describes a market -> AI streams -> auto-apply (userHasEdited=false).
//   2. User edits inline -> userHasEdited=true, touchedFields grows on blur.
//   3. User sends refinement -> new AI draft -> if userHasEdited, queue banner;
//      else auto-apply with state resets.
//   4. New oracle / paste import -> WizardChat re-keys, full reset.
function WizardChat({ session, onReset }: { session: ChatSession; onReset: (session: ChatSession) => void }) {
  const [input, setInput] = useState("");
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [createdOracleAddress, setCreatedOracleAddress] = useState("");
  const [creationStatus, setCreationStatus] = useState(CreationStatus.None);
  const [creationError, setCreationError] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [editedDraft, setEditedDraft] = useState<OracleConfigCandidate | null>(null);
  const [pendingDraftMessageId, setPendingDraftMessageId] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<DraftFieldKey>>(() => new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [userHasEdited, setUserHasEdited] = useState(false);
  const lastAppliedDraftIdRef = useRef<string | null>(null);
  const { createOracle, walletConnected } = useGenLayer();
  const openWalletConnection = useOpenWalletConnection("Connect your wallet to create this market.");

  const {
    clearError,
    error,
    messages,
    regenerate,
    sendMessage,
    status,
    stop,
  } = useChat<OracleChatMessage>({
    id: session.id,
    messages: session.messages,
    onError: (chatError) => {
      console.error("Chat error:", chatError);
    },
    onFinish: ({ messages: finishedMessages }) => {
      saveSession(finishedMessages, session.id);
    },
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isGenerating = status === "submitted" || status === "streaming";
  const visibleMessages = useMemo(() => messages.filter((message) => !isHiddenStartMessage(message)), [messages]);
  const latestDraft = useMemo(() => findLatestDraft(messages), [messages]);
  const streamingInput = useMemo(() => (isGenerating ? findStreamingInput(messages) : null), [messages, isGenerating]);

  // Seed editedDraft when a new AI draft lands. If the user has manually edited
  // since the last apply, queue the new draft as pending instead — never silently
  // clobber. Initial / refinement drafts auto-apply when there are no manual edits,
  // and the auto-apply path resets touch/submit state so stale errors from the
  // prior draft don't carry over.
  useEffect(() => {
    if (!latestDraft) return;
    if (latestDraft.messageId === lastAppliedDraftIdRef.current) return;
    const config = latestDraft.output.status === "valid" ? latestDraft.output.config : undefined;
    if (!config) {
      lastAppliedDraftIdRef.current = latestDraft.messageId;
      return;
    }
    if (userHasEdited) {
      setPendingDraftMessageId(latestDraft.messageId);
      return;
    }
    setEditedDraft(candidateFromConfig(config));
    lastAppliedDraftIdRef.current = latestDraft.messageId;
    setPendingDraftMessageId(null);
    setTouchedFields(new Set());
    setSubmitAttempted(false);
  }, [latestDraft, userHasEdited]);

  // Reset edited draft when session changes (new chat).
  useEffect(() => {
    setEditedDraft(null);
    lastAppliedDraftIdRef.current = null;
    setPendingDraftMessageId(null);
    setTouchedFields(new Set());
    setSubmitAttempted(false);
    setUserHasEdited(false);
  }, [session.id]);

  useEffect(() => {
    saveSession(messages, session.id);
  }, [messages, session.id]);

  // Reset creation lifecycle when a new draft lands.
  useEffect(() => {
    setCreatedOracleAddress("");
    setCreationStatus(CreationStatus.None);
    setCreationError("");
  }, [latestDraft?.messageId]);

  // Effective draft precedence:
  //  1. Live AI stream wins while the user hasn't dirtied the panel — lets refinement
  //     turns visibly fill in fields instead of freezing on the prior draft.
  //  2. The user's editedDraft wins otherwise — never overwrite manual edits with a
  //     stream; the pending banner offers the user a choice when streaming completes.
  //  3. Fall back to the most recent valid AI draft.
  //  4. Empty object if nothing is available yet.
  const effectiveDraft: OracleConfigCandidate = useMemo(() => {
    if (streamingInput && !userHasEdited) return streamingInput;
    if (editedDraft) return editedDraft;
    if (streamingInput) return streamingInput;
    if (latestDraft?.output.status === "valid" && latestDraft.output.config) {
      return candidateFromConfig(latestDraft.output.config);
    }
    return {};
  }, [editedDraft, streamingInput, latestDraft, userHasEdited]);

  const draftValidation = useMemo(() => parseOracleDraft(effectiveDraft), [effectiveDraft]);
  const strictValidation = useMemo(() => parseOracleConfig(effectiveDraft), [effectiveDraft]);

  const aiAttemptedKeys = useMemo<Set<DraftFieldKey>>(() => {
    if (isGenerating) return new Set();
    if (latestDraft?.output.status === "invalid") return new Set(DRAFT_FIELD_KEYS);
    return aiAttemptedFieldKeys(streamingInput ?? null);
  }, [isGenerating, latestDraft, streamingInput]);

  const visibleErrorKeys = useMemo<Set<DraftFieldKey>>(() => {
    if (submitAttempted) return new Set(DRAFT_FIELD_KEYS);
    const merged = new Set<DraftFieldKey>(touchedFields);
    for (const key of aiAttemptedKeys) merged.add(key);
    return merged;
  }, [submitAttempted, touchedFields, aiAttemptedKeys]);

  const draftFieldErrors = useMemo(
    () => (draftValidation.success ? {} : mapValidationToFields(draftValidation.error.issues)),
    [draftValidation],
  );
  const strictFieldErrors = useMemo(
    () => (strictValidation.success ? {} : mapValidationToFields(strictValidation.error.issues)),
    [strictValidation],
  );
  const fieldErrors = useMemo(
    () => mergeFieldErrors(draftFieldErrors, filterFieldErrors(strictFieldErrors, visibleErrorKeys)),
    [draftFieldErrors, strictFieldErrors, visibleErrorKeys],
  );

  const filledCount = useMemo(() => countFilledFields(effectiveDraft), [effectiveDraft]);
  const hasDraft =
    Boolean(editedDraft) ||
    Boolean(latestDraft) ||
    Object.keys(effectiveDraft).length > 0;
  const hasVisibleErrors = useMemo(
    () => Object.values(fieldErrors).some((value) => Boolean(value)),
    [fieldErrors],
  );
  const draftPanelStatus = getDraftPanelStatus({
    creationStatus,
    isGenerating,
    hasVisibleErrors,
    isValid: strictValidation.success,
  });

  const pendingDraft = pendingDraftMessageId !== null;
  const pendingChangeCount = useMemo(() => {
    if (!pendingDraft || !latestDraft) return 0;
    if (latestDraft.output.status !== "valid" || !latestDraft.output.config) return 0;
    if (!editedDraft) return 0;
    return diffFieldCount(editedDraft, candidateFromConfig(latestDraft.output.config));
  }, [pendingDraft, latestDraft, editedDraft]);

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;
    if (error) clearError();
    setCreationStatus(CreationStatus.None);
    setCreationError("");
    void sendMessage({ text: trimmed });
    setInput("");
  }

  function handleSubmit(message: { text: string }) {
    submitText(message.text);
  }

  function updateDraftField<K extends keyof OracleConfigCandidate>(field: K, value: OracleConfigCandidate[K]) {
    setEditedDraft((prev) => ({ ...(prev ?? effectiveDraft), [field]: value }));
    setUserHasEdited(true);
  }

  function markFieldTouched(field: DraftFieldKey) {
    setTouchedFields((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }

  function applyPendingDraft() {
    if (!latestDraft) return;
    const config = latestDraft.output.status === "valid" ? latestDraft.output.config : undefined;
    if (!config) return;
    setEditedDraft(candidateFromConfig(config));
    lastAppliedDraftIdRef.current = latestDraft.messageId;
    setPendingDraftMessageId(null);
    setTouchedFields(new Set());
    setSubmitAttempted(false);
    setUserHasEdited(false);
  }

  function dismissPendingDraft() {
    if (!latestDraft) return;
    lastAppliedDraftIdRef.current = latestDraft.messageId;
    setPendingDraftMessageId(null);
  }

  async function copyDraft() {
    if (!strictValidation.success) return;
    await navigator.clipboard.writeText(oracleConfigToJson(strictValidation.data));
    setCopiedDraft(true);
    window.setTimeout(() => setCopiedDraft(false), 1500);
  }

  async function createMarket() {
    if (!walletConnected) {
      openWalletConnection();
      setCreationError("Connect your wallet to create this market.");
      return;
    }
    setSubmitAttempted(true);
    if (!strictValidation.success) return;
    const config = strictValidation.data;

    try {
      setCreationStatus(CreationStatus.Creating);
      setCreationError("");
      const result = await createOracle(config);
      setCreatedOracleAddress(result.oracleAddress);
      confetti({
        origin: { y: 0.6 },
        particleCount: 100,
        spread: 70,
      });
      setCreationStatus(CreationStatus.Created);
    } catch (createError) {
      console.error("Error creating oracle:", createError);
      setCreationError(createError instanceof Error ? createError.message : "Creation failed.");
      setCreationStatus(CreationStatus.Failed);
    }
  }

  function resetConversation() {
    clearSession();
    setCreatedOracleAddress("");
    setCreationStatus(CreationStatus.None);
    setCreationError("");
    onReset({ id: generateId(), messages: [] });
  }

  function loadConfig(config: OracleConfig) {
    setCreatedOracleAddress("");
    setCreationStatus(CreationStatus.None);
    setCreationError("");
    setPasteOpen(false);
    onReset(sessionFromConfig(config));
  }

  const showEmptyState = visibleMessages.length === 0;
  const editingDisabled =
    isGenerating || creationStatus === CreationStatus.Creating || creationStatus === CreationStatus.Created;

  return (
    <div className="brand-app-shell relative isolate min-h-screen overflow-hidden text-[#2e2e2e] dark:text-white">
      <AppHeader active="assistant" oracleAddress={createdOracleAddress} />

      <WaveDecoration
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-20 -z-10 h-80 w-full opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)] dark:opacity-20"
      />

      <main className="relative z-10 mx-auto grid min-h-screen w-[90%] min-w-0 max-w-[1300px] gap-5 pb-8 pt-24 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="brand-surface flex min-h-[calc(100dvh-7.5rem)] min-w-0 flex-col overflow-hidden rounded-md lg:h-[calc(100dvh-7.5rem)] lg:min-h-[32rem]">
          <div className="flex flex-col gap-4 border-b border-black/10 bg-white/55 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
                Oracle Studio
              </p>
              <h1 className="mt-1 text-xl font-medium leading-tight text-black dark:text-white">
                Assistant
              </h1>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Describe a market. The oracle config drafts on the right.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setPasteOpen(true)} className="border-black/15 bg-transparent text-black hover:bg-black hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black">
                <ClipboardPaste className="size-4" aria-hidden />
                Paste JSON
              </Button>
              <Button type="button" variant="outline" onClick={resetConversation} className="border-black/15 bg-transparent text-black hover:bg-black hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black">
                <Plus className="size-4" aria-hidden />
                New oracle
              </Button>
            </div>
          </div>

          <Conversation className="min-h-0 flex-1">
            <ConversationContent
              className={cn(
                "relative isolate min-w-0 gap-6 overflow-hidden px-4 py-6 sm:px-6",
                showEmptyState
                  ? "min-h-full pb-5 pt-10 sm:pb-6 sm:pt-20 [@media(max-height:900px)]:py-4"
                  : null,
              )}
            >
              {showEmptyState ? <EmptyStateBackdrop /> : null}
              {showEmptyState ? (
                <EmptyStateHero disabled={isGenerating} onExample={submitText} />
              ) : null}

              {visibleMessages.map((message, messageIndex) => {
                const isLast = messageIndex === visibleMessages.length - 1;
                return (
                  <ChatMessage
                    isLastMessage={isLast}
                    isStreaming={isGenerating}
                    key={message.id}
                    latestDraft={latestDraft}
                    message={message}
                    onRetry={() => void regenerate()}
                    onSuggestion={submitText}
                  />
                );
              })}

              {error ? (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  <p>Something went wrong while streaming the assistant response.</p>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void regenerate()}>
                      <RefreshCcw className="size-4" aria-hidden />
                      Retry
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={clearError}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ) : null}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="border-t border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-[#14141f]/90">
            <PromptInput onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
              <PromptInputTextarea
                disabled={isGenerating}
                onChange={(event) => setInput(event.currentTarget.value)}
                placeholder="Describe the market you want to resolve..."
                value={input}
              />
              <PromptInputFooter>
                <PromptInputTools>
                  <span className="px-2 text-xs text-black/45 dark:text-white/50">
                    {isGenerating ? "Drafting on the right" : "Enter to send"}
                  </span>
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={!input.trim() && !isGenerating}
                  onStop={() => void stop()}
                  status={status}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </section>

        <DraftPanel
          copiedDraft={copiedDraft}
          createdOracleAddress={createdOracleAddress}
          creationError={creationError}
          creationStatus={creationStatus}
          draft={effectiveDraft}
          editingDisabled={editingDisabled}
          fieldErrors={fieldErrors}
          filledCount={filledCount}
          hasDraft={hasDraft}
          invalidIssues={latestDraft?.output.status === "invalid" ? latestDraft.output.issues : []}
          isGenerating={isGenerating}
          onApplyPending={applyPendingDraft}
          onCopy={copyDraft}
          onCreate={createMarket}
          onDismissPending={dismissPendingDraft}
          onFieldBlur={markFieldTouched}
          onFieldChange={updateDraftField}
          onStop={() => void stop()}
          pendingChangeCount={pendingChangeCount}
          pendingDraft={pendingDraft}
          status={draftPanelStatus}
          validationOk={strictValidation.success}
          walletConnected={walletConnected}
        />
      </main>

      <PasteJsonDialog onLoad={loadConfig} onOpenChange={setPasteOpen} open={pasteOpen} />
    </div>
  );
}

function PasteJsonDialog({
  onLoad,
  onOpenChange,
  open,
}: {
  onLoad: (config: OracleConfig) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [value, setValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setValue("");
      setErrorMessage("");
    }
  }, [open]);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) {
      setErrorMessage("Paste a JSON oracle config to continue.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      setErrorMessage("Could not parse JSON. Check for syntax errors.");
      return;
    }

    const result = parseOracleConfig(parsed);
    if (!result.success) {
      setErrorMessage(formatValidationError(result.error));
      return;
    }

    onLoad(result.data);
  }

  function handleFormat() {
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      setValue(JSON.stringify(JSON.parse(trimmed), null, 2));
      setErrorMessage("");
    } catch {
      setErrorMessage("Could not format: invalid JSON syntax.");
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Paste oracle JSON</DialogTitle>
          <DialogDescription>
            Paste a previously copied oracle config. The validated draft will load directly into the panel,
            ready to deploy with your wallet.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          aria-invalid={errorMessage ? true : undefined}
          className="min-h-56 font-mono text-xs"
          onChange={(event) => {
            setValue(event.currentTarget.value);
            if (errorMessage) setErrorMessage("");
          }}
          placeholder={'{\n  "title": "...",\n  "description": "...",\n  ...\n}'}
          value={value}
        />
        {errorMessage ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
        <DialogFooter>
          <Button
            disabled={!value.trim()}
            onClick={handleFormat}
            type="button"
            variant="ghost"
          >
            <Braces className="size-4" aria-hidden />
            Format
          </Button>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSubmit} type="button">
            <ClipboardPaste className="size-4" aria-hidden />
            Load draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyStateHero({
  disabled,
  onExample,
}: {
  disabled: boolean;
  onExample: (prompt: string) => void;
}) {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-5 text-[#2e2e2e] dark:text-white [@media(max-height:860px)]:gap-4">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-[image:var(--gradient-brand)] px-3 py-1 text-xs font-medium text-white">
          <BrandMark className="size-3" />
          Intelligent Oracle
        </span>
        <h2 className="mt-3 text-5xl font-light leading-none tracking-normal sm:text-6xl [@media(max-height:860px)]:sm:text-5xl">
          Create an Intelligent Oracle
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-black/65 dark:text-white/65 sm:text-base">
          Describe a market in plain English. The on-chain config drafts on the right, field by field.
          Pick an example or type your own.
        </p>
      </div>

      <div className="flex max-w-full flex-col gap-3 rounded-md border border-black/10 bg-white/65 p-3 text-sm shadow-sm shadow-black/[0.03] dark:border-white/10 dark:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-black dark:text-white">Use your own agent</p>
          <p className="mt-1 max-w-xl break-words leading-6 text-black/60 dark:text-white/60">
            Open the Intelligent Oracle skill and use it with Codex, Claude Code, Cursor, or any agent that can read a URL.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="shrink-0 border-black/15 bg-transparent text-black hover:bg-black hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black"
        >
          <Link href="/skill.md" target="_blank" rel="noreferrer">
            Open skill
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {STARTER_EXAMPLES.map((example) => (
          <button
            className="brand-surface-solid group flex min-w-0 flex-col justify-between gap-3 rounded-md p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--brand-lavender)]/50 hover:bg-[color:color-mix(in_oklab,var(--brand-lavender)_10%,white)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:hover:bg-white/10 sm:min-h-32 [@media(max-height:860px)]:sm:min-h-28"
            disabled={disabled}
            key={example.title}
            onClick={() => onExample(example.prompt)}
            type="button"
          >
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
              {example.title}
            </span>
            <span className="text-sm font-medium leading-snug text-black dark:text-white">{example.hint}</span>
            <span className="inline-flex items-center gap-1 text-xs text-black/55 transition-colors group-hover:text-[color:var(--brand-lavender)] dark:text-white/55">
              Try this <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyStateBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(ellipse_at_11%_0%,color-mix(in_oklab,var(--brand-lavender)_20%,transparent),transparent_58%),linear-gradient(135deg,color-mix(in_oklab,var(--brand-lavender)_12%,transparent),transparent_70%)] opacity-80 [mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)] dark:opacity-35"
      />
      <WaveDecoration
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-56 w-full opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
    </>
  );
}

function ChatMessage({
  isLastMessage,
  isStreaming,
  latestDraft,
  message,
  onRetry,
  onSuggestion,
}: {
  isLastMessage: boolean;
  isStreaming: boolean;
  latestDraft: LatestDraft | null;
  message: OracleChatMessage;
  onRetry: () => void;
  onSuggestion: (suggestion: string) => void;
}) {
  const text = getMessageText(message);
  const showRefinementChips =
    isLastMessage && !isStreaming && message.role === "assistant" && latestDraft !== null;
  const refinementChips =
    showRefinementChips && latestDraft
      ? latestDraft.output.status === "invalid"
        ? getRepairSuggestions(latestDraft.output.issues)
        : VALID_REFINEMENT_CHIPS
      : [];

  return (
    <div>
      <Message className={message.role === "assistant" ? "max-w-full" : undefined} from={message.role}>
        <MessageContent>
          <MessageParts isLastMessage={isLastMessage} isStreaming={isStreaming} message={message} />
        </MessageContent>
      </Message>
      {refinementChips.length > 0 ? (
        <Suggestions className="mt-3 w-full flex-wrap whitespace-normal">
          {refinementChips.map((chip) => (
            <Suggestion
              className="h-auto min-h-8 rounded-md border-border bg-background px-3 py-2 text-left text-foreground hover:bg-muted"
              key={chip}
              onClick={onSuggestion}
              suggestion={chip}
              variant="outline"
            />
          ))}
        </Suggestions>
      ) : null}
      {message.role === "assistant" && text ? (
        <MessageActions className="ml-1 mt-2">
          {isLastMessage ? (
            <MessageAction label="Retry" onClick={onRetry} tooltip="Retry">
              <RefreshCcw className="size-3" aria-hidden />
            </MessageAction>
          ) : null}
          <MessageAction
            label="Copy"
            onClick={() => void navigator.clipboard.writeText(text)}
            tooltip="Copy"
          >
            <Copy className="size-3" aria-hidden />
          </MessageAction>
        </MessageActions>
      ) : null}
    </div>
  );
}

function MessageParts({
  isLastMessage,
  isStreaming,
  message,
}: {
  isLastMessage: boolean;
  isStreaming: boolean;
  message: OracleChatMessage;
}) {
  const reasoningParts = message.parts.filter((part) => part.type === "reasoning");
  const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
  const lastPart = message.parts.at(-1);
  const isReasoningStreaming = isLastMessage && isStreaming && lastPart?.type === "reasoning";

  const hasTextPart = message.parts.some(
    (part) => part.type === "text" && part.text.trim().length > 0,
  );
  // Use the LAST output-available tool part to match findLatestDraft's ordering —
  // a single message may contain multiple drafts, and the panel reflects the most recent one.
  const completedDraftPart = [...message.parts].reverse().find(
    (part) => part.type === "tool-proposeOracleConfig" && part.state === "output-available",
  );
  const fallbackText =
    !hasTextPart && completedDraftPart && completedDraftPart.type === "tool-proposeOracleConfig"
      ? synthesizeDraftConfirmation(completedDraftPart.output)
      : null;

  return (
    <>
      {reasoningText ? (
        <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
          <ReasoningTrigger
            getThinkingMessage={(streaming) =>
              streaming ? <Shimmer duration={1}>Working notes</Shimmer> : <span>Working notes</span>
            }
          />
          <ReasoningContent>{reasoningText}</ReasoningContent>
        </Reasoning>
      ) : null}

      {message.parts.map((part, index) => {
        if (part.type === "reasoning") return null;
        if (part.type === "text") {
          return (
            <MessageResponse className={MARKDOWN_CLASS_NAME} key={`${message.id}-${index}`}>
              {part.text}
            </MessageResponse>
          );
        }
        // Tool parts intentionally render nothing in the chat — the right panel is
        // the single source of truth for draft progress.
        return <Fragment key={`${message.id}-${index}`} />;
      })}

      {fallbackText ? (
        <MessageResponse className={MARKDOWN_CLASS_NAME}>{fallbackText}</MessageResponse>
      ) : null}
    </>
  );
}

function escapeMarkdown(value: string): string {
  // Defang markdown control characters so user/AI-supplied titles or issues
  // can't break the surrounding bold formatting or inject links.
  return value.replace(/[\\`*_{}[\]()#+\-.!|>~]/g, "\\$&");
}

function synthesizeDraftConfirmation(output: ProposeOracleConfigOutput | undefined): string | null {
  if (!output) return null;
  if (output.status === "valid" && output.config) {
    const safeTitle = escapeMarkdown(output.config.title);
    return `Drafted **${safeTitle}**. Edit any field on the right, or tell me what to change.`;
  }
  if (output.status === "invalid") {
    const issue = output.issues[0];
    return issue
      ? `Tried to draft, but ran into: ${escapeMarkdown(issue)} I'll keep iterating — tell me what to change.`
      : "Tried to draft, but the config didn't validate. Tell me what to change.";
  }
  return null;
}

function DraftPanel({
  copiedDraft,
  createdOracleAddress,
  creationError,
  creationStatus,
  draft,
  editingDisabled,
  fieldErrors,
  filledCount,
  hasDraft,
  invalidIssues,
  isGenerating,
  onApplyPending,
  onCopy,
  onCreate,
  onDismissPending,
  onFieldBlur,
  onFieldChange,
  onStop,
  pendingChangeCount,
  pendingDraft,
  status,
  validationOk,
  walletConnected,
}: {
  copiedDraft: boolean;
  createdOracleAddress: string;
  creationError: string;
  creationStatus: CreationStatus;
  draft: OracleConfigCandidate;
  editingDisabled: boolean;
  fieldErrors: FieldErrors;
  filledCount: number;
  hasDraft: boolean;
  invalidIssues: string[];
  isGenerating: boolean;
  onApplyPending: () => void;
  onCopy: () => Promise<void>;
  onCreate: () => Promise<void>;
  onDismissPending: () => void;
  onFieldBlur: (field: DraftFieldKey) => void;
  onFieldChange: <K extends keyof OracleConfigCandidate>(field: K, value: OracleConfigCandidate[K]) => void;
  onStop: () => void;
  pendingChangeCount: number;
  pendingDraft: boolean;
  status: DraftPanelStatus;
  validationOk: boolean;
  walletConnected: boolean;
}) {
  // Stay clickable when invalid so submitAttempted can fire and reveal every gap.
  const createDisabled =
    creationStatus === CreationStatus.Creating ||
    creationStatus === CreationStatus.Created;

  return (
    <aside className="brand-surface min-h-[28rem] min-w-0 rounded-md lg:sticky lg:top-24 lg:h-[calc(100vh-7.5rem)]">
      <div className="flex h-full flex-col">
        <div className="border-b border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
                Review
              </p>
              <h2 className="mt-1 text-xl font-medium leading-tight text-black dark:text-white">Market Draft</h2>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                {status === "empty"
                  ? "Will fill as you describe the market."
                  : status === "drafting"
                  ? "Watching the draft come together."
                  : status === "needs_changes"
                  ? "A few things to fix before deploy."
                  : status === "ready"
                  ? "Looks good. Edit anything inline if needed."
                  : status === "creating"
                  ? "Submitting on-chain."
                  : status === "created"
                  ? "Live oracle deployed."
                  : "Deployment failed. Retry below."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill filledCount={filledCount} status={status} />
              {isGenerating ? (
                <Button onClick={onStop} size="sm" type="button" variant="ghost" className="text-black/65 hover:text-black dark:text-white/65 dark:hover:text-white">
                  <X className="size-4" aria-hidden />
                  Stop
                </Button>
              ) : null}
            </div>
          </div>
          {pendingDraft ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-[color:var(--brand-lavender)]/30 bg-[color:color-mix(in_oklab,var(--brand-lavender)_10%,white)] px-3 py-2 text-xs dark:bg-white/10">
              <span className="text-black/60 dark:text-white/65">
                {pendingChangeCount > 0
                  ? `New AI draft ready — ${pendingChangeCount} ${pendingChangeCount === 1 ? "change" : "changes"}.`
                  : "New AI draft ready."}
              </span>
              <div className="flex items-center gap-2">
                <Button onClick={onDismissPending} size="sm" type="button" variant="ghost">
                  Keep my edits
                </Button>
                <Button onClick={onApplyPending} size="sm" type="button" className="bg-black text-white hover:bg-[color:var(--brand-lavender)] dark:bg-white dark:text-black dark:hover:bg-[color:var(--brand-lavender)] dark:hover:text-white">
                  Use AI draft
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <DraftFormView
            disabled={editingDisabled}
            draft={draft}
            fieldErrors={fieldErrors}
            hasDraft={hasDraft}
            invalidIssues={invalidIssues}
            isGenerating={isGenerating}
            onFieldBlur={onFieldBlur}
            onFieldChange={onFieldChange}
            status={status}
          />
        </div>

        <div className="space-y-3 border-t border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          {creationError ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {creationError}
            </div>
          ) : null}

          {createdOracleAddress ? (
            <div className="rounded-md border border-[color:var(--brand-lavender)]/30 bg-[color:color-mix(in_oklab,var(--brand-lavender)_12%,white)] p-3 text-sm dark:bg-white/10">
              <p className="font-medium text-black dark:text-white">Oracle created</p>
              <p className="mt-1 break-all font-mono text-xs text-black/65 dark:text-white/65">{createdOracleAddress}</p>
              <Button asChild className="mt-3 w-full bg-black text-white hover:bg-[color:var(--brand-lavender)]">
                <Link href={`/oracle/${createdOracleAddress}`}>
                  View in explorer
                  <ExternalLink className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={!validationOk}
              onClick={() => void onCopy()}
              type="button"
              variant="outline"
              className="border-black/15 bg-transparent text-black hover:bg-black hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black"
            >
              <Clipboard className="size-4" aria-hidden />
              {copiedDraft ? "Copied" : "Copy JSON"}
            </Button>
            <Button
              disabled={createDisabled}
              onClick={() => void onCreate()}
              type="button"
              className="bg-black text-white hover:bg-[color:var(--brand-lavender)] dark:bg-white dark:text-black dark:hover:bg-[color:var(--brand-lavender)] dark:hover:text-white"
            >
              {creationStatus === CreationStatus.Creating ? <Spinner /> : <Rocket className="size-4" aria-hidden />}
              {getCreateButtonText(creationStatus, walletConnected)}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function StatusPill({ filledCount, status }: { filledCount: number; status: DraftPanelStatus }) {
  const info = getDraftStatusInfo(status, filledCount);
  return (
    <Badge className={info.badgeClassName} variant="outline">
      {status === "drafting" ? (
        <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-foreground" aria-hidden />
      ) : null}
      {status === "ready" ? <Check className="mr-1 size-3" aria-hidden /> : null}
      {info.label}
    </Badge>
  );
}

function getDraftStatusInfo(status: DraftPanelStatus, filledCount: number) {
  const map: Record<DraftPanelStatus, { badgeClassName: string; label: string }> = {
    created: {
      badgeClassName: "border-[color:var(--brand-lavender)]/30 bg-[color:color-mix(in_oklab,var(--brand-lavender)_12%,transparent)] text-[color:var(--brand-lavender)]",
      label: "Created",
    },
    creating: {
      badgeClassName: "border-black/10 bg-white/70 text-black dark:border-white/15 dark:bg-white/10 dark:text-white",
      label: "Creating",
    },
    drafting: {
      badgeClassName: "border-[color:var(--brand-blue)]/20 bg-[color:color-mix(in_oklab,var(--brand-blue)_8%,transparent)] text-[color:var(--brand-blue)] dark:text-white",
      label: `Drafting · ${filledCount} of ${TOTAL_DRAFT_FIELDS}`,
    },
    empty: {
      badgeClassName: "border-black/10 bg-white/60 text-black/55 dark:border-white/15 dark:bg-white/10 dark:text-white/60",
      label: `${filledCount} of ${TOTAL_DRAFT_FIELDS} fields`,
    },
    failed: {
      badgeClassName: "border-destructive/25 bg-destructive/10 text-destructive",
      label: "Failed",
    },
    needs_changes: {
      badgeClassName: "border-destructive/25 bg-destructive/10 text-destructive",
      label: "Needs changes",
    },
    ready: {
      badgeClassName: "border-[color:var(--brand-lavender)]/30 bg-[color:color-mix(in_oklab,var(--brand-lavender)_12%,transparent)] text-[color:var(--brand-lavender)]",
      label: "Ready",
    },
  };

  return map[status];
}

function DraftFormView({
  disabled,
  draft,
  fieldErrors,
  hasDraft,
  invalidIssues,
  isGenerating,
  onFieldBlur,
  onFieldChange,
  status,
}: {
  disabled: boolean;
  draft: OracleConfigCandidate;
  fieldErrors: FieldErrors;
  hasDraft: boolean;
  invalidIssues: string[];
  isGenerating: boolean;
  onFieldBlur: (field: DraftFieldKey) => void;
  onFieldChange: <K extends keyof OracleConfigCandidate>(field: K, value: OracleConfigCandidate[K]) => void;
  status: DraftPanelStatus;
}) {
  const showHelper = status === "empty" && !hasDraft && !isGenerating;

  const inlineErrorPaths = new Set<string>();
  if (fieldErrors.title) inlineErrorPaths.add("title");
  if (fieldErrors.description) inlineErrorPaths.add("description");
  if (fieldErrors.potentialOutcomes) inlineErrorPaths.add("potentialOutcomes");
  if (fieldErrors.rules) inlineErrorPaths.add("rules");
  if (fieldErrors.sources) {
    inlineErrorPaths.add("dataSourceDomains");
    inlineErrorPaths.add("resolutionURLs");
  }
  if (fieldErrors.earliestResolutionDate) inlineErrorPaths.add("earliestResolutionDate");

  const orphanIssues = invalidIssues.filter((issue) => {
    // formatIssue emits "path.subpath: message" — match against the top-level path
    // segment so nested issues (e.g., "potentialOutcomes.0") dedupe correctly.
    const prefix = issue.split(":")[0]?.trim() ?? "";
    const topLevel = prefix.split(".")[0] ?? "";
    return prefix && !inlineErrorPaths.has(topLevel);
  });

  return (
    <div className="space-y-3">
      {showHelper ? (
        <div className="rounded-md border border-dashed border-black/15 bg-white/50 p-3 text-xs text-black/55 dark:border-white/15 dark:bg-white/5 dark:text-white/55">
          As you describe the market in chat, each field below will populate. You can edit any field
          inline once it appears.
        </div>
      ) : null}

      <TitleField
        disabled={disabled}
        error={fieldErrors.title}
        isGenerating={isGenerating}
        onBlur={() => onFieldBlur("title")}
        onChange={(value) => onFieldChange("title", value)}
        value={draft.title}
      />
      <DescriptionField
        disabled={disabled}
        error={fieldErrors.description}
        isGenerating={isGenerating}
        onBlur={() => onFieldBlur("description")}
        onChange={(value) => onFieldChange("description", value)}
        value={draft.description}
      />
      <OutcomesField
        disabled={disabled}
        error={fieldErrors.potentialOutcomes}
        isGenerating={isGenerating}
        onBlur={() => onFieldBlur("potentialOutcomes")}
        onChange={(value) => onFieldChange("potentialOutcomes", value)}
        value={draft.potentialOutcomes}
      />
      <RulesField
        disabled={disabled}
        error={fieldErrors.rules}
        isGenerating={isGenerating}
        onBlur={() => onFieldBlur("rules")}
        onChange={(value) => onFieldChange("rules", value)}
        value={draft.rules}
      />
      <SourcesField
        disabled={disabled}
        error={fieldErrors.sources}
        isGenerating={isGenerating}
        onDomainsBlur={() => onFieldBlur("dataSourceDomains")}
        onDomainsChange={(value) => onFieldChange("dataSourceDomains", value)}
        onUrlsBlur={() => onFieldBlur("resolutionURLs")}
        onUrlsChange={(value) => onFieldChange("resolutionURLs", value)}
        urls={draft.resolutionURLs}
        domains={draft.dataSourceDomains}
      />
      <DateField
        disabled={disabled}
        error={fieldErrors.earliestResolutionDate}
        isGenerating={isGenerating}
        onBlur={() => onFieldBlur("earliestResolutionDate")}
        onChange={(value) => onFieldChange("earliestResolutionDate", value)}
        value={draft.earliestResolutionDate}
      />

      {orphanIssues.length > 0 ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <p className="font-medium">Issues to fix</p>
          <ul className="mt-2 space-y-1">
            {orphanIssues.map((issue) => (
              <li className="flex gap-2" key={issue}>
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function FieldShell({
  children,
  error,
  hint,
  icon,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  hint?: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <section
      className={cn(
        "space-y-2.5 rounded-md border bg-white/70 px-4 py-3.5 transition-colors dark:bg-white/[0.04]",
        error
          ? "border-destructive/40"
          : "border-black/10 dark:border-white/10",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("brand-icon-frame size-8 shrink-0", error ? "border-destructive/30 text-destructive" : "")}>{icon}</span>
        <h4 className="text-sm font-semibold text-black dark:text-white">{label}</h4>
      </div>
      {hint ? <p className="text-xs text-black/50 dark:text-white/50">{hint}</p> : null}
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
    </section>
  );
}

function FieldSkeleton({ height = "h-9", width = "w-full" }: { height?: string; width?: string }) {
  return <div className={`${height} ${width} animate-pulse rounded-md bg-black/10 dark:bg-white/10`} aria-hidden />;
}

function shouldShowSkeleton(value: unknown, isGenerating: boolean) {
  if (!isGenerating) return false;
  if (typeof value === "string") return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return value === undefined || value === null;
}

function TitleField({
  disabled,
  error,
  isGenerating,
  onBlur,
  onChange,
  value,
}: {
  disabled: boolean;
  error?: string;
  isGenerating: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
  value?: string;
}) {
  const showSkeleton = shouldShowSkeleton(value, isGenerating);
  return (
    <FieldShell error={error} icon={<Sparkles className="size-4" aria-hidden />} label="Title">
      {showSkeleton ? (
        <FieldSkeleton />
      ) : (
        <Input
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          onBlur={onBlur}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="Concise market question"
          value={value ?? ""}
        />
      )}
    </FieldShell>
  );
}

function DescriptionField({
  disabled,
  error,
  isGenerating,
  onBlur,
  onChange,
  value,
}: {
  disabled: boolean;
  error?: string;
  isGenerating: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
  value?: string;
}) {
  const showSkeleton = shouldShowSkeleton(value, isGenerating);
  return (
    <FieldShell error={error} icon={<ListChecks className="size-4" aria-hidden />} label="Description">
      {showSkeleton ? (
        <FieldSkeleton height="h-20" />
      ) : (
        <Textarea
          aria-invalid={error ? true : undefined}
          className="min-h-20 resize-y"
          disabled={disabled}
          onBlur={onBlur}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="Plain-language summary of how this resolves"
          value={value ?? ""}
        />
      )}
    </FieldShell>
  );
}

function OutcomesField({
  disabled,
  error,
  isGenerating,
  onBlur,
  onChange,
  value,
}: {
  disabled: boolean;
  error?: string;
  isGenerating: boolean;
  onBlur: () => void;
  onChange: (value: string[]) => void;
  value?: string[];
}) {
  const showSkeleton = shouldShowSkeleton(value, isGenerating);
  const [first = "", second = ""] = value ?? [];

  function update(index: 0 | 1, next: string) {
    const updated = [first, second];
    updated[index] = next;
    onChange(updated);
  }

  return (
    <FieldShell
      error={error}
      hint="Exactly two mutually exclusive outcomes."
      icon={<Split className="size-4" aria-hidden />}
      label="Binary outcomes"
    >
      {showSkeleton ? (
        <div className="grid grid-cols-2 gap-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2" onBlur={onBlur}>
          <Input
            aria-invalid={error ? true : undefined}
            aria-label="Outcome 1"
            disabled={disabled}
            onChange={(event) => update(0, event.currentTarget.value)}
            placeholder="Yes"
            value={first}
          />
          <Input
            aria-invalid={error ? true : undefined}
            aria-label="Outcome 2"
            disabled={disabled}
            onChange={(event) => update(1, event.currentTarget.value)}
            placeholder="No"
            value={second}
          />
        </div>
      )}
    </FieldShell>
  );
}

function RulesField({
  disabled,
  error,
  isGenerating,
  onBlur,
  onChange,
  value,
}: {
  disabled: boolean;
  error?: string;
  isGenerating: boolean;
  onBlur: () => void;
  onChange: (value: string[]) => void;
  value?: string[];
}) {
  const rules = value ?? [];
  const showSkeleton = shouldShowSkeleton(value, isGenerating);

  function updateRule(index: number, next: string) {
    const updated = rules.slice();
    updated[index] = next;
    onChange(updated);
  }

  function removeRule(index: number) {
    onChange(rules.filter((_, idx) => idx !== index));
  }

  function addRule() {
    onChange([...rules, ""]);
  }

  return (
    <FieldShell
      error={error}
      hint="Natural-language resolution rules. At least one."
      icon={<ListChecks className="size-4" aria-hidden />}
      label="Resolution rules"
    >
      {showSkeleton ? (
        <div className="space-y-2">
          <FieldSkeleton height="h-16" />
          <FieldSkeleton height="h-16" />
        </div>
      ) : (
        <div onBlur={onBlur}>
          <ol className="space-y-2">
            {rules.map((rule, index) => (
              <li className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-2" key={index}>
                <span className="brand-icon-frame mt-2 flex size-6 text-xs font-medium">
                  {index + 1}
                </span>
                <Textarea
                  aria-invalid={error ? true : undefined}
                  aria-label={`Rule ${index + 1}`}
                  className="min-h-16 resize-y text-sm"
                  disabled={disabled}
                  onChange={(event) => updateRule(index, event.currentTarget.value)}
                  placeholder="Describe one resolution rule"
                  value={rule}
                />
                <Button
                  aria-label={`Remove rule ${index + 1}`}
                  className="mt-1"
                  disabled={disabled}
                  onClick={() => removeRule(index)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
          <Button
            disabled={disabled}
            onClick={addRule}
            size="sm"
            type="button"
            variant="outline"
            className="mt-2 border-black/15 bg-transparent text-black hover:bg-black hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black"
          >
            <Plus className="size-4" aria-hidden />
            Add rule
          </Button>
        </div>
      )}
    </FieldShell>
  );
}

function SourcesField({
  disabled,
  domains,
  error,
  isGenerating,
  onDomainsBlur,
  onDomainsChange,
  onUrlsBlur,
  onUrlsChange,
  urls,
}: {
  disabled: boolean;
  domains?: string[];
  error?: string;
  isGenerating: boolean;
  onDomainsBlur: () => void;
  onDomainsChange: (value: string[]) => void;
  onUrlsBlur: () => void;
  onUrlsChange: (value: string[]) => void;
  urls?: string[];
}) {
  const hasDomains = (domains ?? []).length > 0;
  const hasUrls = (urls ?? []).length > 0;
  const initialMode: SourceMode = hasUrls && !hasDomains ? "urls" : "domains";
  const [mode, setMode] = useState<SourceMode>(initialMode);

  // Sync mode only when exactly one side has content. If both empty or both
  // populated, respect the user's tab choice.
  useEffect(() => {
    if (hasUrls && !hasDomains) setMode("urls");
    else if (hasDomains && !hasUrls) setMode("domains");
  }, [hasDomains, hasUrls]);

  const showSkeleton = isGenerating && !hasDomains && !hasUrls;
  const activeList = mode === "domains" ? domains ?? [] : urls ?? [];
  const onActiveChange = mode === "domains" ? onDomainsChange : onUrlsChange;
  const Icon = mode === "domains" ? Globe2 : Link2;

  function switchMode(next: SourceMode) {
    if (next === mode) return;
    setMode(next);
  }

  // Once the user blurs an input that holds real content, the inactive list is
  // no longer their intent — clear it. Tab clicks and addItem are non-destructive;
  // single keystrokes and multi-line pastes don't commit either.
  function commitActiveMode() {
    const activeHasContent = activeList.some((value) => value.trim().length > 0);
    if (!activeHasContent) return;
    if (mode === "domains" && (urls ?? []).length > 0) onUrlsChange([]);
    else if (mode === "urls" && (domains ?? []).length > 0) onDomainsChange([]);
  }

  function handleInputBlur() {
    commitActiveMode();
    if (mode === "domains") onDomainsBlur();
    else onUrlsBlur();
  }

  function updateItem(index: number, value: string) {
    const updated = activeList.slice();
    updated[index] = value;
    onActiveChange(updated);
  }

  function removeItem(index: number) {
    onActiveChange(activeList.filter((_, idx) => idx !== index));
  }

  function addItem() {
    onActiveChange([...activeList, ""]);
  }

  return (
    <FieldShell
      error={error}
      hint="Domains restrict where validators look. URLs are exact pages to fetch. Pick one."
      icon={<Icon className="size-4" aria-hidden />}
      label="Resolution sources"
    >
      <div className="inline-flex rounded-md border border-black/10 bg-white/70 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
        <button
          className={`rounded-sm px-3 py-1 transition-colors ${
            mode === "domains" ? "bg-black text-white dark:bg-white dark:text-black" : "text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white"
          }`}
          disabled={disabled}
          onClick={() => switchMode("domains")}
          type="button"
        >
          Domains
        </button>
        <button
          className={`rounded-sm px-3 py-1 transition-colors ${
            mode === "urls" ? "bg-black text-white dark:bg-white dark:text-black" : "text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white"
          }`}
          disabled={disabled}
          onClick={() => switchMode("urls")}
          type="button"
        >
          URLs
        </button>
      </div>

      {showSkeleton ? (
        <FieldSkeleton />
      ) : (
        <div>
          <ul className="space-y-2">
            {activeList.map((item, index) => (
              <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2" key={index}>
                <Input
                  aria-invalid={error ? true : undefined}
                  aria-label={`${mode === "domains" ? "Domain" : "URL"} ${index + 1}`}
                  disabled={disabled}
                  onBlur={handleInputBlur}
                  onChange={(event) => updateItem(index, event.currentTarget.value)}
                  placeholder={mode === "domains" ? "example.com" : "https://example.com/path"}
                  value={item}
                />
                <Button
                  aria-label={`Remove ${mode === "domains" ? "domain" : "URL"} ${index + 1}`}
                  disabled={disabled}
                  onClick={() => removeItem(index)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            disabled={disabled}
            onClick={addItem}
            size="sm"
            type="button"
            variant="outline"
            className="mt-2 border-black/15 bg-transparent text-black hover:bg-black hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black"
          >
            <Plus className="size-4" aria-hidden />
            Add {mode === "domains" ? "domain" : "URL"}
          </Button>
        </div>
      )}
    </FieldShell>
  );
}

function DateField({
  disabled,
  error,
  isGenerating,
  onBlur,
  onChange,
  value,
}: {
  disabled: boolean;
  error?: string;
  isGenerating: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
  value?: string;
}) {
  const showSkeleton = shouldShowSkeleton(value, isGenerating);
  return (
    <FieldShell
      error={error}
      hint="Earliest date the result can be checked (YYYY-MM-DD)."
      icon={<CalendarDays className="size-4" aria-hidden />}
      label="Earliest resolution"
    >
      {showSkeleton ? (
        <FieldSkeleton />
      ) : (
        <Input
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          onBlur={onBlur}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="2026-12-31"
          type="date"
          value={value ?? ""}
        />
      )}
    </FieldShell>
  );
}

export function WizardPage() {
  const [session, setSession] = useState<ChatSession | null>(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  if (!session) {
    return (
      <div className="brand-app-shell min-h-screen">
        <AppHeader active="assistant" />
        <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 text-black/55 dark:text-white/60">
          <Spinner className="mr-2" />
          Loading assistant
        </main>
      </div>
    );
  }

  return <WizardChat key={session.id} onReset={setSession} session={session} />;
}
