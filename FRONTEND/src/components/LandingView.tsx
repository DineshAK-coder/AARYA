import React from "react";
import { Sparkles, ArrowRight, TrendingUp, Sparkle, MessageSquare, DollarSign, ArrowUpRight, Clock, Check, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

interface LandingProps {
  onStart: () => void;
  loggedIn: boolean;
}

export const LandingView: React.FC<LandingProps> = ({ onStart, loggedIn }) => {
  return (
    <div 
      id="landing-view-container" 
      className="min-h-screen text-white flex flex-col relative overflow-hidden select-none font-sans bg-[#0A0814]"
      style={{
        backgroundImage: "radial-gradient(circle at 10% 20%, #1D1430 0%, #0A0814 55%, #13111C 100%)"
      }}
    >
      {/* Decorative Brand Ambient Glows in Rose and Deep Plum */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#8A5A7B]/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[#D988A1]/10 blur-[160px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#8A5A7B]/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[350px] h-[350px] rounded-full bg-[#D988A1]/5 blur-[100px] pointer-events-none" />

      {/* Embedded Animations for beautiful responsive floating cards */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(4deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        @keyframes floatSlower {
          0%, 100% { transform: translateY(0px) rotate(-8deg) scale(0.92); }
          50% { transform: translateY(10px) rotate(-7deg) scale(0.92); }
        }
        .animate-float-1 {
          animation: floatSlow 7s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: floatSlower 9s ease-in-out infinite;
        }
      `}</style>

      {/* Top Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 md:px-12 py-6 flex items-center justify-between relative z-30">
        <div className="flex items-center gap-2.5">
          {/* Brand Accent Logo Icon */}
          <img src="/logo.jpg" alt="AARYA Logo" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-[#D988A1]/10" />
          <span className="font-heading font-black text-xl tracking-wider text-white">AARYA</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            id="landing-header-cta"
            onClick={onStart}
            className="px-6 py-2 text-xs md:text-sm font-semibold rounded-full border border-[#D988A1]/20 hover:border-[#D988A1]/40 transition-all bg-[#1F1D2B]/50 backdrop-blur-md text-white hover:text-[#D988A1] shadow-sm"
          >
            {loggedIn ? "Dashboard" : "Sign In"}
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-8 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-20">
        
        {/* Left Column: Premium Value Pitch */}
        <div className="lg:col-span-6 space-y-8 flex flex-col justify-center text-left">
          
          {/* Premium Tech Subtitle Accent */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex self-start items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1F1D2B]/80 border border-[#D988A1]/20 text-[11px] font-bold uppercase tracking-wider text-[#D988A1]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D988A1]" />
            <span>Consulting &amp; Services · AARYA Finance Command Center</span>
          </motion.div>

          {/* Large Bold Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-extrabold text-4xl md:text-6xl tracking-tight text-white leading-[1.1]"
          >
            India-first <span className="bg-gradient-to-r from-white via-white to-[#D988A1] bg-clip-text text-transparent">AI CFO Copilot</span> for SMEs and Startups
          </motion.h1>

          {/* Sub-headline */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#9E9AA7] text-sm md:text-lg max-w-xl font-normal leading-relaxed"
          >
            Turn messy financial data into simple answers about cash flow, runway, dues, and business health.
          </motion.p>

          {/* Call to Action Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
          >
            <button 
              id="landing-hero-cta"
              onClick={onStart}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white font-heading font-bold text-base hover:opacity-90 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-[#D988A1]/20 group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            
            <div className="flex items-center justify-center gap-4 text-xs text-[#9E9AA7] px-2 py-3 sm:py-0 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D988A1]" /> No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> WhatsApp Integrated
              </span>
            </div>
          </motion.div>

          {/* Key Stat Blocks */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="pt-6 border-t border-white/5 grid grid-cols-3 gap-4"
          >
            <div>
              <p className="text-xl md:text-3xl font-black font-mono tracking-tight text-white">100%</p>
              <p className="text-[10px] text-[#9E9AA7] uppercase tracking-widest mt-1 font-mono">Automated Sync</p>
            </div>
            <div>
              <p className="text-xl md:text-3xl font-black font-mono tracking-tight text-[#D988A1]">Under 5s</p>
              <p className="text-[10px] text-[#9E9AA7] uppercase tracking-widest mt-1 font-mono">AI Response Time</p>
            </div>
            <div>
              <p className="text-xl md:text-3xl font-black font-mono tracking-tight text-white">ISO/IEC</p>
              <p className="text-[10px] text-[#9E9AA7] uppercase tracking-widest mt-1 font-mono">Bank-Grade Security</p>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Layered Premium Glassmorphism Cards */}
        <div className="lg:col-span-6 relative h-[480px] md:h-[580px] w-full flex items-center justify-center mt-8 lg:mt-0">
          
          {/* Subtle Ambient Decorative Ring */}
          <div className="absolute w-[360px] h-[360px] md:w-[460px] md:h-[460px] rounded-full border border-[#D988A1]/5 pointer-events-none" />
          
          {/* BACK MOCKUP: Copilot Plain-English Q&A interface */}
          <div 
            className="absolute animate-float-2 z-10 w-[270px] md:w-[320px] h-[380px] md:h-[440px] rounded-3xl bg-[#13111C]/90 backdrop-blur-2xl border border-white/10 p-4 md:p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]"
            style={{
              transform: "translate3d(-50px, -40px, 0px) rotate(-8deg) scale(0.92)",
              boxShadow: "0 0 40px rgba(138, 90, 123, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 pb-3.5 border-b border-white/5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#8A5A7B] to-[#D988A1] flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-wide text-white">Ask AARYA Chat</div>
                <div className="text-[8px] text-[#D988A1] font-mono flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#D988A1] animate-ping inline-block" /> CFO Engine Online
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="space-y-4 text-xs">
              <div className="flex flex-col items-end">
                <div className="bg-white/5 border border-white/5 text-[10px] md:text-[11px] text-[#9E9AA7] px-3 py-2 rounded-2xl rounded-tr-none max-w-[85%] font-medium">
                  "What's our cash runway if our monthly burn rate increases to $1.5L?"
                </div>
                <span className="text-[8px] text-[#9E9AA7]/50 mt-1 font-mono">03:14 PM</span>
              </div>

              <div className="flex flex-col items-start">
                <div className="bg-gradient-to-br from-[#1F1D2B]/80 to-[#13111C]/90 border border-[#D988A1]/20 text-[10px] md:text-[11px] text-white p-3 rounded-2xl rounded-tl-none max-w-[90%] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-[#D988A1]/10 blur-md rounded-full" />
                  
                  <p className="leading-relaxed">
                    With your burn rate simulated at <span className="text-[#D988A1] font-semibold">$1.5L/mo</span>, your runway decreases to <span className="text-[#D988A1] font-bold">0.1 Months</span>. I recommend immediate invoice collection.
                  </p>
                  
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[8px] text-[#9E9AA7] font-mono">
                    <span>💡 Action: Dispatched 3 reminders</span>
                  </div>
                </div>
                <span className="text-[8px] text-[#9E9AA7]/50 mt-1 font-mono">03:14 PM</span>
              </div>

              {/* Dynamic Action Button */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#D988A1]/10 border border-[#D988A1]/20 text-[8px] text-[#D988A1] font-mono">
                <span>Go to CFO insights</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>

          {/* FRONT MOCKUP: Live Dashboard metrics */}
          <div 
            className="absolute animate-float-1 z-20 w-[280px] md:w-[340px] h-[390px] md:h-[465px] rounded-3xl bg-[#13111C]/95 backdrop-blur-3xl border border-white/10 p-5 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.9)]"
            style={{
              transform: "translate3d(30px, 30px, 0px) rotate(4deg)",
              boxShadow: "0 0 50px rgba(217, 136, 161, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
            }}
          >
            {/* Header with active tag */}
            <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3.5">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500/80 inline-block"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-500/80 inline-block"></span>
                <span className="w-2 h-2 rounded-full bg-[#D988A1] inline-block"></span>
              </div>
              <div className="text-[8px] font-mono tracking-wider text-[#D988A1] bg-[#D988A1]/10 px-2.5 py-0.5 rounded-full font-bold">
                FINANCE COMMAND CENTER
              </div>
            </div>

            {/* Total holdings display */}
            <div className="mb-4 p-3 rounded-2xl bg-[#1F1D2B]/80 border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[8px] uppercase tracking-wider text-[#9E9AA7] font-mono">TOTAL HOLDINGS CASH FLOW</p>
                <h3 className="text-lg md:text-xl font-black font-mono text-white mt-0.5">$15,254.37</h3>
              </div>
              <span className="text-[8px] font-mono font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                ACTIVE
              </span>
            </div>

            {/* Small high-fidelity grid of metrics */}
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Card 1: Runway */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all relative">
                <div className="flex justify-between items-start text-[#9E9AA7]">
                  <span className="text-[8px] font-bold uppercase tracking-wider font-mono">RUNWAY</span>
                  <Clock className="w-3 h-3 text-[#D988A1]" />
                </div>
                <div className="text-sm font-bold font-mono text-white mt-1.5 flex items-center gap-1">
                  0.1 Months <span className="text-[10px] text-[#D988A1]">✦</span>
                </div>
                <p className="text-[7px] text-[#9E9AA7] mt-1 font-mono">Based on $1.5L/mo burn</p>
              </div>

              {/* Card 2: Cash Flow */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                <div className="flex justify-between items-start text-[#9E9AA7]">
                  <span className="text-[8px] font-bold uppercase tracking-wider font-mono">CASH FLOW</span>
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="text-sm font-bold font-mono text-white mt-1.5 flex items-center gap-1">
                  +$4,271 <span className="text-[10px] text-[#D988A1]">✦</span>
                </div>
                <p className="text-[7px] text-[#9E9AA7] mt-1 font-mono">Net balance variance</p>
              </div>

              {/* Card 3: Receivables */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all col-span-2">
                <div className="flex justify-between items-center text-[#9E9AA7]">
                  <span className="text-[8px] font-bold uppercase tracking-wider font-mono">RECEIVABLES</span>
                  <span className="text-[7px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded">PENDING</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-base font-bold font-mono text-white">$1,354,242</span>
                  <span className="text-[8px] text-[#9E9AA7] font-mono">Pending payments</span>
                </div>
              </div>

            </div>

            {/* Simulated collection trigger */}
            <div className="mt-4 p-2.5 rounded-xl bg-gradient-to-r from-[#8A5A7B] to-[#D988A1] text-center text-[10px] font-heading font-bold text-white shadow-md">
              ✦ Simulate collection dispatch
            </div>
          </div>

          {/* Floating glowing dot particles */}
          <div className="absolute top-[15%] left-[5%] w-2 h-2 rounded-full bg-[#D988A1] blur-[1px] animate-pulse" />
          <div className="absolute bottom-[20%] right-[10%] w-3.5 h-3.5 rounded-full bg-[#8A5A7B] blur-[2px] animate-pulse" />

        </div>
      </main>

      {/* Trust & Features Footer Banner */}
      <section className="w-full border-t border-white/5 bg-[#13111C]/90 backdrop-blur-xl py-8 relative z-30">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-xs text-[#9E9AA7] uppercase tracking-widest font-mono text-center md:text-left">
            Empowering Indian Startups and SMEs with capital-smart AI infrastructure
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-xs text-[#9E9AA7] font-semibold font-mono">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#D988A1] stroke-[3]" /> NO CREDIT CARD</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#D988A1] stroke-[3]" /> AUTOMATED INGESTION</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#D988A1] stroke-[3]" /> SECURE &amp; COMPLIANT</span>
          </div>
        </div>
      </section>

      {/* Footnote */}
      <footer className="border-t border-white/[0.03] py-6 text-center text-[10px] md:text-xs text-[#9E9AA7] z-10 bg-black/40">
        <p>&copy; 2026 AARYA. All rights reserved.</p>
      </footer>
    </div>
  );
};
