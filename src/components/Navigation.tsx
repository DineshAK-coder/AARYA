import React, { useState } from "react";
import { 
  LayoutDashboard, 
  BookOpen, 
  Bot, 
  FileText, 
  TrendingUp, 
  History, 
  Settings, 
  Home, 
  LogOut,
  Sparkles,
  DollarSign,
  MoreHorizontal,
  Sun,
  Moon,
  Upload,
  Smartphone,
  Bell,
  X,
  AlertTriangle,
  CheckCircle2,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ViewType } from "../types";

interface NavProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  businessName: string;
  onLogout: () => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const Sidebar: React.FC<NavProps> = ({ currentView, setView, businessName, onLogout, theme, setTheme }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "briefing-alert",
      type: "warning",
      title: "Morning Briefing Alert",
      message: "3 invoices crossing 30 days overdue today. Recommend sending a collection reminder.",
      time: "Just now",
      read: false,
    },
    {
      id: "1",
      type: "warning",
      title: "Salary Authorization Risk",
      message: "Johnathan Doe authorization pending node confirmation for $18,500/mo.",
      time: "2 mins ago",
      read: false,
    },
    {
      id: "2",
      type: "success",
      title: "Node Confirmed Successfully",
      message: "Aria Sterling node confirmed at VP status with billing $16,200/mo.",
      time: "15 mins ago",
      read: false,
    },
    {
      id: "3",
      type: "info",
      title: "AARYA Audit Node Live",
      message: "CFO agent system secure 5G uplink tunnel established on port 3000.",
      time: "1 hour ago",
      read: false,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "chat", label: "Ask AARYA Chat", icon: Sparkles },
    { id: "upload", label: "Data Upload", icon: Upload },
    { id: "founder", label: "Founder Summary", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside id="desktop-sidebar" className="hidden lg:flex flex-col w-[250px] bg-[#13111C] border-r border-neutral-200/10 dark:border-neutral-800/60 h-screen sticky top-0 text-white select-none relative z-50">
      {/* Brand Logo */}
      <div className="p-6 border-b border-neutral-200/10 dark:border-neutral-800/60 flex items-center justify-between bg-[#1F1D2B]/40 backdrop-blur-md relative">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D988A1] to-[#8A5A7B] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-[#D988A1]/20">
            A
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg tracking-wider text-white flex items-center gap-1">
              AARYA
            </h1>
            <p className="text-[10px] text-[#9E9AA7] truncate max-w-[100px] font-mono uppercase tracking-widest">AI CFO</p>
          </div>
        </div>

        {/* Desktop Notification Bell option */}
        <button
          id="desktop-notification-toggle"
          onClick={() => {
            setShowNotifications(!showNotifications);
            if (!showNotifications) markAllAsRead();
          }}
          className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all relative shrink-0"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-[#13111C] animate-pulse"></span>
          )}
        </button>

        {/* Floating Desktop Dropdown Menu relative to brand box */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-[255px] top-4 w-80 bg-[#141121] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 overflow-hidden text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#D988A1]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    System Alerts
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {notifications.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex gap-2.5 p-2.5 rounded-xl transition-all ${
                      alert.read ? "bg-white/[0.02]" : "bg-white/[0.06] border-l-2 border-[#D988A1]"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {alert.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                      {alert.type === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      {alert.type === "info" && <Shield className="w-3.5 h-3.5 text-cyan-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-white leading-tight">
                        {alert.title}
                      </div>
                      <div className="text-[10px] text-[#9E9AA7] mt-0.5 leading-snug font-normal">
                        {alert.message}
                      </div>
                      <div className="text-[8px] text-white/30 font-mono mt-1">
                        {alert.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => {
                    setView("chat");
                    setShowNotifications(false);
                  }}
                  className="text-[9px] text-[#D988A1] hover:underline uppercase tracking-widest font-bold font-mono"
                >
                  Consult CFO Terminal &rarr;
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
