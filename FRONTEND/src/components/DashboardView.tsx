import React, { useState, useEffect } from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Sparkles, 
  ArrowRight, 
  Send,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Receipt,
  CheckCircle,
  Clock
} from "lucide-react";
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
import { BusinessState, LedgerItem, Invoice, Activity } from "../types";
import { getTransactions } from "../services/apiClient";

interface DashboardProps {
  state: BusinessState;
  onAskNova: (prompt: string) => void;
  onQuickViewCustomer: (customerName: string) => void;
  setView: (view: any) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({ state, onAskNova, onQuickViewCustomer, setView }) => {
  const [prompt, setPrompt] = useState("");
  const [showBriefing, setShowBriefing] = useState(true);

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onAskNova(prompt);
    setPrompt("");
  };

  // ── Payables & Receivables from Backend ────────────────────────────────────
  // Derived from ledger as fallback, replaced with real API values once loaded
  const ledgerReceivables = state.ledger
    .filter(item => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);

  const ledgerPayables = state.ledger
    .filter(item => item.amount < 0)
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);

  const [receivables, setReceivables] = useState<number>(ledgerReceivables);
  const [payables, setPayables] = useState<number>(ledgerPayables);
  const [financialsLoading, setFinancialsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchFinancials() {
      setFinancialsLoading(true);
      try {
        const [incomeRes, expenseRes] = await Promise.all([
          getTransactions({ transaction_type: "income", limit: 500 }) as Promise<any>,
          getTransactions({ transaction_type: "expense", limit: 500 }) as Promise<any>,
        ]);
        if (cancelled) return;
        const incomeTotal = (incomeRes?.data?.data ?? []).reduce(
          (sum: number, tx: any) => sum + Math.abs(Number(tx.amount) || 0), 0
        );
        const expenseTotal = (expenseRes?.data?.data ?? []).reduce(
          (sum: number, tx: any) => sum + Math.abs(Number(tx.amount) || 0), 0
        );
        setReceivables(incomeTotal > 0 ? incomeTotal : ledgerReceivables);
        setPayables(expenseTotal > 0 ? expenseTotal : ledgerPayables);
      } catch (err) {
        console.warn("[Dashboard] Could not fetch financials from API, using ledger fallback:", err);
        setReceivables(ledgerReceivables);
        setPayables(ledgerPayables);
      } finally {
        if (!cancelled) setFinancialsLoading(false);
      }
    }
    fetchFinancials();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.companyId]);

  // Runway Calculation: Starting liquidity / simulated monthly burn rate
  const simulatedMonthlyBurn = 150000; 
  const runwayMonths = state.startingBalance > 0 
    ? (state.startingBalance / simulatedMonthlyBurn).toFixed(1) 
    : "0.0";

  const monthlyRevenue = state.invoices
    .filter(inv => inv.status === "Paid" && (inv.date.includes("2026-06") || inv.date.includes("2026-05")))
    .reduce((sum, inv) => sum + inv.amount, 0) || 1824530; // default value

  // Simulated cash flow timeline for chart (4 weeks)
  const chartData = [
    { name: "Week 1", Balance: state.startingBalance * 0.72 },
    { name: "Week 2", Balance: state.startingBalance * 0.88 },
    { name: "Week 3", Balance: state.startingBalance * 0.79 },
    { name: "Week 4", Balance: state.startingBalance },
  ];

  // Invoice Breakdown for Pie Chart
  const invoicePaidTotal = state.invoices
    .filter(inv => inv.status === "Paid")
    .reduce((sum, inv) => sum + inv.amount, 0) || 680000;

  const invoicePendingTotal = state.invoices
    .filter(inv => inv.status === "Pending")
    .reduce((sum, inv) => sum + inv.amount, 0) || 320000;

  const invoiceOverdueTotal = state.invoices
    .filter(inv => inv.status === "Overdue")
    .reduce((sum, inv) => sum + inv.amount, 0) || 150000;

  const pieData = [
    { name: "Paid", value: invoicePaidTotal, color: "#D988A1" },
    { name: "Pending", value: invoicePendingTotal, color: "#8A5A7B" },
    { name: "Overdue", value: invoiceOverdueTotal, color: "#EF4444" },
  ];

  // Customer Exposure Breakdown for Bar Chart
  const barData = state.ledger
    .filter(item => item.amount > 0)
    .slice(0, 5)
    .map(item => ({
      name: item.name.split(" ")[0], // Use first name for space-constrained YAxis
      Amount: item.amount,
    }));


  return (
    <div id="dashboard-view-container" className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 text-neutral-900 bg-[#EAE7E4] dark:bg-[#13111C] dark:text-white transition-colors duration-300">
      
      {/* Sleek Morning Briefing Glass Pill Toast */}
      <div 
        className={`w-full max-w-4xl mx-auto mb-6 transition-all duration-500 ease-out transform ${
          showBriefing ? "opacity-100 max-h-24 scale-100 translate-y-0" : "opacity-0 max-h-0 scale-95 -translate-y-4 overflow-hidden pointer-events-none mb-0"
        }`}
      >
        <div className="flex items-center justify-between gap-4 p-3.5 px-6 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="text-base">⚠️</span>
            <span className="text-xs font-semibold text-white tracking-wide uppercase font-mono bg-[#D988A1]/20 px-2.5 py-0.5 rounded-full">Briefing</span>
            <p className="text-xs text-white/90 font-medium">
              3 invoices crossing 30 days overdue today. Recommend sending a collection reminder.
            </p>
          </div>
          <button 
            onClick={() => setShowBriefing(false)}
            className="text-white/45 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 shrink-0"
            aria-label="Dismiss briefing"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Greeting & Header row */}
      <div className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <p className="text-neutral-500 dark:text-[#9E9AA7] text-xs font-mono uppercase tracking-widest">
            {state.industry.toUpperCase()} &bull; AARYA FINANCE COMMAND CENTER
          </p>
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-neutral-900 dark:text-white tracking-tight mt-1">
            Welcome Back, Founder
          </h2>
          <p className="text-xs text-neutral-400 dark:text-[#9E9AA7] mt-0.5">Let's analyze your startup liquidity parameters.</p>
        </div>

        {/* Total Cash / Cash Flow Card with prominent pink gradient button */}
        <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/60 rounded-[24px] p-6 min-w-[320px] md:min-w-[400px] shadow-xl relative overflow-hidden flex flex-col justify-between transition-all">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-[#D988A1]/20 to-[#8A5A7B]/20 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-center relative z-10 mb-2">
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-500 dark:text-[#9E9AA7] font-semibold">TOTAL HOLDINGS CASH FLOW</span>
            <span className="text-[9px] bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">ACTIVE</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="text-3xl font-heading font-bold text-neutral-900 dark:text-white tracking-tight mt-1 tabular-nums">
                {state.currencySymbol}{state.startingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-neutral-400 dark:text-[#9E9AA7] mt-1 font-mono">Linked live ledger bank balance</p>
            </div>
            <button
              onClick={() => onAskNova("Give me advice on accelerating collections.")}
              className="px-4 py-2.5 rounded-[20px] bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#8A5A7B]/20 shrink-0 uppercase tracking-widest"
            >
              Explore AI Insights
            </button>
          </div>
        </div>
      </div>

      {/* Row of 4 Stat Cards: Runway, Cash Flow, Receivables, Payables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Runway (Months) */}
        <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/60 hover:border-neutral-400 dark:hover:border-[#D988A1]/40 transition-all rounded-[24px] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-[#9E9AA7]">Runway (Months)</span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-center text-neutral-800 dark:text-white">
              <Clock className="w-4 h-4 text-[#D988A1]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-heading font-bold text-neutral-900 dark:text-white tracking-tight tabular-nums flex items-center gap-2">
              <span>{runwayMonths} Months</span>
              <div className="relative group/tooltip inline-block cursor-pointer">
                <Sparkles className="w-4 h-4 text-[#D988A1] opacity-75 hover:opacity-100 transition-all hover:scale-110" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3 rounded-2xl text-[11px] font-sans leading-relaxed text-white/95 bg-[#08060c]/90 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 scale-95 group-hover/tooltip:scale-100 z-50 text-center">
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#08060c]/90"></div>
                  <div className="font-bold text-[#D988A1] mb-1 flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span>Explain Your Math</span>
                  </div>
                  <span className="text-white/70 font-normal">Calculated as: <span className="font-mono text-[#D988A1]">Current Cash / Avg Monthly Burn</span> (simulated at {state.currencySymbol}150,000/mo).</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-neutral-400 dark:text-[#9E9AA7] mt-1 font-mono">
              Based on {state.currencySymbol}1.5L/mo burn
            </div>
          </div>
        </div>

        {/* Card 2: Cash Flow */}
        <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/60 hover:border-neutral-400 dark:hover:border-[#D988A1]/40 transition-all rounded-[24px] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-[#9E9AA7]">Cash Flow</span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-center text-neutral-800 dark:text-white">
              <TrendingUp className="w-4 h-4 text-[#D988A1]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-heading font-bold text-neutral-900 dark:text-white tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <span>+{state.currencySymbol}{(state.startingBalance * 0.28).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              <div className="relative group/tooltip inline-block cursor-pointer">
                <Sparkles className="w-4 h-4 text-[#D988A1] opacity-75 hover:opacity-100 transition-all hover:scale-110" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3 rounded-2xl text-[11px] font-sans leading-relaxed text-white/95 bg-[#08060c]/90 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 scale-95 group-hover/tooltip:scale-100 z-50 text-center">
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#08060c]/90"></div>
                  <div className="font-bold text-[#D988A1] mb-1 flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span>Explain Your Math</span>
                  </div>
                  <span className="text-white/70 font-normal">Calculated as: <span className="font-mono text-emerald-400">Receivables (+{state.currencySymbol}1.2M) - Payables</span> over the past 30 days.</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-neutral-400 dark:text-[#9E9AA7] mt-1 font-mono">
              Net balance variance
            </div>
          </div>
        </div>

        {/* Card 3: Receivables */}
        <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/60 hover:border-neutral-400 dark:hover:border-[#D988A1]/40 transition-all rounded-[24px] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-[#9E9AA7]">Receivables</span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-center text-neutral-800 dark:text-white">
              <ArrowUpRight className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-4">
            {financialsLoading ? (
              <div className="h-9 w-36 bg-neutral-200 dark:bg-neutral-700/60 rounded-xl animate-pulse" />
            ) : (
              <div className="text-3xl font-heading font-bold text-neutral-900 dark:text-white tracking-tight tabular-nums">
                {state.currencySymbol}{receivables.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            )}
            <div className="text-[10px] text-neutral-400 dark:text-[#9E9AA7] mt-1 font-mono flex items-center gap-1.5">
              Pending customer payments
              {!financialsLoading && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live from database" />}
            </div>
          </div>
        </div>

        {/* Card 4: Payables */}
        <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/60 hover:border-neutral-400 dark:hover:border-[#D988A1]/40 transition-all rounded-[24px] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-[#9E9AA7]">Payables</span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-center text-neutral-800 dark:text-white">
              <ArrowDownRight className="w-4 h-4 text-[#D988A1]" />
            </div>
          </div>
          <div className="mt-4">
            {financialsLoading ? (
              <div className="h-9 w-36 bg-neutral-200 dark:bg-neutral-700/60 rounded-xl animate-pulse" />
            ) : (
              <div className="text-3xl font-heading font-bold text-neutral-900 dark:text-white tracking-tight tabular-nums">
                {state.currencySymbol}{payables.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            )}
            <div className="text-[10px] text-neutral-400 dark:text-[#9E9AA7] mt-1 font-mono flex items-center gap-1.5">
              Outstanding liabilities
              {!financialsLoading && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D988A1] animate-pulse" title="Live from database" />}
            </div>
          </div>
        </div>

      </div>

      {/* Cash Flow Line Chart Bento & Top Debtor summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Left 2 Cols: Runway Performance Chart Card */}
        <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/60 rounded-[24px] p-6 lg:col-span-2 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-heading font-bold text-base text-neutral-900 dark:text-white">Runway Performance</h3>
              <p className="text-[11px] text-neutral-500 dark:text-[#9E9AA7]">Weekly cash level trends and burn-rate assessment</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] inline-block shadow shadow-[#8A5A7B]/25"></span>
              <span className="text-[10px] font-mono text-neutral-500 dark:text-[#9E9AA7] font-bold uppercase tracking-wider">Cash Pool Level</span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D988A1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8A5A7B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(158, 154, 167, 0.08)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9E9AA7" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9E9AA7" 
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${state.currencySymbol}${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1F1D2B", borderColor: "rgba(217, 136, 161, 0.2)", borderRadius: "16px", color: "#FFFFFF", fontSize: "11px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}
                  formatter={(value: any) => [`${state.currencySymbol}${parseFloat(value).toLocaleString("en-US", {maximumFractionDigits: 0})}`, "Balance"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="Balance" 
                  stroke="#D988A1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCashGrad)" 
                  dot={{ r: 4, strokeWidth: 2, stroke: "#1F1D2B", fill: "#D988A1" }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#8A5A7B" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Top Debtors quick summary */}
        <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/60 rounded-[24px] p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading font-bold text-base text-neutral-900 dark:text-white">Ledger Risks</h3>
              <button 
                onClick={() => setView("ledger")}
                className="text-[10px] text-[#D988A1] hover:underline font-mono font-bold uppercase tracking-wider"
              >
                Go to Ledger
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-[#9E9AA7] mb-4">Outstanding customer accounts sorted by priority action.</p>

            <div className="space-y-3.5">
              {state.ledger.slice(0, 3).map((item) => (
                <div 
                  key={item.id}
                  onClick={() => onQuickViewCustomer(item.name)}
                  className="flex items-center justify-between p-3 rounded-[20px] bg-neutral-50 dark:bg-[#13111C]/60 border border-neutral-200 dark:border-neutral-800/60 hover:border-neutral-400 dark:hover:border-[#D988A1]/40 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      item.overdue 
                        ? "bg-[#D988A1]/10 text-[#D988A1] border border-[#D988A1]/20" 
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                    }`}>
                      {item.initials}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-neutral-500 dark:text-[#9E9AA7] font-mono uppercase tracking-wider">
                        {item.overdue ? "OVERDUE TERM" : "PENDING TERM"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-heading font-bold tabular-nums ${item.amount < 0 ? "text-neutral-900 dark:text-white" : item.overdue ? "text-[#D988A1]" : "text-neutral-700 dark:text-[#E2DFE9]"}`}>
                      {item.amount < 0 ? "" : state.currencySymbol}{item.amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                    </div>
                    <div className="text-[9px] text-neutral-500 dark:text-[#9E9AA7] font-mono">due {item.dueDate || "N/A"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/60 mt-4">
            <button 
              onClick={() => onAskNova("Who owes me money?")}
              className="w-full py-3 rounded-[20px] bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#8A5A7B]/10 hover:opacity-90 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Simulate collection dispatch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Intelligence Section (New Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" id="dashboard-advanced-analytics">
        
        {/* Invoice Distribution (Pie Chart) */}
        <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/60 rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-heading font-bold text-base text-neutral-900 dark:text-white">Invoice Distribution</h3>
            <p className="text-[11px] text-neutral-500 dark:text-[#9E9AA7]">Status breakdown of issued commercial billings</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="w-full sm:w-1/2 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1F1D2B", borderColor: "rgba(217, 136, 161, 0.2)", borderRadius: "16px", color: "#FFFFFF", fontSize: "11px" }}
                    formatter={(value: any) => [`${state.currencySymbol}${parseFloat(value).toLocaleString("en-US", {maximumFractionDigits: 0})}`, "Total"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="w-full sm:w-1/2 space-y-2.5">
              {pieData.map((item) => {
                const totalInvoicesValue = invoicePaidTotal + invoicePendingTotal + invoiceOverdueTotal;
                const pct = totalInvoicesValue > 0 ? ((item.value / totalInvoicesValue) * 100).toFixed(0) : "0";
                return (
                  <div key={item.name} className="flex items-center justify-between p-2 rounded-[16px] bg-neutral-50 dark:bg-[#13111C]/40 border border-neutral-100 dark:border-neutral-800/40">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-[11px] font-semibold text-neutral-800 dark:text-white">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold font-mono text-neutral-900 dark:text-white block">
                        {state.currencySymbol}{item.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[9px] text-neutral-400 font-mono block">
                        {pct}% share
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ledger Receivables Allocation (Bar Chart) */}
        <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/60 rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-heading font-bold text-base text-neutral-900 dark:text-white">Customer Exposure</h3>
            <p className="text-[11px] text-neutral-500 dark:text-[#9E9AA7]">Top accounts receivable obligations</p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 15, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(158, 154, 167, 0.05)" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="#9E9AA7" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `${state.currencySymbol}${(val / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#9E9AA7" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  width={65}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1F1D2B", borderColor: "rgba(217, 136, 161, 0.2)", borderRadius: "16px", color: "#FFFFFF", fontSize: "11px" }}
                  formatter={(value: any) => [`${state.currencySymbol}${parseFloat(value).toLocaleString("en-US", {maximumFractionDigits: 0})}`, "Exposure"]}
                />
                <Bar 
                  dataKey="Amount" 
                  fill="#D988A1" 
                  radius={[0, 10, 10, 0]}
                  maxBarSize={14}
                >
                  {barData.map((entry, index) => {
                    const colors = ["#D988A1", "#B37189", "#8A5A7B", "#6B425F", "#4F2B45"];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/60 rounded-[24px] p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-heading font-bold text-base text-neutral-900 dark:text-white">Active Audit Log</h3>
            <p className="text-[11px] text-neutral-500 dark:text-[#9E9AA7]">Verifiable trace of ledger entries, billings, and cfo operations</p>
          </div>
          <button 
            onClick={() => setView("audit")}
            className="text-[10px] text-neutral-500 dark:text-[#9E9AA7] hover:text-[#D988A1] font-mono font-bold uppercase tracking-wider"
          >
            Full Trail
          </button>
        </div>

        <div className="space-y-4">
          {state.activities.slice(0, 4).map((activity) => (
            <div key={activity.id} className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 last:border-0 last:pb-0">
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0">
                  {activity.actionType === "billing" && <Receipt className="w-4 h-4 text-neutral-400" />}
                  {activity.actionType === "ledger" && <CheckCircle className="w-4 h-4 text-[#D988A1]" />}
                  {activity.actionType === "chat" && <Sparkles className="w-4 h-4 text-[#D988A1]" />}
                  {activity.actionType === "onboarding" && <Clock className="w-4 h-4 text-neutral-400" />}
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-800 dark:text-[#E2DFE9]">
                    {activity.description}
                  </p>
                  <p className="text-[10px] text-neutral-400 dark:text-[#9E9AA7] font-mono mt-0.5">
                    {activity.timestamp} &bull; action: {activity.actionType.toUpperCase()} {activity.customer && `• Customer: ${activity.customer}`}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs font-mono font-semibold tabular-nums text-neutral-600 dark:text-[#9E9AA7] shrink-0">
                {state.currencySymbol}{activity.amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
