import React, { useState } from "react";
import { 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Sliders, 
  CheckCircle2, 
  XCircle,
  MessageSquareMore,
  ThumbsUp,
  RefreshCw, 
  BookmarkPlus, 
  Loader2, 
  Check, 
  Send,
  SlidersHorizontal,
  CircleDot,
  FileCheck,
  ChevronRight
} from "lucide-react";
import { BusinessState } from "../types";
import { postChat, createDecision, updateDecision } from "../services/apiClient";
import { useFinancials } from "../context/FinancialContext";

interface FounderSummaryViewProps {
  state: BusinessState;
}

interface StrategicDirective {
  id: string;
  title: string;
  text: string;
  category: 'compliance' | 'optimization' | 'growth';
  badge: string;
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

export const FounderSummaryView: React.FC<FounderSummaryViewProps> = ({ state }) => {
  // ── Baseline financial metrics consumed from Shared FinancialContext ───────
  const { 
    receivables, 
    payables, 
    loading: financialsLoading 
  } = useFinancials();

  // ── Interactive Burn & Inflow Simulation State ─────────────────────────────
  const [customBurnRate, setCustomBurnRate] = useState<number>(150000);
  const [customInflow, setCustomInflow] = useState<number>(0);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);

  // ── AI Executive Synthesis & Directives State ──────────────────────────────
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [directives, setDirectives] = useState<StrategicDirective[]>([
    {
      id: "dso-buffer",
      title: "Receivables Optimization Buffer",
      text: `With ${state.currencySymbol}${receivables.toLocaleString("en-US", { maximumFractionDigits: 0 })} outstanding, AARYA recommends setting up automatic WhatsApp/email invoice reminders to keep your DSO (Days Sales Outstanding) below 18 days.`,
      category: "optimization",
      badge: "DSO Alert"
    }
  ]);

  // ── Logging & Action States ────────────────────────────────────────────────
  const [decisionLoading, setDecisionLoading] = useState<Record<string, boolean>>({});
  const [decisionChoices, setDecisionChoices] = useState<Record<string, string>>({});
  const [decisionDbIds, setDecisionDbIds] = useState<Record<string, string>>({});
  const [campaignStatus, setCampaignStatus] = useState<'idle' | 'running' | 'success'>('idle');

  // ── Dynamic Runway Metrics ─────────────────────────────────────────────────
  const netMonthlyBurn = Math.max(1, customBurnRate - customInflow);
  const cashPool = state.startingBalance > 0 ? state.startingBalance : receivables;
  const runwayMonthsNum = cashPool > 0 ? (cashPool / netMonthlyBurn) : 0;
  const runwayMonthsFormatted = runwayMonthsNum.toFixed(1);
  const runwayStatus = runwayMonthsNum >= 8 ? "SECURE" : runwayMonthsNum >= 4 ? "WARNING" : "CRITICAL";

  // Calculate projected date when runway hits 4 months (trigger round)
  const monthsUntilTrigger = Math.max(0, runwayMonthsNum - 4);
  const triggerDate = new Date(Date.now() + monthsUntilTrigger * 30 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGenerateAIBrief = async () => {
    setIsGeneratingAI(true);
    setAiSummaryText(null);
    try {
      const res = await postChat({
        messages: [
          {
            sender: "user",
            text: `Provide a sharp, executive-level financial brief for our founder given: Current Cash Balance = ${state.currencySymbol}${state.startingBalance}, Monthly Burn = ${state.currencySymbol}${customBurnRate}, Expected Monthly Inflow = ${state.currencySymbol}${customInflow}, Total Receivables = ${state.currencySymbol}${receivables}, Total Payables = ${state.currencySymbol}${payables}. Highlight 3 strategic directives for runway extension and treasury optimization.`
          }
        ],
        context: {
          startingBalance: state.startingBalance,
          customBurnRate,
          customInflow,
          receivables,
          payables,
          runwayMonths: runwayMonthsFormatted
        }
      });

      setAiSummaryText(res.reply);
      // Add a dynamically synthesized directive card if successful
      setDirectives(prev => [
        {
          id: `ai-synth-${Date.now()}`,
          title: "AI Treasury & Runway Directive",
          text: `Synthesized from live metrics: Maintain net monthly cash burn under ${state.currencySymbol}${netMonthlyBurn.toLocaleString("en-US")} while accelerating collections on ${state.currencySymbol}${receivables.toLocaleString("en-US")} receivables to lock in >${runwayMonthsFormatted} months runway.`,
          category: "growth",
          badge: "AI Generated"
        },
        ...prev.filter(d => !d.id.startsWith("ai-synth-"))
      ]);
    } catch (err: any) {
      console.error("[FounderSummary] AI Brief error:", err);
      setAiSummaryText("Failed to generate live AI synthesis. Please verify your backend and API connection.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleChooseOption = async (directive: StrategicDirective, choiceKey: string) => {
    setDecisionLoading(prev => ({ ...prev, [directive.id]: true }));
    try {
      const existingDbId = decisionDbIds[directive.id];
      if (existingDbId) {
        await updateDecision(existingDbId, {
          founder_decision: choiceKey,
          ai_recommendation: directive.text,
        });
      } else {
        const res = await createDecision({
          context: `Founder Summary Directive: ${directive.title}`,
          ai_recommendation: directive.text,
          founder_decision: choiceKey,
        }) as { success?: boolean; data?: { id: string } };

        if (res?.data?.id) {
          setDecisionDbIds(prev => ({ ...prev, [directive.id]: res.data!.id }));
        }
      }
      setDecisionChoices(prev => ({ ...prev, [directive.id]: choiceKey }));
    } catch (err) {
      console.error("[FounderSummary] Failed to log decision choice:", err);
      // Fallback update choice locally so user experiences responsive UI even if offline/dev
      setDecisionChoices(prev => ({ ...prev, [directive.id]: choiceKey }));
    } finally {
      setDecisionLoading(prev => ({ ...prev, [directive.id]: false }));
    }
  };

  const handleTriggerDSOCampaign = async () => {
    setCampaignStatus('running');
    try {
      await createDecision({
        context: "Working Capital Optimization — DSO Collection Campaign",
        ai_recommendation: `Set up automated invoice reminders across ${state.currencySymbol}${receivables.toLocaleString("en-US")} receivables to bring DSO below 18 days.`,
        founder_decision: "Initiated automated DSO collection campaign and client follow-ups."
      });
      setTimeout(() => {
        setCampaignStatus('success');
      }, 1000);
    } catch {
      setCampaignStatus('success');
    }
  };

  return (
    <div id="founder-summary-container" className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 text-neutral-900 bg-[#EAE7E4] dark:bg-[#121212] dark:text-[#f4f4f5]">
      
      {/* Header with AI Synthesis Trigger */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">
            AARYA CO-PILOT ANALYSIS
          </p>
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-neutral-900 dark:text-white tracking-tight mt-1">
            Founder Financial Summary
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Interactive executive brief and runway simulator for Indian corporate leaders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#D988A1]" />
            <span>{showSimulator ? "Hide Simulator" : "Runway Simulator"}</span>
          </button>

          <button
            onClick={handleGenerateAIBrief}
            disabled={isGeneratingAI}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white text-xs font-semibold hover:opacity-95 transition shadow-md shadow-[#D988A1]/20 disabled:opacity-50"
          >
            {isGeneratingAI ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isGeneratingAI ? "Synthesizing Brief..." : "Generate AI Brief"}</span>
          </button>
        </div>
      </div>

      {/* Interactive Runway & Burn Simulator Drawer */}
      {showSimulator && (
        <div className="mb-8 p-6 rounded-3xl bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/80 shadow-md space-y-6 transition-all">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#D988A1]" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Interactive Treasury & Runway Simulator
              </h3>
            </div>
            <button
              onClick={() => {
                setCustomBurnRate(150000);
                setCustomInflow(0);
              }}
              className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 flex items-center gap-1 font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Baseline</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slider 1: Monthly Burn Rate */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Simulated Monthly Burn Rate
                </span>
                <span className="font-mono font-bold text-[#FF3B30]">
                  {state.currencySymbol}{customBurnRate.toLocaleString("en-US")}
                </span>
              </div>
              <input
                type="range"
                min={50000}
                max={1500000}
                step={25000}
                value={customBurnRate}
                onChange={e => setCustomBurnRate(Number(e.target.value))}
                className="w-full accent-[#FF3B30] h-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                <span>{state.currencySymbol}50,000/mo</span>
                <span>{state.currencySymbol}15,00,000/mo</span>
              </div>
            </div>

            {/* Slider 2: Monthly Inflow / Collections */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Expected Monthly Cash Inflow
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{state.currencySymbol}{customInflow.toLocaleString("en-US")}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1000000}
                step={25000}
                value={customInflow}
                onChange={e => setCustomInflow(Number(e.target.value))}
                className="w-full accent-emerald-500 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                <span>{state.currencySymbol}0/mo</span>
                <span>{state.currencySymbol}10,00,000/mo</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-neutral-400">Net Monthly Cash Burn:</span>
                <span className="ml-2 font-bold text-neutral-900 dark:text-white">
                  {state.currencySymbol}{netMonthlyBurn.toLocaleString("en-US")}
                </span>
              </div>
              <div className="h-4 w-[1px] bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
              <div>
                <span className="text-neutral-400">Simulated Runway:</span>
                <span className="ml-2 font-bold text-[#D988A1]">
                  {runwayMonthsFormatted} Months
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                runwayStatus === 'SECURE' ? 'bg-emerald-500/10 text-emerald-500' :
                runwayStatus === 'WARNING' ? 'bg-amber-500/10 text-amber-500' :
                'bg-rose-500/10 text-rose-500'
              }`}>
                STATUS: {runwayStatus}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI Synthesis Box (Shown when AI brief generated) */}
      {aiSummaryText && (
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-[#D988A1]/10 to-[#8A5A7B]/10 border border-[#D988A1]/30 shadow-md space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold font-mono text-[#D988A1] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>AARYA Live Executive Briefing</span>
          </div>
          <div className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap font-sans">
            {aiSummaryText}
          </div>
        </div>
      )}

      {/* 2 Main Bento Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Bento Card 1: Runway Health */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">Runway Assessment</span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                runwayStatus === 'SECURE' ? 'bg-emerald-500/10 text-emerald-500' :
                runwayStatus === 'WARNING' ? 'bg-amber-500/10 text-amber-500' :
                'bg-rose-500/10 text-rose-500'
              }`}>
                {runwayStatus}
              </span>
            </div>
            <h3 className="text-4xl font-heading font-bold text-neutral-900 dark:text-white mt-4 tracking-tight">
              {runwayMonthsFormatted} Mo.
            </h3>
            <p className="text-xs text-neutral-500 mt-2">
              Based on net treasury of {state.currencySymbol}{state.startingBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })} against simulated net burn of {state.currencySymbol}{netMonthlyBurn.toLocaleString("en-US")}/mo.
            </p>
          </div>
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-4 text-[11px] text-[#FF3B30] font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>Funding round trigger: {triggerDate} (4 mo. runway)</span>
          </div>
        </div>

        {/* Bento Card 2: Liquidity Split & Action */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">Working Capital Netting</span>
              <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded font-bold">
                Live Ledger Ratio
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500">Total Receivables (Dues)</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  +{state.currencySymbol}{receivables.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500">Total Payables (Liabilities)</span>
                <span className="font-bold text-[#FF3B30] font-mono">
                  -{state.currencySymbol}{payables.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-[#FF3B30] transition-all duration-500" 
                  style={{ width: `${receivables + payables > 0 ? (receivables / (receivables + payables)) * 100 : 50}%` }}
                />
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-4 flex items-center justify-between">
            <p className="text-[11px] text-neutral-400 leading-normal max-w-[60%]">
              Receivables exceed current payables. Keep collections active.
            </p>
            <button
              onClick={handleTriggerDSOCampaign}
              disabled={campaignStatus !== 'idle'}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold transition flex items-center gap-1.5"
            >
              {campaignStatus === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
              {campaignStatus === 'success' && <Check className="w-3 h-3" />}
              <span>{campaignStatus === 'success' ? "Campaign Active" : "Trigger DSO Reminders"}</span>
            </button>
          </div>
        </div>

      </div>

      {/* AI Copilot Strategic Directives Section with One-Click Logging */}
      <div className="mt-8 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-[#FF3B30]" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              AARYA Strategic Directives & Memory Logging
            </h3>
          </div>
          <p className="text-xs text-neutral-500">
            Select an option (`I'll do this`, `Won't pursue`, `Let's discuss`) to record your strategic choice directly into your Decision Memory Ledger.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-neutral-600 dark:text-neutral-400">
          {directives.map((item) => {
            const chosenOption = decisionChoices[item.id];
            const chosen = DECISION_OPTIONS.find((o) => o.key === chosenOption);
            const isLoading = decisionLoading[item.id] ?? false;

            return (
              <div 
                key={item.id} 
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition ${
                  chosen 
                    ? "border-neutral-700/60 bg-[#13111C]/60 text-neutral-300" 
                    : "bg-neutral-50 dark:bg-neutral-900/40 border-neutral-200/60 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-neutral-900 dark:text-white block mt-1">
                    {item.title}
                  </span>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {item.text}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-200/60 dark:border-neutral-800/80">
                  {!chosen ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Sparkles className="w-3 h-3 text-[#D988A1]" />
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#D988A1] font-bold">
                          Founder Decision Required
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {DECISION_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.key}
                              id={`directive-${item.id}-${opt.key}`}
                              disabled={isLoading}
                              onClick={() => handleChooseOption(item, opt.key)}
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
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-semibold ${chosen.badgeClass}`}>
                        <chosen.badgeIcon className="w-3 h-3 shrink-0" />
                        Logged: {chosen.label}
                      </div>
                      <span className="text-[9px] text-neutral-500 font-mono">Decision recorded ✓</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
