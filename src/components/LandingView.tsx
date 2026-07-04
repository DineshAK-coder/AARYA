import React from "react";
import { Sparkles, ArrowRight, ShieldCheck, Zap, Activity, MessageSquare, BookOpen, FileText } from "lucide-react";
import { motion } from "motion/react";

interface LandingProps {
  onStart: () => void;
  loggedIn: boolean;
}

export const LandingView: React.FC<LandingProps> = ({ onStart, loggedIn }) => {
  return (
    <div id="landing-view-container" className="min-h-screen bg-[#EAE7E4] text-neutral-900 flex flex-col relative overflow-hidden">
      {/* Absolute Decorative Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#141414]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#141414]/5 blur-[150px] pointer-events-none" />

      {/* Header Bar */}
      <header className="border-b border-neutral-200/80 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-[#EAE7E4]/85 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#141414] flex items-center justify-center text-[#FF3B30] font-bold text-lg">
            A
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-[#141414]">A.A.R.Y.A CFO</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            id="landing-header-cta"
            onClick={onStart}
            className="px-4 py-2 text-xs md:text-sm font-semibold rounded-full border border-neutral-300 hover:border-[#141414] transition-all bg-white text-neutral-700 shadow-sm"
          >
            {loggedIn ? "Go to Dashboard" : "Sign In"}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 md:py-24 flex flex-col items-center justify-center text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-[#141414]/10 border border-[#141414]/20 text-[#141414] px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#141414]" />
          <span>The Next Generation of Small Business Capital Intelligence</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-heading font-bold text-4xl md:text-7xl tracking-tight text-neutral-900 max-w-4xl leading-[1.05] mb-6"
        >
          Your business's <br className="hidden md:inline"/>
          <span className="border-b-4 border-[#FF3B30]">financial mind</span>, always on.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-neutral-600 text-sm md:text-xl max-w-2xl font-sans mb-10 leading-relaxed"
        >
          A.A.R.Y.A connects to your ledger, automates collections, analyzes cash cycles, and provides a virtual AI Chief Financial Officer that works 24/7.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mb-20"
        >
          <button 
            id="landing-hero-cta"
            onClick={onStart}
            className="px-8 py-4 rounded-full bg-[#141414] text-[#FF3B30] font-heading font-bold text-base hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-[#141414]/10"
          >
            <span>Launch A.A.R.Y.A CFO</span>
            <ArrowRight className="w-4.5 h-4.5 stroke-[2.5]" />
          </button>
        </motion.div>

        {/* Bento Grid Features Section */}
        <div className="w-full">
          <div className="text-left mb-10">
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-neutral-900 tracking-tight">
              Autonomous Financial Operations
            </h2>
            <p className="text-neutral-500 text-sm mt-1">
              Say goodbye to spreadsheet nightmares. Let AI manage the heavy lifting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Bento Card 1 */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white border border-neutral-200/80 rounded-2xl p-6 flex flex-col justify-between h-64 hover:border-neutral-300 transition-all shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-[#141414]/10 flex items-center justify-center text-[#141414] mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#141414] mb-2">Virtual AI CFO</h3>
                <p className="text-neutral-500 text-xs leading-relaxed">
                  Converse directly with Gemini-powered CFO analytics. Ask "Who owes me money?" or simulate tax projections instantly with smart ledger insights.
                </p>
              </div>
            </motion.div>

            {/* Bento Card 2 */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white border border-neutral-200/80 rounded-2xl p-6 flex flex-col justify-between h-64 hover:border-neutral-300 transition-all shadow-sm md:col-span-1"
            >
              <div className="w-10 h-10 rounded-xl bg-[#141414]/10 flex items-center justify-center text-[#141414] mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#141414] mb-2">Automated Ledger tracking</h3>
                <p className="text-neutral-500 text-xs leading-relaxed">
                  Track dynamic outstanding customer debts. Monitor who is in positive standing or severely overdue. Send digital reminders with a single click.
                </p>
              </div>
            </motion.div>

            {/* Bento Card 3 */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white border border-neutral-200/80 rounded-2xl p-6 flex flex-col justify-between h-64 hover:border-neutral-300 transition-all shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-[#141414]/10 flex items-center justify-center text-[#141414] mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#141414] mb-2">Smart Invoicing & Billing</h3>
                <p className="text-neutral-500 text-xs leading-relaxed">
                  Generate professional PDF-ready invoices instantly. Track Paid, Pending, or Overdue status with dynamic interactive aging timelines.
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Financial Stat Visualizer Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full mt-20 p-6 md:p-8 rounded-3xl bg-white border border-neutral-200/80 text-left relative overflow-hidden shadow-md"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
              <span className="text-xs text-neutral-400 font-mono ml-2">aarya_intelligence_dashboard_v1.0</span>
            </div>
            <div className="text-xs text-[#141414] bg-[#141414]/10 px-2 py-0.5 rounded font-mono font-medium">LIVE PREVIEW</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200/60 shadow-sm">
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">TOTAL CASH POSITION</div>
              <div className="text-3xl font-heading font-bold text-[#141414] tracking-tight mt-1 tabular-nums">$15,254.37</div>
              <div className="text-[10px] text-[#0E3D26] mt-2 font-mono font-semibold">+12.4% vs last quarter</div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200/60 shadow-sm">
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">OUTSTANDING LEDGER</div>
              <div className="text-3xl font-heading font-bold text-neutral-900 tracking-tight mt-1 tabular-nums">$24,561.20</div>
              <div className="text-[10px] text-red-600 mt-2 font-mono font-semibold">18% Overdue and pending collections</div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200/60 shadow-sm">
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">ACTIVE CFO DIRECTIVES</div>
              <div className="text-3xl font-heading font-bold text-neutral-900 tracking-tight mt-1">03 <span className="text-xs text-neutral-500">Tactics</span></div>
              <div className="text-[10px] text-neutral-500 mt-2 font-mono">1 automatic collection workflow active</div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 py-8 text-center text-xs text-neutral-500 z-10 bg-white">
        <p>&copy; 2026 A.A.R.Y.A CFO Inc. Crafted in Google AI Studio. Powered by Gemini-3.5-Flash.</p>
      </footer>
    </div>
  );
};
