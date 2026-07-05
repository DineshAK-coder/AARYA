import React, { useState } from "react";
import { Sparkles, Building2, Wallet, ArrowRight, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { onboardCompany } from "../services/apiClient";

interface OnboardingProps {
  onComplete: (data: {
    businessName: string;
    industry: string;
    currency: string;
    currencySymbol: string;
    startingBalance: number;
    companyId?: string;
  }) => void;
  defaultEmail: string;
}

export const OnboardingView: React.FC<OnboardingProps> = ({ onComplete, defaultEmail }) => {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("Software & SaaS");
  const [currency, setCurrency] = useState("INR (₹)");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const industries = [
    "Consulting & Services",
    "Software & SaaS",
    "E-commerce & Retail",
    "Agency & Marketing",
    "Real Estate",
    "Healthcare & Medical",
    "Manufacturing",
    "Other Services"
  ];

  const currencies = [
    { value: "USD ($)", symbol: "$" },
    { value: "EUR (€)", symbol: "€" },
    { value: "GBP (£)", symbol: "£" },
    { value: "JPY (¥)", symbol: "¥" },
    { value: "INR (₹)", symbol: "₹" },
    { value: "CAD ($)", symbol: "$" },
    { value: "AUD ($)", symbol: "$" }
  ];

  const handleNext = async () => {
    if (step === 1) {
      if (!businessName.trim()) return;
      setStep(2);
    } else {
      // Step 2: currency confirmed — call backend and complete onboarding
      const selectedCurr = currencies.find((c) => c.value === currency) || currencies[4]; // default INR
      setApiError("");
      setLoading(true);
      try {
        let companyId: string | undefined;
        try {
          const result = await onboardCompany({ name: businessName }) as any;
          companyId = result?.data?.id ?? result?.data?.company_id;
        } catch (err: any) {
          // If the error is "already has company" we can still proceed gracefully
          const msg: string = err?.message ?? "";
          if (!msg.includes("ALREADY_HAS_COMPANY") && !msg.includes("already belong")) {
            setApiError(
              msg || "Failed to register your company. Please check your connection and try again."
            );
            setLoading(false);
            return;
          }
        }

        onComplete({
          businessName,
          industry,
          currency,
          currencySymbol: selectedCurr.symbol,
          startingBalance: 0, // derived entirely from CSV uploads — not set manually
          companyId,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
  };

  return (
    <div id="onboarding-view-container" className="min-h-screen bg-[#EAE7E4] text-neutral-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#141414]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#141414]/5 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <motion.div 
        layout
        className="w-full max-w-xl bg-white border border-[#E5E7EB] rounded-3xl p-8 md:p-10 shadow-lg relative"
      >
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8 justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${step === 1 ? "bg-[#141414]" : "bg-[#141414]/20"}`}></span>
            <span className={`w-2 h-2 rounded-full ${step === 2 ? "bg-[#141414]" : "bg-[#141414]/20"}`}></span>
          </div>
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Step {step} of 2</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-heading font-bold text-2xl md:text-3xl text-[#141414] tracking-tight flex items-center gap-2.5">
                  <Building2 className="w-6 h-6 text-[#141414]" />
                  <span>Your Business Identity</span>
                </h2>
                <p className="text-sm text-neutral-500 mt-2">
                  Tell A.A.R.Y.A about your enterprise. Your virtual AI CFO customizes its financial algorithms based on your business sector.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Legal Business Name</label>
                  <input
                    type="text"
                    required
                    id="onboarding-input-name"
                    placeholder="e.g. Acme Tech Solutions"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-neutral-200 text-neutral-900 text-sm outline-none focus:border-[#141414] focus:ring-1 focus:ring-[#141414]/20 placeholder:text-neutral-300 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Industry Sector</label>
                  <select
                    id="onboarding-select-industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-neutral-200 text-neutral-900 text-sm outline-none focus:border-[#141414] focus:ring-1 focus:ring-[#141414]/20 appearance-none cursor-pointer transition-all"
                  >
                    {industries.map((ind) => (
                      <option key={ind} value={ind} className="bg-white text-neutral-900">
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-heading font-bold text-2xl md:text-3xl text-[#141414] tracking-tight flex items-center gap-2.5">
                  <Wallet className="w-6 h-6 text-[#141414]" />
                  <span>Operational Currency</span>
                </h2>
                <p className="text-sm text-neutral-500 mt-2">
                  Select the currency your business operates in. A.A.R.Y.A will use this for all financial displays and calculations derived from your uploaded data.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Select Currency</label>
                  <select
                    id="onboarding-select-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-neutral-200 text-neutral-900 text-sm outline-none focus:border-[#141414] focus:ring-1 focus:ring-[#141414]/20 appearance-none cursor-pointer transition-all"
                  >
                    {currencies.map((curr) => (
                      <option key={curr.value} value={curr.value} className="bg-white text-neutral-900">
                        {curr.value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Info notice replacing the balance input */}
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Your financial position — cash flow, runway, receivables, and payables — will be calculated automatically once you upload your transaction data via the <span className="font-semibold text-[#141414]">Data Upload</span> screen.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* API Error Banner */}
        {apiError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-100">
          {step === 2 ? (
            <button
              type="button"
              id="onboarding-back-btn"
              onClick={handleBack}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 bg-white shadow-sm transition-all text-xs font-bold disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            id="onboarding-next-btn"
            onClick={handleNext}
            disabled={loading || (step === 1 && !businessName.trim())}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#141414] text-[#FF3B30] hover:opacity-95 active:scale-[0.98] transition-all font-heading font-bold text-sm ml-auto shadow-md disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating company...</span>
              </>
            ) : (
              <>
                <span>{step === 1 ? "Next Step" : "Complete Setup"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
