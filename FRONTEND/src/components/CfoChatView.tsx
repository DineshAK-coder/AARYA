import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, HelpCircle, Loader2, Mic } from "lucide-react";
import { BusinessState } from "../types";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { supabase } from "../services/apiClient";

interface CfoChatProps {
  state: BusinessState;
  currencySymbol: string;
  preseededPrompt?: string | null;
  clearPreseededPrompt?: () => void;
}

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

  // Initialize Vercel AI SDK useChat hook pointing to the backend stream endpoint
  const {
    messages,
    sendMessage,
    status,
    setMessages,
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
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D988A1] to-[#8A5A7B] flex items-center justify-center text-white shadow-md shadow-[#D988A1]/20">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xs tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
              Ask AARYA <span className="text-[8px] bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">COPILOT</span>
            </h2>
            <p className="text-[10px] text-neutral-500 dark:text-[#9E9AA7] font-mono">
              Indian Startup FinGPT &bull; Gemini
            </p>
          </div>
        </div>

        <button
          id="clear-chat-btn"
          onClick={handleClear}
          className="text-[9px] text-neutral-500 dark:text-[#9E9AA7] hover:text-white dark:hover:text-white hover:bg-red-500/10 dark:hover:bg-[#8A5A7B]/20 font-mono uppercase tracking-wider bg-white dark:bg-[#13111C] border border-neutral-200 dark:border-neutral-800/60 px-2.5 py-1 rounded-[12px] transition-all"
        >
          Reset
        </button>
      </div>

      {/* Message body list */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 scroll-smooth"
      >
        <div className="max-w-4xl mx-auto w-full space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
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
                    {msg.parts?.map((part, idx) => {
                      if (part.type === "text") {
                        return <span key={idx}>{part.text}</span>;
                      }
                      return null;
                    })}
                  </div>
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
    </div>
  );
};
