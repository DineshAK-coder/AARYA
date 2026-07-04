import React, { useState } from "react";
import { Search, Bell, X, Shield, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MobileHeaderProps {
  businessName: string;
  setView: (view: any) => void;
  onAskNova: (prompt: string) => void;
}

interface AlertItem {
  id: string;
  type: "warning" | "success" | "info" | "alert";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ businessName, setView, onAskNova }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<AlertItem[]>([
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

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      markAllAsRead();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onAskNova(searchQuery);
    setSearchQuery("");
    setShowSearch(false);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case "info":
        return <Shield className="w-4 h-4 text-cyan-500 shrink-0" />;
      default:
        return <TrendingUp className="w-4 h-4 text-rose-500 shrink-0" />;
    }
  };

  return (
    <header className="lg:hidden w-full bg-[#0A0814] border-b border-white/5 relative z-50 select-none">
      {/* 2. Main High-Fidelity Header Row */}
      <div className="px-5 py-3.5 flex items-center justify-between">
        {/* Left Side: Avatar with Glowing Pink Ring + CFO Text */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView("dashboard")}>
          {/* G Avatar with custom animated glowing ring */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FFD700] via-[#D988A1] to-[#8A5A7B] p-[1.5px] shadow-[0_0_15px_rgba(217,136,161,0.25)] flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-[#0E0B16] flex items-center justify-center font-black text-white text-sm font-sans tracking-tight">
              G
            </div>
          </div>
          {/* Text labels */}
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-[#9E9AA7] tracking-[0.12em] font-mono leading-none">
              CFO AGENT
            </span>
            <span className="text-[13px] font-extrabold text-white tracking-wide font-sans mt-0.5 leading-none">
              AARYA NODE
            </span>
          </div>
        </div>

        {/* Right Side: Circular Search & Notification Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Search Button */}
          <button
            id="mobile-search-toggle"
            onClick={() => setShowSearch(!showSearch)}
            className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notification Button with Floating Overlay Badge */}
          <button
            id="mobile-notification-toggle"
            onClick={handleNotificationClick}
            className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border border-[#0A0814] animate-pulse"></span>
            )}
          </button>
        </div>
      </div>

      {/* 3. Dropdown Overlays (Search bar and Notifications menu) */}
      <AnimatePresence>
        {/* Search Input Drawer overlay */}
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 bg-[#0E0B16] border-b border-white/5 p-4 z-40 shadow-2xl"
          >
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                placeholder="Ask AARYA CFO anything about your business..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1625] text-white placeholder-white/40 text-xs rounded-xl py-2.5 pl-4 pr-10 border border-white/10 focus:outline-none focus:border-[#D988A1] transition-colors"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-3 text-white/60 hover:text-white"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}

        {/* Floating Interactive Alerts dropdown overlay */}
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, type: "spring", damping: 18 }}
            className="absolute top-[100%] right-4 w-[calc(100vw-32px)] sm:w-80 bg-[#141121] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D988A1]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Node Alerts
                </span>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {notifications.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex gap-2.5 p-2.5 rounded-xl transition-all ${
                    alert.read ? "bg-white/[0.02]" : "bg-white/[0.06] border-l-2 border-[#D988A1]"
                  }`}
                >
                  <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-white leading-tight">
                      {alert.title}
                    </div>
                    <div className="text-[10px] text-[#9E9AA7] mt-0.5 leading-snug">
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
    </header>
  );
};
