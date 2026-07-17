import React, { useState } from "react";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Settings, 
  Home, 
  LogOut,
  Sparkles,
  Upload,
  Search,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ViewType } from "../types";
import { useFinancials } from "../context/FinancialContext";

interface NavProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  businessName: string;
  onLogout: () => void;
}

export const Sidebar: React.FC<NavProps> = ({ currentView, setView, businessName, onLogout }) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "chat", label: "Ask AARYA Chat", icon: Sparkles },
    { id: "upload", label: "Data Upload", icon: Upload },
    { id: "founder", label: "Founder Summary", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside id="desktop-sidebar" className="hidden lg:flex flex-col w-[250px] bg-[#13111C] border-r border-neutral-200/10 dark:border-neutral-800/60 h-screen sticky top-0 text-white select-none">
      {/* Brand Logo */}
      <div className="p-6 border-b border-neutral-200/10 dark:border-neutral-800/60 flex items-center gap-3 bg-[#1F1D2B]/40 backdrop-blur-md">
        <img src="/logo.jpg" alt="AARYA Logo" className="w-10 h-10 rounded-xl object-cover shadow-md shadow-[#D988A1]/20" />
        <div>
          <h1 className="font-heading font-bold text-lg tracking-wider text-white flex items-center gap-1">
            AARYA
          </h1>
          <p className="text-[10px] text-[#9E9AA7] truncate max-w-[140px] font-mono uppercase tracking-widest">AI CFO COPILOT</p>
        </div>
      </div>

      {/* Primary Links */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <div className="text-[9px] font-heading font-bold uppercase tracking-widest text-[#9E9AA7] px-3 mb-3">
          FINANCE COMMAND
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`nav-link-${item.id}`}
              onClick={() => setView(item.id as ViewType)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-[24px] transition-all duration-300 text-xs font-semibold ${
                isActive
                  ? "bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white shadow-lg shadow-[#8A5A7B]/20 scale-[1.02]"
                  : "text-[#9E9AA7] hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#9E9AA7]"}`} />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}

        {/* Deleted Marketing section to maintain strict scope discipline */}
      </nav>


      {/* User Footer block */}
      <div className="p-4 border-t border-neutral-200/10 dark:border-neutral-800/60 flex items-center justify-between gap-3 bg-[#1F1D2B]/50">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D988A1] to-[#8A5A7B] flex items-center justify-center text-xs font-bold text-white">
            CF
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white truncate">{businessName || "Indian Startup"}</div>
            <div className="text-[9px] text-[#9E9AA7] truncate font-mono">FOUNDER</div>
          </div>
        </div>
        <button
          id="nav-logout-btn"
          onClick={onLogout}
          title="Logout"
          className="p-2 rounded-lg text-[#9E9AA7] hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

export const BottomNav: React.FC<{
  currentView: ViewType;
  setView: (view: ViewType) => void;
}> = ({ currentView, setView }) => {
  const tabs = [
    { id: "dashboard", label: "Home", icon: Home },
    { id: "chat", label: "Chat", icon: Sparkles },
    { id: "upload", label: "Upload", icon: Upload },
    { id: "founder", label: "Summary", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 flex justify-center">
      <nav id="mobile-bottom-nav" className="w-full max-w-md bg-[#1F1D2B]/90 backdrop-blur-xl rounded-[24px] px-3 py-2 flex items-center justify-around text-white shadow-2xl border border-neutral-200/10 dark:border-neutral-800/40">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;

          return (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              onClick={() => {
                setView(tab.id as ViewType);
              }}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-[20px] text-xs min-w-[48px] transition-all duration-300 ${
                isActive 
                  ? "bg-gradient-to-r from-[#D988A1] to-[#8A5A7B] text-white font-bold shadow-md shadow-[#8A5A7B]/20 scale-105" 
                  : "text-[#9E9AA7] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {isActive && (
                <span className="text-[10px] tracking-tight font-medium hidden xs:inline">
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export const MobileHeader: React.FC<{ currencySymbol?: string }> = ({ currencySymbol = "$" }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { overdue30DaysCount, overdue30DaysTotal, loading: financialsLoading } = useFinancials();

  // Determine message content matching DashboardView's logic
  const notificationText = financialsLoading
    ? "Checking backend transaction ledger for overdue items..."
    : overdue30DaysCount > 0
    ? `${overdue30DaysCount} ${
        overdue30DaysCount === 1 ? "invoice/account" : "invoices/accounts"
      } crossing 30 days overdue today (${currencySymbol}${overdue30DaysTotal.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })} exposure). Recommend sending a collection reminder.`
    : "0 invoices crossing 30 days overdue today. All customer receivables and accounts are within normal payment terms.";

  return (
    <header id="mobile-top-header" className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#13111C]/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 select-none shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      {/* Click outside overlay for notifications */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-30 bg-transparent" 
          onClick={() => setShowNotifications(false)}
        />
      )}

      {/* Left: Avatar + Title */}
      <div className="flex items-center gap-3">
        {/* Gradient Border Avatar */}
        <div className="w-10 h-10 rounded-full p-[1.5px] bg-gradient-to-tr from-[#D988A1] via-[#8A5A7B] to-[#f472b6]">
          <div className="w-full h-full rounded-full bg-[#13111C] overflow-hidden flex items-center justify-center">
            <img 
              src="https://cdn.phototourl.com/free/2026-07-17-12055659-fac4-4b5b-b89f-1cb94e6d02b0.png" 
              alt="AARYA Logo" 
              className="w-full h-full rounded-full object-cover" 
            />
          </div>
        </div>
        
        {/* Texts */}
        <div className="flex flex-col">
          <span className="text-[9px] text-[#D988A1] font-mono tracking-widest uppercase font-semibold leading-tight">
            CFO AGENT
          </span>
          <span className="text-sm font-bold text-white tracking-wide leading-tight mt-0.5">
            AARYA NODE
          </span>
        </div>
      </div>

      {/* Right: Search & Bell Buttons */}
      <div className="flex items-center gap-2 relative z-50">
        <button 
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
          aria-label="Search"
        >
          <Search className="w-4 h-4 text-[#9E9AA7]" />
        </button>
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-[#9E9AA7]" />
          {/* Notification Red Dot */}
          <span className="absolute top-[2px] right-[2px] w-2 h-2 bg-[#EF4444] rounded-full border border-[#13111C]" />
        </button>

        {/* Notifications Dropdown Panel */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 w-[320px] xs:w-[350px] bg-[#1a1824] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                <span className="text-xs font-mono uppercase tracking-widest text-[#9E9AA7] font-bold">
                  Notifications
                </span>
                {overdue30DaysCount > 0 && (
                  <span className="text-[9px] bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    Action Required
                  </span>
                )}
              </div>

              {/* Notification Items List */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {/* Briefing Notification Card - Styled premium like the user's mock */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-all text-left">
                  <span className="text-base mt-0.5 shrink-0">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[9px] font-semibold text-white/90 bg-[#312328] border border-[#48373d] px-2 py-0.5 rounded-md font-mono tracking-wider">
                        BRIEFING
                      </span>
                    </div>
                    <p className="text-xs text-[#E2DFE9] font-medium leading-relaxed">
                      {notificationText}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
