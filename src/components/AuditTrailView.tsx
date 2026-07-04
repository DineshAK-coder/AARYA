import React, { useState } from "react";
import { History, Search, FileText, CheckCircle, Sparkles, Clock, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { BusinessState, Activity } from "../types";

interface AuditProps {
  state: BusinessState;
}

export const AuditTrailView: React.FC<AuditProps> = ({ state }) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const categories = [
    { value: "all", label: "All Logs" },
    { value: "ledger", label: "Ledger" },
    { value: "billing", label: "Billing" },
    { value: "chat", label: "AI Directives" },
    { value: "onboarding", label: "System Setup" }
  ];

  // Filtering activities
  const filteredActivities = state.activities.filter((act) => {
    const matchesCategory = filterType === "all" || act.actionType === filterType;
    const matchesSearch = 
      act.description.toLowerCase().includes(search.toLowerCase()) ||
      (act.customer && act.customer.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div id="audit-trail-container" className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 text-neutral-900 bg-[#EAE7E4]">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight text-neutral-900">Active Audit Trail</h2>
          <p className="text-xs text-neutral-500 mt-1">Verifiable system logs of invoice creations, client payments, ledger modifications, and CFO instructions.</p>
        </div>
        
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs text-neutral-600 font-mono shadow-sm">
          <Layers className="w-3.5 h-3.5 text-[#141414]" />
          <span>{state.activities.length} entries registered</span>
        </div>
      </div>

      {/* Filter Chips and Search input row */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          
          {/* Category Chips */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                id={`audit-filter-${cat.value}`}
                onClick={() => setFilterType(cat.value)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all shadow-sm ${
                  filterType === cat.value
                    ? "bg-[#141414] text-[#FF3B30] border-[#141414]"
                    : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Mini Search */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <input
              type="text"
              id="audit-search-input"
              placeholder="Filter logs by description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 focus:border-[#141414] text-neutral-900 rounded-xl text-xs outline-none shadow-sm"
            />
          </div>

        </div>
      </div>

      {/* Timeline List feed */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm relative overflow-hidden">
        
        {/* Timeline bar in vertical */}
        <div className="absolute left-9 top-6 bottom-6 w-[1px] bg-neutral-200 pointer-events-none" />

        <div className="space-y-6">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((act) => (
              <div key={act.id} className="relative flex gap-6 items-start">
                
                {/* Timeline Icon circle */}
                <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 border z-10 ${
                  act.actionType === "billing" 
                    ? "bg-neutral-100 text-neutral-600 border-neutral-200" 
                    : act.actionType === "ledger" 
                    ? "bg-[#141414]/10 text-[#141414] border-[#141414]/20" 
                    : act.actionType === "chat" 
                    ? "bg-[#141414]/15 text-[#141414] border-[#141414]/30" 
                    : "bg-neutral-100 text-neutral-600 border-neutral-200"
                }`}>
                  {act.actionType === "billing" && <FileText className="w-4 h-4" />}
                  {act.actionType === "ledger" && <CheckCircle className="w-4 h-4" />}
                  {act.actionType === "chat" && <Sparkles className="w-4 h-4" />}
                  {act.actionType === "onboarding" && <Clock className="w-4 h-4" />}
                  {act.actionType === "settings" && <AlertCircle className="w-4 h-4" />}
                </div>

                {/* Log box */}
                <div className="flex-1 p-4 bg-neutral-50 rounded-xl border border-neutral-200/60 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-100/50 transition-colors">
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-500 font-mono font-medium tracking-wider">{act.timestamp}</span>
                    <p className="text-xs md:text-sm font-semibold text-neutral-800">{act.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-neutral-200 text-neutral-600">
                        {act.actionType}
                      </span>
                      {act.customer && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-neutral-200 text-neutral-600">
                          Client: {act.customer}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold font-mono text-neutral-900 tracking-tight">
                      {state.currencySymbol}{act.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[9px] text-neutral-500 font-mono">FINANCIAL VALUATION</span>
                  </div>
                </div>

              </div>
            ))
          ) : (
            <div className="text-center py-10 text-neutral-500 text-xs font-medium">
              No registered audit logs match your search.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
