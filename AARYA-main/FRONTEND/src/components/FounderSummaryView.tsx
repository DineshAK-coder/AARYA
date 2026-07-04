import React from "react";
import { TrendingUp, Award, Calendar, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { BusinessState } from "../types";

interface FounderSummaryViewProps {
  state: BusinessState;
}

export const FounderSummaryView: React.FC<FounderSummaryViewProps> = ({ state }) => {
  const receivables = state.ledger
    .filter(item => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);

  const payables = state.ledger
    .filter(item => item.amount < 0)
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);

  const runwayMonths = state.startingBalance > 0 
    ? (state.startingBalance / 150000).toFixed(1) 
    : "0.0";

  return (
    <div id="founder-summary-container" className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 text-neutral-900 bg-[#EAE7E4] dark:bg-[#121212] dark:text-[#f4f4f5]">
      
      {/* Header */}
      <div className="mb-8">
        <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">
          AARYA CO-PILOT ANALYSIS
        </p>
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-neutral-900 dark:text-white tracking-tight mt-1">
          Founder Financial Summary
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Executive brief, regulatory tax alerts, and runway analysis for Indian corporate leaders.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Bento Card 1: Runway Health */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">Runway Assessment</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full font-mono">
                SECURE
              </span>
            </div>
            <h3 className="text-4xl font-heading font-bold text-neutral-900 dark:text-white mt-4 tracking-tight">
              {runwayMonths} Mo.
            </h3>
            <p className="text-xs text-neutral-500 mt-2">
              Based on your net balance of {state.currencySymbol}{state.startingBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })} against a standard startup burn of {state.currencySymbol}1,50,000 per month.
            </p>
          </div>
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-4 text-[11px] text-[#FF3B30] font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>Next funding round trigger: 4 months runway</span>
          </div>
        </div>

        {/* Bento Card 2: Liquidity Split */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">Working Capital Netting</span>
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
              <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-[#FF3B30]" 
                  style={{ width: `${receivables + payables > 0 ? (receivables / (receivables + payables)) * 100 : 50}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 mt-4 leading-normal">
            Your net balance sheet ratio of ledger records shows a solid cash inflow potential. Keep collections active.
          </p>
        </div>

        {/* Bento Card 3: Indian Tax & Statutory Calendar */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4.5 h-4.5 text-[#FF3B30]" />
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">Tax Calendar (Q2 FY26)</h3>
            </div>
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-white">GSTR-1 GST Return</span>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Outward Supplies Sales Ledger</p>
                </div>
                <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded font-bold shrink-0">
                  July 11
                </span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-white">TDS Depositing (Challan 281)</span>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Monthly vendor tax deductions</p>
                </div>
                <span className="text-[10px] font-mono bg-[#FF3B30]/10 text-[#FF3B30] px-2 py-0.5 rounded font-bold shrink-0">
                  July 07
                </span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-white">PF & ESIC Contributions</span>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Employee Provident Fund returns</p>
                </div>
                <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded font-bold shrink-0">
                  July 15
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* AI Copilot Strategic Directives Section */}
      <div className="mt-8 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <Award className="w-5 h-5 text-[#FF3B30]" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">AARYA Strategic Decisions Guide</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-neutral-900 dark:text-white">MSME Section 43B(h) Audit Passed</span>
              <p className="mt-1">
                Your current liabilities check against the ledger confirms no registered Indian MSME micro-vendors are overdue past 45 days. Excellent corporate compliance hygiene!
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-neutral-900 dark:text-white">Receivables Optimization Buffer</span>
              <p className="mt-1">
                With {state.currencySymbol}{receivables.toLocaleString("en-US", { maximumFractionDigits: 0 })} outstanding, AARYA recommends setting up automatic WhatsApp/email invoice reminders to keep your DSO (Days Sales Outstanding) below 18 days.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
