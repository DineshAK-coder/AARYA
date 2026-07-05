import React from "react";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Settings, 
  Home, 
  LogOut,
  Sparkles,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ViewType } from "../types";

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
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D988A1] to-[#8A5A7B] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-[#D988A1]/20">
          A
        </div>
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
