import React, { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, Bot, User, HelpCircle, Loader2, Mic, AlertCircle, RefreshCw, CheckCircle2, XCircle, MessageSquareMore, ThumbsUp, Search, Database, Sliders } from "lucide-react";
import { BusinessState } from "../types";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { supabase, updateDecision, searchDecisions } from "../services/apiClient";

interface CfoChatProps {
  state: BusinessState;
  currencySymbol: string;
  preseededPrompt?: string | null;
  clearPreseededPrompt?: () => void;
}

// ── Decision marker helpers ────────────────────────────────────────────────────
// AARYA appends [[DEC:uuid]] to responses that contain actionable recommendations.
// We parse this out of the streamed text, strip it from display, and surface the
// Founder Decision card so the founder can log their actual choice.

const DECISION_MARKER_REGEX = /\[\[DEC:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\]/i;
const TOOL_EXECUTED_REGEX = /(\r?\n)*(\*\*)?Tool Executed:?(\*\*)?.*(?:\r?\n|$)/gi;

function parseMessageText(parts: any[]): { displayText: string; decisionId: string | null } {
  let displayText = "";
  let decisionId: string | null = null;

  for (const part of parts ?? []) {
    if (part.type === "text") {
      let text = part.text;
      const match = text.match(DECISION_MARKER_REGEX);
      if (match) {
        decisionId = match[1];
        text = text.replace(DECISION_MARKER_REGEX, "");
      }
      text = text.replace(TOOL_EXECUTED_REGEX, "").trimEnd();
      displayText += text;
    }
  }

  return { displayText: displayText.trim(), decisionId };
}

// ── Founder Decision Card ─────────────────────────────────────────────────────

interface DecisionCardProps {
  decisionId: string;
  recommendationText: string;
  chosenOption: string | null;
  isLoading: boolean;
  onChoose: (decisionId: string, choice: string, recommendationText: string) => void;
}

const DECISION_OPTIONS = [
  {
    key: "approve",
    label: "I'll do this",
    icon: CheckCircle2,
    colorClass:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    badgeIcon: ThumbsUp,
  },
  {
    key: "decline",
    label: "Won't pursue",
    icon: XCircle,
    colorClass:
      "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-400",
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/40",
    badgeIcon: XCircle,
  },
  {
    key: "discuss",
    label: "Let's discuss",
    icon: MessageSquareMore,
    colorClass:
      "border-[#D988A1]/40 bg-[#D988A1]/10 text-[#D988A1] hover:bg-[#D988A1]/20 hover:border-[#D988A1]",
    badgeClass: "bg-[#D988A1]/20 text-[#D988A1] border-[#D988A1]/40",
    badgeIcon: MessageSquareMore,
  },
] as const;

const DecisionCard: React.FC<DecisionCardProps> = ({
  decisionId,
  recommendationText,
  chosenOption,
  isLoading,
  onChoose,
}) => {
  const chosen = DECISION_OPTIONS.find((o) => o.key === chosenOption);

  return (
    <div
      className={`mt-2 rounded-2xl border p-3 transition-all duration-500 ${
        chosen
          ? "border-neutral-700/60 bg-[#13111C]/60"
          : "border-[#D988A1]/20 bg-[#1F1D2B]/80"
      }`}
    >
      {!chosen ? (
        <>
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3 h-3 text-[#D988A1]" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#D988A1] font-bold">
              Founder Decision Required
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 mb-2.5 leading-relaxed">
            AARYA made a recommendation above. What will you do?
          </p>
          {/* Option buttons */}
          <div className="flex flex-wrap gap-1.5">
            {DECISION_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  id={`decision-${decisionId}-${opt.key}`}
                  disabled={isLoading}
                  onClick={() => onChoose(decisionId, opt.key, recommendationText)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-medium transition-all duration-200 active:scale-95 disabled:opacity-40 ${opt.colorClass}`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 mt-2">
              <Loader2 className="w-3 h-3 text-[#D988A1] animate-spin" />
              <span className="text-[9px] text-neutral-500 font-mono">Logging decision…</span>
            </div>
          )}
        </>
      ) : (
        /* Locked badge state */
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-semibold ${chosen.badgeClass}`}
          >
            <chosen.badgeIcon className="w-3 h-3 shrink-0" />
            Logged: {chosen.label}
          </div>
          <span className="text-[9px] text-neutral-500 font-mono">Decision recorded ✓</span>
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const CfoChatView: React.FC<CfoChatProps> = ({
  state,
  currencySymbol,
  preseededPrompt,
  clearPreseededPrompt,
}) => {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listenTimeoutRef = useRef<any>(null);

  // decisionChoices tracks which option the founder picked for each decisionId
  const [decisionChoices, setDecisionChoices] = useState<Record<string, string>>({});
  // decisionLoading tracks the in-flight PATCH call
  const [decisionLoading, setDecisionLoading] = useState<Record<string, boolean>>({});

  // ── Semantic Search Test Panel state ─────────────────────────────────────────
  const [showMemorySearch, setShowMemorySearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchThreshold, setSearchThreshold] = useState<number>(0.3);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSemanticSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await searchDecisions({
        query: searchQuery.trim(),
        threshold: searchThreshold,
        limit: 10,
      }) as { success: boolean; data?: any[] };
      setSearchResults(res?.data || []);
    } catch (err: any) {
      console.error("[SemanticSearch] Error:", err);
      setSearchError(err?.message || "Search failed. Please verify pgvector and embedding models.");
    } finally {
      setIsSearching(false);
    }
  };

  // Initialize Vercel AI SDK useChat hook pointing to the backend stream endpoint
  const {
    messages,
    sendMessage,
    status,
    setMessages,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001"}/api/chat`,
      headers: async () => {
        if (!supabase) return {};
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    messages: [
      {
        id: "msg_welcome",
        role: "assistant",
        parts: [{ type: "text", text: "Hello! I am AARYA — your Autonomous AI for Runway, Yield & Analytics. Complete your company onboarding and upload your first ledger sheet to get started. I'm ready to analyze your cash flow, collections, and runway the moment data arrives." }],
      },
    ],
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Watch for preseeded dashboard quick prompts (e.g. from Explain Your Math)
  useEffect(() => {
    if (preseededPrompt) {
      sendMessage({ text: preseededPrompt });
      if (clearPreseededPrompt) {
        clearPreseededPrompt();
      }
    }
  }, [preseededPrompt, sendMessage, clearPreseededPrompt]);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening) {
      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
      setIsListening(false);
    } else {
      setIsListening(true);
      // Simulate premium transcribing voice after 2.2 seconds
      listenTimeoutRef.current = setTimeout(() => {
        const simulatedVoicePrompts = [
          "Explain our runways and monthly burn rates.",
          "Who owes us money and how can we accelerate collections?",
          "Are there any outstanding payables or bills crossing 30 days overdue?",
          "What is our projected cash flow for the next 4 weeks?",
        ];
        const randomPrompt = simulatedVoicePrompts[Math.floor(Math.random() * simulatedVoicePrompts.length)];
        
        setInput(randomPrompt);
        setIsListening(false);
      }, 2200);
    }
  };

  useEffect(() => {
    return () => {
      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    };
  }, []);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSuggestedClick = (promptText: string) => {
    sendMessage({ text: promptText });
  };

  const handleClear = () => {
    setMessages([
      {
        id: "msg_reinit_" + Date.now(),
        role: "assistant",
        parts: [{ type: "text", text: "AARYA CFO Session has been reset. How can I assist you with ledger audits, collection tracking, or cash flow advice today?" }],
      },
    ]);
    setDecisionChoices({});
    setDecisionLoading({});
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  // ── Founder Decision handler ─────────────────────────────────────────────
  const handleDecisionChoice = useCallback(async (
    decisionId: string,
    choice: string,
    recommendationText: string,
  ) => {
    setDecisionLoading((prev) => ({ ...prev, [decisionId]: true }));
    try {
      // Send ai_recommendation alongside founder_decision.
      // This is the reliable fallback: even if the backend onFinish callback
      // failed to persist the recommendation text (e.g., embedding API error),
      // this PATCH call saves both the decision AND the recommendation together.
      await updateDecision(decisionId, {
        founder_decision:  choice,
        ai_recommendation: recommendationText,
      });
      // Only lock the card badge AFTER the API call succeeds
      setDecisionChoices((prev) => ({ ...prev, [decisionId]: choice }));
    } catch (err) {
      console.error("[DecisionCard] Failed to log founder decision:", err);
      // Do NOT lock the badge — let the founder retry
    } finally {
      setDecisionLoading((prev) => ({ ...prev, [decisionId]: false }));
    }
  }, []);

  const suggestions = [
    "Who owes me money?",
    "Why is cash flow down?",
    "Generate a collection risk report.",
    "Give me advice on accelerating collections.",
  ];

  return (
    <div id="cfo-chat-view" className="flex flex-col h-full bg-[#EAE7E4] dark:bg-[#13111C] text-neutral-900 dark:text-[#9E9AA7] relative overflow-hidden">
      
      {/* Chat header bar */}
      <div className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-800/60 bg-white/95 dark:bg-[#1F1D2B]/95 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="AARYA Logo" className="w-10 h-10 rounded-xl object-cover shadow-md shadow-[#D988A1]/20" />
          <div>
            <h2 className="font-heading font-bold text-xs tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
              Ask AARYA <span className="text-[8px] bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">COPILOT</span>
            </h2>
            <p className="text-[10px] text-neutral-500 dark:text-[#9E9AA7] font-mono">
              Indian Startup FinGPT &bull; Gemini
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMemorySearch(true)}
            className="flex items-center gap-1.5 text-[9px] text-neutral-600 dark:text-[#E2DFE9] hover:text-white dark:hover:text-white hover:bg-[#141414] dark:hover:bg-[#8A5A7B]/30 font-mono uppercase tracking-wider bg-white dark:bg-[#13111C] border border-neutral-200 dark:border-neutral-800/60 px-2.5 py-1 rounded-[12px] transition-all shadow-xs"
          >
            <Search className="w-3 h-3 text-[#D988A1]" />
            <span>Test Memory Search</span>
          </button>
          <button
            id="clear-chat-btn"
            onClick={handleClear}
            className="text-[9px] text-neutral-500 dark:text-[#9E9AA7] hover:text-white dark:hover:text-white hover:bg-red-500/10 dark:hover:bg-[#8A5A7B]/20 font-mono uppercase tracking-wider bg-white dark:bg-[#13111C] border border-neutral-200 dark:border-neutral-800/60 px-2.5 py-1 rounded-[12px] transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Message body list */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 scroll-smooth"
      >
        <div className="max-w-4xl mx-auto w-full space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === "user";

            // For assistant messages, parse out the [[DEC:uuid]] marker
            const { displayText, decisionId } = isUser
              ? { displayText: "", decisionId: null }
              : parseMessageText(msg.parts as any[]);

            return (
              <div 
                key={msg.id}
                className={`flex items-start gap-2.5 ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isUser 
                    ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-[#9E9AA7]" 
                    : "bg-gradient-to-br from-[#D988A1] to-[#8A5A7B] text-white"
                }`}>
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message block */}
                <div className="flex flex-col space-y-1 max-w-[85%]">
                  <div className={`rounded-[20px] p-3 text-xs leading-relaxed whitespace-pre-line border ${
                    isUser 
                      ? "bg-[#F4F2F0] dark:bg-[#1F1D2B] border-neutral-200 dark:border-[#D988A1]/20 text-neutral-800 dark:text-white" 
                      : "bg-white dark:bg-[#1F1D2B]/80 border-neutral-200 dark:border-neutral-800/60 text-neutral-800 dark:text-[#E2DFE9] shadow-xs"
                  }`}>
                    {isUser
                      ? msg.parts?.map((part: any, idx: number) => {
                          if (part.type === "text") return <span key={idx}>{part.text}</span>;
                          return null;
                        })
                      : displayText
                    }
                  </div>

                  {/* ── Founder Decision Card (assistant messages only) ──────────── */}
                  {!isUser && decisionId && (
                    <DecisionCard
                      decisionId={decisionId}
                      recommendationText={displayText}
                      chosenOption={decisionChoices[decisionId] ?? null}
                      isLoading={decisionLoading[decisionId] ?? false}
                      onChoose={handleDecisionChoice}
                    />
                  )}

                  <div className={`text-[9px] text-neutral-400 dark:text-[#9E9AA7] font-mono ${isUser ? "text-right" : "text-left"}`}>
                    {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-start gap-2.5 mr-auto">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D988A1] to-[#8A5A7B] text-white flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/60 rounded-[20px] p-3 flex items-center gap-2 shadow-xs max-w-xs">
                <Loader2 className="w-3.5 h-3.5 text-[#D988A1] animate-spin" />
                <span className="text-[10px] text-neutral-500 dark:text-[#9E9AA7] font-mono">AARYA is parsing tax ledgers...</span>
              </div>
            </div>
          )}

          {/* Error display */}
          {(error || status === "error") && (
            <div className="flex items-start gap-2.5 mr-auto">
              <div className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
                <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="bg-red-50 dark:bg-[#1F1D2B] border border-red-200 dark:border-red-500/30 rounded-[20px] p-3.5 flex flex-col gap-2 shadow-sm max-w-md text-red-600 dark:text-red-400">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>Connection or Timeout Issue</span>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-[#9E9AA7]">
                  {error ? (error.message || String(error)) : "AARYA encountered a network timeout or connection failure while analyzing financials."}
                </p>
                <button
                  type="button"
                  onClick={handleClear}
                  className="self-start mt-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] rounded-xl transition-all font-medium flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Session & Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggested prompts and Input Bar docked at bottom */}
      <div className="p-3 pb-24 lg:pb-3 bg-white dark:bg-[#1F1D2B] border-t border-neutral-200 dark:border-neutral-800/60 shrink-0">
        <div className="max-w-4xl mx-auto w-full space-y-3">
          
          {/* Suggested chips */}
          {messages.length <= 1 && !isLoading && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  id={`suggestion-chip-${idx}`}
                  type="button"
                  onClick={() => handleSuggestedClick(sug)}
                  className="px-2.5 py-1 rounded-[16px] bg-neutral-50 dark:bg-[#13111C]/60 border border-neutral-200 dark:border-[#D988A1]/10 hover:border-[#D988A1] dark:hover:border-[#D988A1] text-[10px] text-neutral-600 dark:text-[#9E9AA7] hover:text-[#D988A1] dark:hover:text-[#D988A1] transition-all flex items-center gap-1 font-medium"
                >
                  <HelpCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[120px]">{sug}</span>
                </button>
              ))}
            </div>
          )}

          {/* Form input */}
          <form 
            onSubmit={handleSend} 
            className="flex gap-2 items-center"
          >
            {/* Glassmorphic Microphone Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center transition-all duration-300 border border-white/5 bg-white/5 backdrop-blur-md hover:bg-white/10 ${
                isListening 
                  ? "animate-mic-listening" 
                  : "text-[#D988A1] hover:scale-105 active:scale-95 shadow-md"
              }`}
              title="Voice-to-Insight Mic"
            >
              <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
            </button>

            <input
              type="text"
              id="chat-user-input"
              disabled={isLoading}
              placeholder={isListening ? "Listening to voice input..." : "Ask AARYA..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-neutral-50 dark:bg-[#13111C]/60 border border-neutral-200 dark:border-[#D988A1]/20 focus:border-[#D988A1] focus:ring-1 focus:ring-[#D988A1] dark:focus:border-[#D988A1] rounded-[24px] text-xs text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 outline-none transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              id="chat-send-btn"
              disabled={isLoading || !input.trim()}
              className="px-4 h-9 rounded-[24px] bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white flex items-center justify-center hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-40 shadow-md shadow-[#8A5A7B]/20"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Semantic Memory Search Drawer/Modal */}
      {showMemorySearch && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between bg-[#F4F2F0]/50 dark:bg-[#13111C]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D988A1]/15 text-[#D988A1] flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-1.5">
                    AARYA Strategic Decision Memory (<span className="text-xs font-mono text-[#D988A1]">pgvector</span>)
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    Semantic similarity search over logged founder decisions & embeddings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMemorySearch(false)}
                className="w-7 h-7 rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-400 transition-all"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <form onSubmit={handleSemanticSearch} className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search logged decisions (e.g., 'hire engineers', 'overdue invoices', 'cash flow')"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F4F2F0] dark:bg-[#13111C] border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-[#D988A1] transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-[#D988A1]/20"
                  >
                    {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Search</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-mono px-1">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-[#D988A1]" />
                    <span>Similarity Threshold: {(searchThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0.2, 0.4, 0.6, 0.75].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSearchThreshold(t)}
                        className={`px-2 py-0.5 rounded border transition-all ${
                          searchThreshold === t
                            ? "bg-[#D988A1] border-[#D988A1] text-white font-bold"
                            : "bg-white dark:bg-[#13111C] border-neutral-200 dark:border-neutral-800 text-neutral-500"
                        }`}
                      >
                        {(t * 100).toFixed(0)}%
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              {searchError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-500 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Results List */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">
                  Matches Found ({searchResults.length})
                </h4>

                {searchResults.length === 0 ? (
                  <div className="text-center py-8 bg-[#F4F2F0]/50 dark:bg-[#13111C]/50 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800/80">
                    <Database className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      {isSearching ? "Searching semantic memory..." : "No matching decisions logged yet or similarity threshold not met."}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Try adjusting the similarity threshold or query keywords.
                    </p>
                  </div>
                ) : (
                  searchResults.map((item) => {
                    const matchScore = Math.round((item.similarity ?? 0) * 100);
                    const outcomeColor = 
                      item.founder_decision === "approve" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
                      item.founder_decision === "decline" || item.founder_decision === "reject" ? "bg-red-500/10 text-red-500 border-red-500/30" :
                      item.founder_decision === "discuss" || item.founder_decision === "modify" ? "bg-[#D988A1]/10 text-[#D988A1] border-[#D988A1]/30" :
                      "bg-neutral-500/10 text-neutral-400 border-neutral-500/30";

                    return (
                      <div key={item.id} className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 bg-[#F4F2F0]/40 dark:bg-[#13111C]/60 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#D988A1]/15 text-[#D988A1] border border-[#D988A1]/30">
                            🎯 {matchScore}% Semantic Match
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${outcomeColor}`}>
                            Outcome: {item.founder_decision ? item.founder_decision.toUpperCase() : "PENDING"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                            <span className="font-bold text-neutral-700 dark:text-neutral-300">Context:</span> {item.context || "N/A"}
                          </p>
                          <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium bg-white/60 dark:bg-white/5 p-2.5 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50">
                            {item.ai_recommendation || "No recommendation text saved."}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-neutral-400 font-mono">
                          <span>ID: {item.id}</span>
                          <span>Cosine Similarity: {(item.similarity ?? 0).toFixed(4)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
