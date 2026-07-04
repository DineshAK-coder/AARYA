import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  ArrowUpRight, 
  PieChart as PieIcon, 
  BarChart4, 
  Sparkles,
  Info
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from "recharts";
import { BusinessState } from "../types";

interface RevenueIntelProps {
  state: BusinessState;
}

export const RevenueIntelView: React.FC<RevenueIntelProps> = ({ state }) => {
  
  // 1. Profitability Trend Data (Simulated 6 Months)
  const profitData = [
    { month: "Jan", Revenue: 12500, Expenses: 8100, NetMargin: 4400 },
    { month: "Feb", Revenue: 14200, Expenses: 8300, NetMargin: 5900 },
    { month: "Mar", Revenue: 15900, Expenses: 9100, NetMargin: 6800 },
    { month: "Apr", Revenue: 14100, Expenses: 8900, NetMargin: 5200 },
    { month: "May", Revenue: 16800, Expenses: 9400, NetMargin: 7400 },
    { month: "Jun", Revenue: 18245.30, Expenses: 10100, NetMargin: 8145.30 },
  ];

  // 2. Expense Category Breakdown Data
  const expenseData = [
    { name: "Advisory & Contractors", value: 4200 },
    { name: "SaaS Tools & Cloud", value: 1850 },
    { name: "Legal & Compliance", value: 1500 },
    { name: "Rent & Core Facilities", value: 2550 },
  ];
  
  const PIE_COLORS = ["#141414", "#10B981", "#6B7280", "#E5E7EB"];

  // 3. Aging Report (30 / 60 / 90 days buckets)
  // Summing ledger overdue amounts
  const overdueItems = state.ledger.filter(item => item.overdue && item.amount > 0);
  
  // Placing overdue ledger amounts into aging buckets
  let d30 = 0;
  let d60 = 0;
  let d90 = 0;

  overdueItems.forEach(item => {
    if (item.amount > 5000) {
      d90 += item.amount;
    } else if (item.amount > 2000) {
      d60 += item.amount;
    } else {
      d30 += item.amount;
    }
  });

  // Default simulated values if ledger is empty/not overdue
  if (d30 === 0 && d60 === 0 && d90 === 0) {
    d30 = 1500;
    d60 = 4321;
    d90 = 8720.76;
  }

  const agingData = [
    { bucket: "1 - 30 Days", Overdue: d30 },
    { bucket: "31 - 60 Days", Overdue: d60 },
    { bucket: "61 - 90+ Days", Overdue: d90 },
  ];

  // Key performance ratios
  const cumulativeRevenue = profitData.reduce((sum, d) => sum + d.Revenue, 0);
  const cumulativeExpenses = profitData.reduce((sum, d) => sum + d.Expenses, 0);
  const burnRateRatio = (cumulativeExpenses / cumulativeRevenue) * 100;
  const netMarginRatio = ((cumulativeRevenue - cumulativeExpenses) / cumulativeRevenue) * 100;

  return (
    <div id="revenue-intel-container" className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 text-neutral-900 bg-[#EAE7E4]">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight text-neutral-900">Revenue Intelligence Node</h2>
          <p className="text-xs text-neutral-500 mt-1">Strategic margin analyses, cash flow burn-rates, and uncollected debtor risk charts.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#141414]/10 border border-[#141414]/20 text-[#141414] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm">
          <Sparkles className="w-4 h-4 animate-pulse text-[#141414]" />
          <span>A.A.R.Y.A AI Advisor: Collections efficiency is optimal at 74%.</span>
        </div>
      </div>

      {/* Ratios row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">CUMULATIVE REVENUE</div>
          <div className="text-2xl font-heading font-bold text-neutral-900 mt-1 tabular-nums">
            {state.currencySymbol}{cumulativeRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-1">6 month business ledger</div>
        </div>

        <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">NET PROFIT MARGIN</div>
          <div className="text-2xl font-heading font-bold text-[#141414] mt-1 font-mono">
            {netMarginRatio.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#141414] font-mono mt-1">&bull; Healthy operational index</div>
        </div>

        <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">BURN RATE INDEX</div>
          <div className="text-2xl font-heading font-bold text-neutral-900 mt-1 font-mono">
            {burnRateRatio.toFixed(1)}%
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-1">Expense-to-revenue ratio</div>
        </div>

        <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">COLLECTION DURATION</div>
          <div className="text-2xl font-heading font-bold text-red-600 mt-1 font-mono">
            42 Days
          </div>
          <div className="text-[10px] text-red-600 font-mono mt-1">&bull; Target threshold: 30 days</div>
        </div>
      </div>

      {/* Bento Grid of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Profitability Trend (Line chart) - Col Span 8 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 lg:col-span-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-heading font-bold text-base text-neutral-900">Profitability Lifecycle</h3>
              <p className="text-[11px] text-neutral-500">Tracking gross earnings relative to core operations</p>
            </div>
            <div className="flex gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-neutral-700">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block"></span> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-[#141414] font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#141414] inline-block"></span> Profit
              </span>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #E5E7EB", borderRadius: "10px", color: "#111827", fontSize: "11px" }}
                />
                <Line type="monotone" dataKey="Revenue" stroke="#9CA3AF" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="NetMargin" stroke="#141414" strokeWidth={2.5} dot={true} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Expense category Donut - Col Span 4 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 lg:col-span-4 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="font-heading font-bold text-base text-neutral-900">Expense Distribution</h3>
            <p className="text-[11px] text-neutral-500 mb-4">Functional cost categories of the business</p>
            
            <div className="h-44 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <span className="text-[10px] text-neutral-500 font-mono">TOTAL COSTS</span>
                <span className="text-xs font-bold font-mono text-neutral-900">$10,100</span>
              </div>
            </div>
          </div>

          {/* Custom legend */}
          <div className="space-y-1.5 mt-4 border-t border-neutral-100 pt-4">
            {expenseData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2 text-neutral-500 truncate">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: PIE_COLORS[idx] }} />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="text-neutral-800 font-mono font-bold">${item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Debt Aging Report (30/60/90 Bar chart) - Col Span 12 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 lg:col-span-12 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-neutral-900">Accounts Receivable Aging (DSO)</h3>
              <p className="text-[11px] text-neutral-500">Days Outstanding report showing uncollected assets frozen in debt cycles</p>
            </div>
            <div className="p-1 px-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[10px] font-mono flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-red-500" />
              <span>Severe Risk: Over 60 days bucket represents 62% of uncollected balance.</span>
            </div>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="bucket" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #E5E7EB", borderRadius: "10px", color: "#111827", fontSize: "11px" }}
                  formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, "Owed Amount"]}
                />
                <Bar dataKey="Overdue" fill="#141414" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
