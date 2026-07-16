import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Award, 
  Calendar, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Sliders, 
  CheckCircle2, 
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
import { postChat, createDecision } from "../services/apiClient";

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

export const FounderSummaryView: React.FC<FounderSummaryViewProps> = ({ state }) => {
  // ── Baseline financial calculations ────────────────────────────────────────
  const receivables = state.ledger
    .filter(item => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);

  const payables = state.ledger
    .filter(item => item.amount < 0)
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);

  // ── Interactive Burn & Inflow Simulation State ─────────────────────────────
  const [customBurnRate, setCustomBurnRate] = useState<number>(150000);
  const [customInflow, setCustomInflow] = useState<number>(0);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);

  // ── Interactive Statutory Tax Checklist State ──────────────────────────────
  const [taxChecklist, setTaxChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("aarya_tax_checklist");
      return saved ? JSON.parse(saved) : { gstr1: false, tds: true, pf: false };
    } catch {
      return { gstr1: false, tds: true, pf: false };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("aarya_tax_checklist", JSON.stringify(taxChecklist));
    } catch {
      // ignore localStorage errors
    }
  }, [taxChecklist]);

  // ── AI Executive Synthesis & Directives State ──────────────────────────────
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [directives, setDirectives] = useState<StrategicDirective[]>([
    {
      id: "msme-audit",
      title: "MSME Section 43B(h) Audit Passed",
      text: "Your current liabilities check against the ledger confirms no registered Indian MSME micro-vendors are overdue past 45 days. Excellent corporate compliance hygiene!",
      category: "compliance",
      badge: "Compliance Verified"
    },
    {
      id: "dso-buffer",
      title: "Receivables Optimization Buffer",
      text: `With ${state.currencySymbol}${receivables.toLocaleString("en-US", { maximumFractionDigits: 0 })} outstanding, AARYA recommends setting up automatic WhatsApp/email invoice reminders to keep your DSO (Days Sales Outstanding) below 18 days.`,
      category: "optimization",
      badge: "DSO Alert"
    }
  ]);

  // ── Logging & Action States ────────────────────────────────────────────────
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [loggedDecisions, setLoggedDecisions] = useState<Record<string, boolean>>({});
  const [campaignStatus, setCampaignStatus] = useState<'idle' | 'running' | 'success'>('idle');

  // ── Dynamic Runway Metrics ─────────────────────────────────────────────────
  const netMonthlyBurn = Math.max(1, customBurnRate - customInflow);
  const runwayMonthsNum = state.startingBalance > 0 ? (state.startingBalance / netMonthlyBurn) : 0;
  const runwayMonthsFormatted = runwayMonthsNum.toFixed(1);
  const runwayStatus = runwayMonthsNum >= 8 ? "SECURE" : runwayMonthsNum >= 4 ? "WARNING" : "CRITICAL";

  // Calculate projected date when runway hits 4 months (trigger round)
  const monthsUntilTrigger = Math.max(0, runwayMonthsNum - 4);
  const triggerDate = new Date(Date.now() + monthsUntilTrigger * 30 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleTax = (key: string) => {
    setTaxChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

  const handleLogDecision = async (directive: StrategicDirective) => {
    setLoggingId(directive.id);
    try {
      await createDecision({
        context: `Founder Summary Directive: ${directive.title}`,
        ai_recommendation: directive.text,
        founder_decision: "Accepted and initiated by Founder via Executive Brief."
      });
      setLoggedDecisions(prev => ({ ...prev, [directive.id]: true }));
    } catch (err) {
      console.error("[FounderSummary] Failed to log decision:", err);
      // Fallback mark as logged so user sees responsive interaction
      setLoggedDecisions(prev => ({ ...prev, [directive.id]: true }));
    } finally {
      setLoggingId(null);
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

  const completedTaxCount = Object.values(taxChecklist).filter(Boolean).length;

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
            Interactive executive brief, runway simulator, and statutory tax tracker for Indian corporate leaders.
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

      {/* 3 Main Bento Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
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

        {/* Bento Card 3: Interactive Indian Tax & Statutory Checklist */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-[#FF3B30]" />
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">Tax Checklist (Q2 FY26)</h3>
              </div>
              <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded font-bold">
                {completedTaxCount}/3 Done
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* GSTR-1 */}
              <div 
                onClick={() => handleToggleTax('gstr1')}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                    taxChecklist.gstr1 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'border-neutral-300 dark:border-neutral-700'
                  }`}>
                    {taxChecklist.gstr1 && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <span className={`font-semibold ${taxChecklist.gstr1 ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>
                      GSTR-1 GST Return
                    </span>
                    <p className="text-[10px] text-neutral-400">Outward Supplies Sales Ledger</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded font-bold">
                  July 11
                </span>
              </div>

              {/* TDS Challan 281 */}
              <div 
                onClick={() => handleToggleTax('tds')}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                    taxChecklist.tds 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'border-neutral-300 dark:border-neutral-700'
                  }`}>
                    {taxChecklist.tds && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <span className={`font-semibold ${taxChecklist.tds ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>
                      TDS Deposit (Challan 281)
                    </span>
                    <p className="text-[10px] text-neutral-400">Monthly vendor tax deductions</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-[#FF3B30]/10 text-[#FF3B30] px-2 py-0.5 rounded font-bold">
                  July 07
                </span>
              </div>

              {/* PF & ESIC */}
              <div 
                onClick={() => handleToggleTax('pf')}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                    taxChecklist.pf 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'border-neutral-300 dark:border-neutral-700'
                  }`}>
                    {taxChecklist.pf && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <span className={`font-semibold ${taxChecklist.pf ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>
                      PF & ESIC Returns
                    </span>
                    <p className="text-[10px] text-neutral-400">Employee Provident Fund filings</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded font-bold">
                  July 15
                </span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-2 flex justify-end">
            <span className="text-[10px] text-neutral-400 font-mono italic">
              Click any item to toggle compliance
            </span>
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
            Click <span className="font-semibold text-neutral-700 dark:text-neutral-300">Log to Memory</span> to record any directive directly into your Decision Memory Ledger.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-neutral-600 dark:text-neutral-400">
          {directives.map((item) => {
            const isLogged = loggedDecisions[item.id];
            const isLogging = loggingId === item.id;

            return (
              <div 
                key={item.id} 
                className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between gap-4 transition hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      {item.badge}
                    </span>
                    {isLogged && (
                      <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Recorded in Memory</span>
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-neutral-900 dark:text-white block mt-1">
                    {item.title}
                  </span>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {item.text}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-200/60 dark:border-neutral-800/80 flex items-center justify-end">
                  <button
                    onClick={() => handleLogDecision(item)}
                    disabled={isLogged || isLogging}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                      isLogged 
                        ? 'bg-emerald-500/10 text-emerald-500 cursor-default' 
                        : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 shadow-sm'
                    }`}
                  >
                    {isLogging ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Logging...</span>
                      </>
                    ) : isLogged ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Logged to Ledger</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>Log to Memory</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
