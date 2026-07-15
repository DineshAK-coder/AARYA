import React, { useState, useCallback } from "react";
import { Database, Search, Sliders, Loader2, AlertCircle, CheckCircle2, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import { searchDecisions } from "../services/apiClient";

export const MemorySearchView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchThreshold, setSearchThreshold] = useState<number>(0.2);
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
        limit: 15,
      }) as { success: boolean; data?: any[] };
      setSearchResults(res?.data || []);
    } catch (err: any) {
      console.error("[MemorySearchView] Search error:", err);
      setSearchError(err?.message || "Search failed. Please check pgvector configuration.");
    } finally {
      setIsSearching(false);
    }
  };

  const backendUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  const debugUrl = `${backendUrl || "https://aarya-backend-sepia.vercel.app"}/api/decisions/debug-search?query=${encodeURIComponent(searchQuery || "hire engineers")}&threshold=${searchThreshold}`;

  return (
    <div id="memory-search-view" className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 text-neutral-900 dark:text-white bg-[#EAE7E4] dark:bg-[#13111C]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D988A1] to-[#8A5A7B] flex items-center justify-center text-white shadow-md shadow-[#D988A1]/20">
                <Database className="w-4 h-4" />
              </div>
              <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight text-neutral-900 dark:text-white">
                Decision Memory Ledger
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-[#9E9AA7]">
              Semantic similarity search across all founder decisions using pgvector cosine distance.
            </p>
          </div>
        </div>

        {/* Search Panel Box */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1F1D2B] border border-neutral-200 dark:border-neutral-800/80 shadow-md space-y-4">
          <form onSubmit={handleSemanticSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logged decisions (e.g., 'hire engineers', 'cash flow', 'overdue invoices')"
                  className="w-full pl-11 pr-4 py-3 bg-[#F4F2F0] dark:bg-[#13111C] border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-[#D988A1] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-6 py-3 bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] hover:opacity-90 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-[#D988A1]/20"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Search Memory</span>
              </button>
            </div>

            {/* Threshold controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-mono pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#D988A1]" />
                <span>Cosine Similarity Threshold: {(searchThreshold * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                {[0.1, 0.2, 0.4, 0.6, 0.75].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSearchThreshold(t)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                      searchThreshold === t
                        ? "bg-[#D988A1] border-[#D988A1] text-white"
                        : "bg-[#F4F2F0] dark:bg-[#13111C] border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-[#D988A1]/50"
                    }`}
                  >
                    {(t * 100).toFixed(0)}%
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Raw API Route Helper Notice */}
          <div className="p-3.5 rounded-2xl bg-[#F4F2F0]/80 dark:bg-[#13111C]/80 border border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-2 truncate text-neutral-600 dark:text-neutral-300">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold shrink-0">GET ROUTE</span>
              <span className="truncate">Raw API URL: <code className="text-[#D988A1]">{debugUrl}</code></span>
            </div>
            <a
              href={debugUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#D988A1] hover:underline font-bold shrink-0"
            >
              <span>Open in Browser</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {searchError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-500 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-500 font-bold">
              Matched Decisions ({searchResults.length})
            </h3>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#1F1D2B] rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800/80">
              <Database className="w-10 h-10 text-neutral-400 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                {isSearching ? "Running pgvector similarity search..." : "No matching decisions found above this threshold."}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Try searching keywords like "hire", "collections", or lowering the similarity threshold above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {searchResults.map((item) => {
                const matchScore = Math.round((item.similarity ?? 0) * 100);
                const outcomeColor = 
                  item.founder_decision === "approve" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
                  item.founder_decision === "reject" ? "bg-red-500/10 text-red-500 border-red-500/30" :
                  item.founder_decision === "modify" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                  "bg-neutral-500/10 text-neutral-400 border-neutral-500/30";

                return (
                  <div key={item.id} className="p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-[#1F1D2B] shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#D988A1]/15 text-[#D988A1] border border-[#D988A1]/30">
                        🎯 {matchScore}% Semantic Match
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-xl border ${outcomeColor}`}>
                        Outcome: {item.founder_decision ? item.founder_decision.toUpperCase() : "PENDING / NONE"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                        <span className="font-bold text-neutral-700 dark:text-neutral-300">Context:</span> {item.context || "General inquiry"}
                      </div>
                      <div className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium bg-[#F4F2F0] dark:bg-[#13111C] p-3.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60">
                        {item.ai_recommendation || "No recommendation text saved."}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-1 border-t border-neutral-100 dark:border-neutral-800/40">
                      <span>ID: {item.id}</span>
                      <span>Cosine Similarity: {(item.similarity ?? 0).toFixed(4)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
