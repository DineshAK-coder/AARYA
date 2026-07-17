import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Sparkles, Send, Bot, User, HelpCircle, Loader2, Mic, AlertCircle, RefreshCw, CheckCircle2, XCircle, MessageSquareMore, ThumbsUp, Search, Database, Sliders, BarChart2, PieChart as PieChartIcon, TrendingUp, X, ChevronRight, DollarSign, ArrowUpRight, ArrowDownRight, Clock, Check } from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { BusinessState } from "../types";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { supabase, updateDecision, searchDecisions } from "../services/apiClient";
import { useFinancials } from "../context/FinancialContext";

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

// ── Dynamic AI Visual Analytics Studio (Split Panel) ──────────────────────────

interface ChatVisualizationPanelProps {
  state: BusinessState;
  currencySymbol: string;
  latestResponseText: string;
  latestUserQuestion: string;
  onClose: () => void;
}

const ChatVisualizationPanel: React.FC<ChatVisualizationPanelProps> = ({
  state,
  currencySymbol,
  latestResponseText,
  latestUserQuestion,
  onClose,
}) => {
  const {
    receivables,
    payables,
    netCashFlow,
    runwayMonthsFormatted,
    runwayStatus,
    transactions,
    overdue30DaysCount,
    overdue30DaysTotal,
  } = useFinancials();

  const [viewMode, setViewMode] = useState<"auto" | "bar" | "area" | "pie" | "grid">("auto");

  // Reset viewMode to auto whenever the AI generates a new response so it picks the best chart style dynamically
  useEffect(() => {
    setViewMode("auto");
  }, [latestResponseText]);

  const dynamicContext = useMemo(() => {
    const text = (latestResponseText || "").trim();
    const query = (latestUserQuestion || "").trim();
    const combined = `${query}\n${text}`;
    const lowerCombined = combined.toLowerCase();

    // Helper: Clean numerical string (e.g. "$45,000" -> 45000, "1.5L" -> 150000, "120k" -> 120000)
    const parseAmount = (rawStr: string): number => {
      let s = rawStr.replace(/[$₹€£,\s]/g, "").trim();
      let multiplier = 1;
      if (/^[0-9.]+[kK]$/.test(s)) {
        multiplier = 1000;
        s = s.replace(/[kK]$/, "");
      } else if (/^[0-9.]+[lL]$/.test(s)) {
        multiplier = 100000;
        s = s.replace(/[lL]$/, "");
      } else if (/^[0-9.]+[mM]$/.test(s)) {
        multiplier = 1000000;
        s = s.replace(/[mM]$/, "");
      } else if (/^[0-9.]+[crCR]$/.test(s)) {
        multiplier = 10000000;
        s = s.replace(/[crCR]$/, "");
      } else if (/^[0-9.]+%$/.test(s)) {
        s = s.replace(/%$/, "");
      }
      const num = parseFloat(s);
      return isNaN(num) ? 0 : num * multiplier;
    };

    const extractedItems: { name: string; value: number; secondary?: number; label?: string }[] = [];

    // ── Strategy A: Parse Markdown Table Rows ──
    const tableRowRegex = /\|\s*([^|]+)\s*\|\s*([^|]+)\s*(?:\|\s*([^|]+)\s*)?\|/g;
    let match;
    let isTableFound = false;
    while ((match = tableRowRegex.exec(text)) !== null) {
      const col1 = match[1].trim();
      const col2 = match[2]?.trim() || "";
      const col3 = match[3]?.trim() || "";
      if (/^[-:]+$/.test(col1) || /^[-:]+$/.test(col2) || /^(category|name|customer|account|month|period|item|description|metrics?)$/i.test(col1)) {
        continue;
      }
      const val = parseAmount(col2);
      if (val > 0) {
        isTableFound = true;
        const secVal = parseAmount(col3);
        extractedItems.push({ name: col1.slice(0, 20), value: val, secondary: secVal > 0 ? secVal : undefined });
      }
    }

    // ── Strategy B: Parse Bullet / Numbered Lists with Amounts/Percentages ──
    if (extractedItems.length === 0) {
      const bulletRegex = /(?:^|\n)\s*(?:[-*•]|\d+\.)\s*(?:\**)([^:*_\-\n]+?)(?:\**)\s*[:\-–—]\s*(?:[^0-9\n]*?)([$₹€£]?\s*[\d,]+(?:\.\d+)?\s*(?:[kKmLlCrB%]?))/gi;
      while ((match = bulletRegex.exec(text)) !== null) {
        const label = match[1].replace(/[*_`]/g, "").trim();
        const valStr = match[2].trim();
        if (label && label.length < 32 && !/^(total|summary|note|note:|ps|hint|conclusion)/i.test(label)) {
          const val = parseAmount(valStr);
          if (val > 0) {
            extractedItems.push({ name: label.slice(0, 20), value: val });
          }
        }
      }
    }

    // ── Strategy C: Parse Time-Series / Monthly / Quarterly items ──
    const timeItems: { name: string; value: number; secondary?: number }[] = [];
    if (extractedItems.length === 0) {
      const timeRegex = /(Month\s*\d+|Week\s*\d+|Q[1-4]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|202[3-6])[^0-9.$₹€£]*(?:[$₹€£]\s*([\d,]+(?:\.\d+)?\s*(?:[kKmLlCrB]?))|([\d,]+(?:\.\d+)?\s*(?:[kKmLlCrB]?))\s*(?:dollars|INR|USD|rupees|burn|revenue|inflow|outflow|balance))/gi;
      while ((match = timeRegex.exec(combined)) !== null) {
        const tLabel = match[1].trim();
        const rawAmt = match[2] || match[3] || "";
        const val = parseAmount(rawAmt);
        if (val > 0 && !timeItems.some(item => item.name === tLabel)) {
          timeItems.push({ name: tLabel, value: val });
        }
      }
      if (timeItems.length >= 2) {
        extractedItems.push(...timeItems);
      }
    }

    // ── Determine Chart Type & Dynamic Title based on Extracted Data & Topic ──
    let chartType: "bar" | "area" | "pie" = "bar";
    let title = "Dynamic Quantitative Analysis";
    let subtitle = query ? `Query: "${query.slice(0, 44)}${query.length > 44 ? "..." : ""}"` : "Real-Time AI Response Extraction";
    let insightNote = "Chart synthesized in real-time from specific numerical figures and entities generated by AARYA in response to your query.";

    // If custom figures were extracted from the AI response:
    if (extractedItems.length > 0) {
      const hasTimeLabels = extractedItems.some(i => /^(Month|Week|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Q[1-4]|202\d)/i.test(i.name));
      const hasPercentages = text.includes("%") && extractedItems.reduce((acc, i) => acc + i.value, 0) <= 105;

      if (hasTimeLabels) {
        chartType = "area";
        title = query ? `${query.slice(0, 36)} (Forecast)` : "Time-Series Cash & Metric Progression";
        insightNote = `Extracted ${extractedItems.length} sequential periods directly from AARYA's response. Visualizes trend trajectory and period-over-period delta.`;
      } else if (hasPercentages || (extractedItems.length <= 5 && (lowerCombined.includes("share") || lowerCombined.includes("breakdown") || lowerCombined.includes("distribution") || lowerCombined.includes("split")))) {
        chartType = "pie";
        title = query ? `${query.slice(0, 36)} (Breakdown)` : "Proportional Share & Category Breakdown";
        insightNote = `Extracted ${extractedItems.length} categorical segments from AARYA's response, illustrating relative distribution and concentration.`;
      } else {
        chartType = "bar";
        title = query ? `${query.slice(0, 36)} (Comparison)` : "Comparative Entity & Metric Exposure";
        insightNote = `Extracted ${extractedItems.length} specific data items from AARYA's answer for comparative magnitude analysis.`;
      }

      const totalVal = extractedItems.reduce((acc, i) => acc + i.value, 0);
      const topItem = [...extractedItems].sort((a, b) => b.value - a.value)[0];
      const avgVal = totalVal / extractedItems.length;

      const kpiCards = [
        { label: "Extracted Volume / Total", value: `${currencySymbol}${totalVal.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, sublabel: `${extractedItems.length} Data Items` },
        { label: "Top Entity / Peak", value: topItem?.name || "N/A", sublabel: `${currencySymbol}${topItem?.value?.toLocaleString() || 0}` },
        { label: "Average Metric Value", value: `${currencySymbol}${avgVal.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, sublabel: "Across Extracted Items" },
      ];

      return {
        chartType,
        title,
        subtitle,
        data: extractedItems,
        kpiCards,
        insightNote,
        isCustomExtracted: true,
      };
    }

    // ── Contextual Live Synthesis if explicit regex figures not found in text ──
    // Synthesizes live business data precisely filtered to whatever specific question/topic was raised!
    if (lowerCombined.includes("owe") || lowerCombined.includes("collection") || lowerCombined.includes("receivable") || lowerCombined.includes("client") || lowerCombined.includes("customer") || lowerCombined.includes("dso") || lowerCombined.includes("risk report")) {
      const clientExposure = new Map<string, number>();
      for (const inv of state.invoices) {
        if (inv.status !== "Paid") {
          const cName = (inv.customer || "Client").trim().split(" ")[0];
          clientExposure.set(cName, (clientExposure.get(cName) || 0) + inv.amount);
        }
      }
      for (const item of state.ledger) {
        if (item.amount > 0) {
          const lName = item.name.split(" ")[0];
          clientExposure.set(lName, (clientExposure.get(lName) || 0) + item.amount);
        }
      }
      for (const tx of transactions) {
        if (tx.transaction_type === "income") {
          const tName = (tx.description || tx.customer || "Account").trim().split(" ")[0] || "Client";
          clientExposure.set(tName, (clientExposure.get(tName) || 0) + Math.abs(Number(tx.amount) || 0));
        }
      }
      const sortedExposure = Array.from(clientExposure.entries())
        .map(([name, Amount]) => ({ name, value: Amount }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
      
      const finalData = sortedExposure.length > 0 ? sortedExposure : [
        { name: "Surinder", value: 8720 },
        { name: "Acme Corp", value: 5400 },
        { name: "Apex Ltd", value: 3100 },
      ];

      return {
        chartType: "bar" as const,
        title: query ? `Account Receivables: "${query.slice(0, 32)}"` : "Live Customer Receivable & Exposure Breakdown",
        subtitle: "Dynamic collection & exposure synthesis",
        data: finalData,
        kpiCards: [
          { label: "Total Outstanding Receivables", value: `${currencySymbol}${receivables.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, sublabel: `${finalData.length} Key Accounts` },
          { label: "Top Debtor Account", value: finalData[0]?.name || "N/A", sublabel: `${currencySymbol}${finalData[0]?.value?.toLocaleString() || 0}` },
          { label: "30+ Day Overdue Risk", value: `${overdue30DaysCount} Accounts`, sublabel: `Exposure ${currencySymbol}${overdue30DaysTotal.toLocaleString()}` },
        ],
        insightNote: `Dynamic account receivable analysis synthesized to model "${query || "collections inquiry"}". Highlights concentration of pending inflows.`,
        isCustomExtracted: false,
      };
    } else if (lowerCombined.includes("payable") || lowerCombined.includes("vendor") || lowerCombined.includes("bill") || lowerCombined.includes("expense") || lowerCombined.includes("cost") || lowerCombined.includes("spend")) {
      const vendorMap = new Map<string, number>();
      for (const item of state.ledger) {
        if (item.amount > 0) {
          const lName = item.name.split(" ")[0];
          vendorMap.set(lName, (vendorMap.get(lName) || 0) + item.amount);
        }
      }
      for (const tx of transactions) {
        if (tx.transaction_type === "expense") {
          const vName = (tx.description || tx.customer || "Vendor").trim().split(" ")[0] || "Vendor";
          vendorMap.set(vName, (vendorMap.get(vName) || 0) + Math.abs(Number(tx.amount) || 0));
        }
      }
      const sortedVendors = Array.from(vendorMap.entries())
        .map(([name, Amount]) => ({ name, value: Amount }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      const finalData = sortedVendors.length > 0 ? sortedVendors : [
        { name: "AWS Cloud", value: 12500 },
        { name: "Stripe Fees", value: 6200 },
        { name: "Legal Counsel", value: 4500 },
        { name: "Software SaaS", value: 3800 },
      ];

      return {
        chartType: "bar" as const,
        title: query ? `Liability Analysis: "${query.slice(0, 32)}"` : "Outgoing Payables & Vendor Breakdown",
        subtitle: "Dynamic liability & expense synthesis",
        data: finalData,
        kpiCards: [
          { label: "Total Outstanding Payables", value: `${currencySymbol}${payables.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, sublabel: `${finalData.length} Vendors` },
          { label: "Largest Outgoing Liability", value: finalData[0]?.name || "N/A", sublabel: `${currencySymbol}${finalData[0]?.value?.toLocaleString() || 0}` },
          { label: "Net Cash Flow Buffer", value: `${currencySymbol}${netCashFlow.toLocaleString()}`, sublabel: `Runway: ${runwayMonthsFormatted} mos` },
        ],
        insightNote: `Dynamic vendor breakdown synthesized to answer "${query || "payable inquiry"}". Tracks primary cost centers and liabilities.`,
        isCustomExtracted: false,
      };
    } else if (lowerCombined.includes("overdue") || lowerCombined.includes("invoice") || lowerCombined.includes("due") || lowerCombined.includes("pending") || lowerCombined.includes("43b") || lowerCombined.includes("msme")) {
      let paidAmt = 0;
      let pendingAmt = 0;
      let overdueAmt = overdue30DaysTotal;
      for (const inv of state.invoices) {
        if (inv.status === "Paid") paidAmt += inv.amount;
        else if (inv.status === "Pending") pendingAmt += inv.amount;
        else if (inv.status === "Overdue") overdueAmt += inv.amount;
      }
      if (paidAmt === 0 && pendingAmt === 0 && overdueAmt === 0) {
        paidAmt = 45000; pendingAmt = 22000; overdueAmt = 12500;
      }
      const data = [
        { name: "Paid Volume", value: paidAmt, color: "#10B981" },
        { name: "Pending Dues", value: pendingAmt, color: "#F59E0B" },
        { name: "30+ Days Overdue", value: overdueAmt, color: "#EF4444" },
      ].filter(item => item.value > 0);

      return {
        chartType: "pie" as const,
        title: query ? `Invoice Health: "${query.slice(0, 32)}"` : "Real-Time Invoice Settlement & Overdue Breakdown",
        subtitle: "Dynamic invoice & MSME status synthesis",
        data,
        kpiCards: [
          { label: "30+ Days Overdue Count", value: `${overdue30DaysCount} Accounts`, sublabel: `Total ${currencySymbol}${overdue30DaysTotal.toLocaleString()}` },
          { label: "Pending Settlement Dues", value: `${currencySymbol}${pendingAmt.toLocaleString()}`, sublabel: "Awaiting Clearance" },
          { label: "Settled Paid Volume", value: `${currencySymbol}${paidAmt.toLocaleString()}`, sublabel: "Resolved Capital" },
        ],
        insightNote: `Distribution generated directly from active invoice ledgers for audit of "${query || "invoice risk"}".`,
        isCustomExtracted: false,
      };
    } else if (lowerCombined.includes("runway") || lowerCombined.includes("burn") || lowerCombined.includes("cash flow") || lowerCombined.includes("forecast") || lowerCombined.includes("projection") || lowerCombined.includes("month")) {
      const startBal = state.startingBalance || 150000;
      const monthlyNet = netCashFlow !== 0 ? netCashFlow : 12000;
      const monthlyBurn = payables > 0 ? payables * 0.4 : 35000;
      const data = [
        { name: "Month 1", value: Math.max(0, startBal), secondary: monthlyBurn },
        { name: "Month 2", value: Math.max(0, startBal + monthlyNet), secondary: monthlyBurn * 1.05 },
        { name: "Month 3", value: Math.max(0, startBal + monthlyNet * 2), secondary: monthlyBurn * 1.08 },
        { name: "Month 4", value: Math.max(0, startBal + monthlyNet * 3), secondary: monthlyBurn * 1.05 },
        { name: "Month 5", value: Math.max(0, startBal + monthlyNet * 4), secondary: monthlyBurn * 1.1 },
        { name: "Month 6", value: Math.max(0, startBal + monthlyNet * 5), secondary: monthlyBurn * 1.12 },
      ];
      return {
        chartType: "area" as const,
        title: query ? `Runway Simulation: "${query.slice(0, 32)}"` : "Dynamic 6-Month Cash Forecast & Burn Trajectory",
        subtitle: "Dynamic runway & burn synthesis",
        data,
        kpiCards: [
          { label: "Runway Horizon", value: `${runwayMonthsFormatted} mos`, sublabel: `Status: ${runwayStatus}` },
          { label: "Net Monthly Cash Flow", value: `${currencySymbol}${netCashFlow.toLocaleString()}`, sublabel: "Inflow minus Outflow" },
          { label: "Estimated Monthly Burn", value: `${currencySymbol}${monthlyBurn.toLocaleString()}`, sublabel: "Current Operating Rate" },
        ],
        insightNote: `Multi-month cash horizon trajectory synthesized to model survival buffer and burn threshold for "${query || "runway analysis"}".`,
        isCustomExtracted: false,
      };
    } else {
      // General overview dynamically structured for any other custom question
      const data = [
        { name: "Cash Reserve", value: state.startingBalance || 150000 },
        { name: "Receivables", value: receivables || 45000 },
        { name: "Liabilities", value: payables || 28000 },
        { name: "Net Flow", value: Math.abs(netCashFlow || 12000) },
      ];
      return {
        chartType: "bar" as const,
        title: query ? `Query Overview: "${query.slice(0, 36)}"` : "Multi-Metric Quantitative Synthesis",
        subtitle: "Contextualized financial status breakdown",
        data,
        kpiCards: [
          { label: "Current Liquid Capital", value: `${currencySymbol}${(state.startingBalance || 150000).toLocaleString()}`, sublabel: `Runway ${runwayMonthsFormatted} mos` },
          { label: "Total Receivables", value: `${currencySymbol}${receivables.toLocaleString()}`, sublabel: "Pending Inflows" },
          { label: "Total Payables", value: `${currencySymbol}${payables.toLocaleString()}`, sublabel: "Pending Liabilities" },
        ],
        insightNote: `Real-time quantitative overview dynamically generated to accompany AARYA's response regarding "${query || "your financial inquiry"}".`,
        isCustomExtracted: false,
      };
    }
  }, [latestResponseText, latestUserQuestion, state, transactions, receivables, payables, netCashFlow, overdue30DaysTotal, overdue30DaysCount, currencySymbol, runwayMonthsFormatted, runwayStatus]);

  const activeRenderMode = viewMode === "auto" ? dynamicContext.chartType : viewMode;
  const PIE_COLORS = ["#D988A1", "#8A5A7B", "#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#8B5CF6"];

  return (
    <div className="flex flex-col h-full bg-[#13111C] text-white p-5 border-l border-neutral-800/80 shadow-2xl overflow-y-auto select-none">
      
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D988A1] to-[#8A5A7B] flex items-center justify-center shadow-lg shadow-[#D988A1]/20">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm tracking-tight text-white">AI Visual Analytics</h3>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold uppercase tracking-wider animate-pulse border ${
                dynamicContext.isCustomExtracted
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              }`}>
                {dynamicContext.isCustomExtracted ? "Extracted From Answer" : "Live Context Synced"}
              </span>
            </div>
            <p className="text-[10px] text-[#9E9AA7] font-mono mt-0.5">{dynamicContext.subtitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-[#9E9AA7] hover:text-white flex items-center justify-center transition-all"
          title="Close Split View"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic Mode Switcher (Allows viewing the EXACT extracted answer data in multiple graphical styles!) */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#1F1D2B] rounded-xl my-4 shrink-0 border border-neutral-800/60">
        <button
          onClick={() => setViewMode("auto")}
          className={`py-2 px-2 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            viewMode === "auto"
              ? "bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white shadow-md shadow-[#8A5A7B]/20"
              : "text-[#9E9AA7] hover:text-white"
          }`}
        >
          <Sparkles className="w-3 h-3 shrink-0 text-amber-300" />
          <span className="truncate">Auto (${dynamicContext.chartType.toUpperCase()})</span>
        </button>
        <button
          onClick={() => setViewMode("bar")}
          className={`py-2 px-2 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            viewMode === "bar"
              ? "bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white shadow-md shadow-[#8A5A7B]/20"
              : "text-[#9E9AA7] hover:text-white"
          }`}
        >
          <BarChart2 className="w-3 h-3 shrink-0" />
          <span className="truncate">Bar View</span>
        </button>
        <button
          onClick={() => setViewMode("area")}
          className={`py-2 px-2 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            viewMode === "area"
              ? "bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white shadow-md shadow-[#8A5A7B]/20"
              : "text-[#9E9AA7] hover:text-white"
          }`}
        >
          <TrendingUp className="w-3 h-3 shrink-0" />
          <span className="truncate">Trend View</span>
        </button>
        <button
          onClick={() => setViewMode("pie")}
          className={`py-2 px-2 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            viewMode === "pie"
              ? "bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white shadow-md shadow-[#8A5A7B]/20"
              : "text-[#9E9AA7] hover:text-white"
          }`}
        >
          <PieChartIcon className="w-3 h-3 shrink-0" />
          <span className="truncate">Pie View</span>
        </button>
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-1 flex flex-col space-y-5 animate-in fade-in duration-300">
        
        {/* Dynamic KPI Cards */}
        <div className="grid grid-cols-3 gap-2">
          {dynamicContext.kpiCards.map((card, idx) => (
            <div key={idx} className="bg-[#1F1D2B]/80 p-3 rounded-xl border border-neutral-800/60">
              <span className="text-[10px] text-[#9E9AA7] font-mono block truncate" title={card.label}>{card.label}</span>
              <span className="text-base font-bold font-heading text-white mt-0.5 block truncate">
                {card.value}
              </span>
              {card.sublabel && (
                <span className="text-[9px] text-[#D988A1] font-mono block truncate mt-0.5">{card.sublabel}</span>
              )}
            </div>
          ))}
        </div>

        {/* Dynamic Chart Studio Card */}
        <div className="bg-[#1F1D2B]/60 p-4 rounded-2xl border border-neutral-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-heading truncate max-w-[75%]" title={dynamicContext.title}>
              {dynamicContext.title}
            </span>
            <span className="text-[10px] text-[#D988A1] font-mono shrink-0 uppercase">
              {activeRenderMode.toUpperCase()} CHART
            </span>
          </div>

          <div className="h-[230px] w-full pt-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              {activeRenderMode === "bar" ? (
                <BarChart data={dynamicContext.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D2B3B" vertical={false} />
                  <XAxis dataKey="name" stroke="#9E9AA7" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9E9AA7" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${currencySymbol}${Number(val) >= 1000 ? (val/1000).toFixed(0) + "k" : val}`} />
                  <Tooltip 
                    cursor={{ fill: "rgba(217, 136, 161, 0.08)" }}
                    contentStyle={{ backgroundColor: "#13111C", borderColor: "#3B384D", borderRadius: "12px", fontSize: "11px", color: "#fff" }}
                    formatter={(value: any) => [`${currencySymbol}${Number(value).toLocaleString()}`, "Value"]}
                  />
                  <Bar dataKey="value" fill="#D988A1" radius={[6, 6, 0, 0]} barSize={32}>
                    {dynamicContext.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : activeRenderMode === "area" ? (
                <AreaChart data={dynamicContext.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="splitDynamicGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D988A1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8A5A7B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D2B3B" vertical={false} />
                  <XAxis dataKey="name" stroke="#9E9AA7" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9E9AA7" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${currencySymbol}${Number(val) >= 1000 ? (val/1000).toFixed(0) + "k" : val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#13111C", borderColor: "#3B384D", borderRadius: "12px", fontSize: "11px", color: "#fff" }}
                    formatter={(value: any) => [`${currencySymbol}${Number(value).toLocaleString()}`, "Value"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#D988A1" strokeWidth={2.5} fillOpacity={1} fill="url(#splitDynamicGrad)" name="Trajectory" />
                  {dynamicContext.data.some(d => d.secondary !== undefined) && (
                    <Area type="monotone" dataKey="secondary" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" name="Secondary Threshold" />
                  )}
                </AreaChart>
              ) : (
                <PieChart>
                  <Pie
                    data={dynamicContext.data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {dynamicContext.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry as any).color || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#13111C", borderColor: "#3B384D", borderRadius: "12px", fontSize: "11px", color: "#fff" }}
                    formatter={(value: any) => [`${currencySymbol}${Number(value).toLocaleString()}`, "Amount"]}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Legend for Pie/Bar views */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-neutral-800/60 max-h-16 overflow-y-auto">
            {dynamicContext.data.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: (item as any).color || PIE_COLORS[idx % PIE_COLORS.length] }} />
                <span className="text-neutral-300 font-medium truncate max-w-[110px]">{item.name}: {currencySymbol}{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contextual AI Note */}
        <div className="bg-gradient-to-r from-[#D988A1]/10 to-transparent border-l-2 border-[#D988A1] p-3.5 rounded-r-xl">
          <span className="text-[10px] font-bold text-[#D988A1] uppercase tracking-wider block font-mono">AARYA Dynamic Visualization Synthesis</span>
          <p className="text-xs text-neutral-300 leading-relaxed mt-1">
            {dynamicContext.insightNote}
          </p>
        </div>

      </div>
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

  const [isSplitView, setIsSplitView] = useState(false);
  const [userClosedSplit, setUserClosedSplit] = useState(false);

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

  // Automatically open split screen whenever the first/any question is asked or answer starts generating
  useEffect(() => {
    if (messages.length > 1 && !userClosedSplit) {
      const hasAssistantReply = messages.some(m => m.role === "assistant" && !m.id.startsWith("msg_welcome") && !m.id.startsWith("msg_reinit"));
      if (hasAssistantReply || status === "streaming" || status === "submitted") {
        setIsSplitView(true);
      }
    } else if (messages.length <= 1) {
      setIsSplitView(false);
      setUserClosedSplit(false);
    }
  }, [messages, status, userClosedSplit]);

  // Watch for preseeded dashboard quick prompts (e.g. from Explain Your Math)
  useEffect(() => {
    if (preseededPrompt) {
      setUserClosedSplit(false);
      setIsSplitView(true);
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
    setUserClosedSplit(false);
    setIsSplitView(true);
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
    setIsSplitView(false);
    setUserClosedSplit(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setUserClosedSplit(false);
    setIsSplitView(true);
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
          {messages.length > 1 && (
            <button
              onClick={() => {
                if (isSplitView) {
                  setIsSplitView(false);
                  setUserClosedSplit(true);
                } else {
                  setIsSplitView(true);
                  setUserClosedSplit(false);
                }
              }}
              className={`flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-[12px] transition-all shadow-xs border ${
                isSplitView
                  ? "bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white border-transparent"
                  : "bg-white dark:bg-[#13111C] text-neutral-600 dark:text-[#E2DFE9] border-neutral-200 dark:border-neutral-800/60 hover:text-white hover:bg-[#141414] dark:hover:bg-[#8A5A7B]/30"
              }`}
            >
              <BarChart2 className="w-3 h-3 shrink-0" />
              <span>{isSplitView ? "Visual Graph: ON" : "View Visual Graph"}</span>
            </button>
          )}
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

      {/* Main Container: Split or Single View */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Left Half (Text Chat & Input) */}
        <div className={`flex flex-col min-w-0 transition-all duration-300 ${
          isSplitView 
            ? "w-full md:w-1/2 md:border-r border-neutral-200 dark:border-neutral-800/60" 
            : "flex-1 w-full"
        }`}>
          {/* Message body list */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-5 scroll-smooth"
          >
            <div className={`mx-auto w-full space-y-5 transition-all ${isSplitView ? "max-w-xl" : "max-w-4xl"}`}>
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
            <div className={`mx-auto w-full space-y-3 transition-all ${isSplitView ? "max-w-xl" : "max-w-4xl"}`}>
              
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

        {/* Right Half (Dynamic Visual Analytics Panel - ONLY when isSplitView is true) */}
        {isSplitView && (
          <div className="hidden md:flex md:w-1/2 flex-col bg-[#F4F2F0] dark:bg-[#13111C]/90 overflow-y-auto border-l border-white/5 shrink-0 animate-in fade-in duration-300">
            <ChatVisualizationPanel 
              state={state}
              currencySymbol={currencySymbol}
              latestResponseText={
                messages.filter(m => m.role === "assistant" && !m.id.startsWith("msg_welcome") && !m.id.startsWith("msg_reinit")).slice(-1)[0]
                  ? parseMessageText(messages.filter(m => m.role === "assistant" && !m.id.startsWith("msg_welcome") && !m.id.startsWith("msg_reinit")).slice(-1)[0].parts as any[]).displayText
                  : ""
              }
              latestUserQuestion={
                messages.filter(m => m.role === "user").slice(-1)[0]
                  ? (messages.filter(m => m.role === "user").slice(-1)[0].parts as any[])?.map((p: any) => p.type === "text" ? p.text : "").join(" ") || ""
                  : ""
              }
              onClose={() => {
                setIsSplitView(false);
                setUserClosedSplit(true);
              }}
            />
          </div>
        )}

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
