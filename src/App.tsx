import React, { useState, useEffect } from "react";
import { ViewType, BusinessState, LedgerItem, Invoice, Activity, CfoMessage } from "./types";
import { initialBusinessState } from "./mockData";
import { LandingView } from "./components/LandingView";
import { AuthView } from "./components/AuthView";
import { OnboardingView } from "./components/OnboardingView";
import { Sidebar, BottomNav } from "./components/Navigation";
import { DashboardView } from "./components/DashboardView";
import { CfoChatView } from "./components/CfoChatView";
import { LedgerView } from "./components/LedgerView";
import { BillingView } from "./components/BillingView";
import { RevenueIntelView } from "./components/RevenueIntelView";
import { AuditTrailView } from "./components/AuditTrailView";
import { SettingsView } from "./components/SettingsView";
import { UploadView } from "./components/UploadView";
import { FounderSummaryView } from "./components/FounderSummaryView";

export default function App() {
  const [state, setState] = useState<BusinessState>(() => {
    try {
      const stored = localStorage.getItem("nova_cfo_business_state");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.loggedIn = true;
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse cached business state:", e);
    }
    // Fallback to rich preseeded metrics
    return { ...initialBusinessState, loggedIn: true };
  });

  const [currentView, setView] = useState<ViewType>("dashboard");
  const [quickCustomerName, setQuickCustomerName] = useState<string>("");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const storedTheme = localStorage.getItem("nova_cfo_theme");
      if (storedTheme === "dark" || storedTheme === "light") {
        return storedTheme;
      }
    } catch (e) {
      console.error("Failed to parse cached theme state:", e);
    }
    return "dark";
  });

  // Sync state mutations to LocalStorage for durability
  useEffect(() => {
    localStorage.setItem("nova_cfo_business_state", JSON.stringify(state));
  }, [state]);

  // Handle theme class on document element
  useEffect(() => {
    localStorage.setItem("nova_cfo_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Global action controllers
  const logActivity = (act: Omit<Activity, "id" | "timestamp">) => {
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 16);
    const newActivity: Activity = {
      ...act,
      id: "act_" + Date.now(),
      timestamp
    };
    setState(prev => ({
      ...prev,
      activities: [newActivity, ...prev.activities]
    }));
  };

  const addLedgerItem = (item: LedgerItem) => {
    setState(prev => ({
      ...prev,
      ledger: [item, ...prev.ledger]
    }));
  };

  const updateLedgerItemAmount = (id: string, amount: number, dueDate?: string) => {
    setState(prev => ({
      ...prev,
      ledger: prev.ledger.map(item => 
        item.id === id ? { ...item, amount, dueDate, overdue: amount > 0 && item.dueDate ? new Date(item.dueDate) < new Date() : false } : item
      )
    }));
  };

  const addInvoice = (invoice: Invoice) => {
    setState(prev => ({
      ...prev,
      invoices: [invoice, ...prev.invoices]
    }));
    
    // Automatically post to ledger as well to keep balances in sync!
    const existingLedger = state.ledger.find(item => item.name.toLowerCase() === invoice.customer.toLowerCase());
    if (existingLedger) {
      const impactVal = invoice.status === "Paid" ? 0 : invoice.amount;
      updateLedgerItemAmount(existingLedger.id, existingLedger.amount + impactVal, invoice.dueDate);
    } else {
      // Create new customer ledger automatically if they don't exist
      const initials = invoice.customer.split(" ").map(n => n[0]).join("").substring(0,2).toUpperCase();
      const newItem: LedgerItem = {
        id: invoice.customerId,
        name: invoice.customer,
        amount: invoice.status === "Paid" ? 0 : invoice.amount,
        overdue: invoice.status === "Overdue",
        dueDate: invoice.dueDate,
        email: "billing@client.com",
        phone: "+1 415-555-0199",
        initials
      };
      addLedgerItem(newItem);
    }
  };

  const addChatMessage = (msg: CfoMessage) => {
    setState(prev => ({
      ...prev,
      chatHistory: [...prev.chatHistory, msg]
    }));
  };

  const clearChat = () => {
    setState(prev => ({
      ...prev,
      chatHistory: [
        {
          id: "msg_reinit_" + Date.now(),
          sender: "agent",
          text: "A.A.R.Y.A CFO Session has been reset. How can I assist you with ledger audits, collection tracking, or cash flow advice today?",
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        }
      ]
    }));
  };

  const updateBusinessMetadata = (name: string, industry: string) => {
    setState(prev => ({
      ...prev,
      businessName: name,
      industry
    }));
    logActivity({
      actionType: "settings",
      description: `Updated business metadata profile name to ${name}`,
      amount: 0
    });
  };

  const handleLoginSuccess = (email: string) => {
    setState(prev => ({
      ...prev,
      loggedIn: true,
      userEmail: email
    }));
    logActivity({
      actionType: "onboarding",
      description: `Successful sign-in with client node: ${email}`,
      amount: 0
    });

    if (state.onboarded) {
      setView("dashboard");
    } else {
      setView("onboarding");
    }
  };

  const handleOnboardingComplete = (data: {
    businessName: string;
    industry: string;
    currency: string;
    currencySymbol: string;
    startingBalance: number;
  }) => {
    setState(prev => ({
      ...prev,
      businessName: data.businessName,
      industry: data.industry,
      currency: data.currency,
      currencySymbol: data.currencySymbol,
      startingBalance: data.startingBalance,
      onboarded: true
    }));

    logActivity({
      actionType: "onboarding",
      description: `Completed corporate onboarding for: ${data.businessName}`,
      amount: data.startingBalance
    });

    setView("dashboard");
  };

  const handleLogout = () => {
    setState(prev => ({
      ...prev,
      loggedIn: false
    }));
    setView("landing");
  };

  // Navigates directly into virtual CFO chat with preseeded prompt
  const handleAskNovaQuick = (prompt: string) => {
    setView("chat");
    setTimeout(() => {
      const userMsg: CfoMessage = {
        id: "msg_quick_" + Date.now(),
        sender: "user",
        text: prompt,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      };
      addChatMessage(userMsg);
      // Trigger API fetch
      triggerChatFetch(userMsg, prompt);
    }, 100);
  };

  const triggerChatFetch = async (userMsg: CfoMessage, text: string) => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...state.chatHistory, userMsg],
          context: {
            businessName: state.businessName,
            industry: state.industry,
            currency: state.currency,
            currencySymbol: state.currencySymbol,
            startingBalance: state.startingBalance,
            ledger: state.ledger,
            invoices: state.invoices,
            activities: state.activities
          }
        })
      });

      const data = await response.json();
      
      addChatMessage({
        id: "msg_agent_quick_" + Date.now(),
        sender: "agent",
        text: data.reply || "Financial assessment failed to initialize.",
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      });
    } catch (err) {
      console.error("Chat proxy error during quick prompt:", err);
    }
  };

  // Link from other parts of dashboard directly into deep customer details inside LedgerView
  const handleQuickViewCustomer = (customerName: string) => {
    setQuickCustomerName(customerName);
    setView("ledger");
  };

  // RENDER FLOW
  if (currentView === "landing") {
    return (
      <LandingView 
        onStart={() => {
          if (state.loggedIn) {
            setView(state.onboarded ? "dashboard" : "onboarding");
          } else {
            setView("auth");
          }
        }} 
        loggedIn={state.loggedIn}
      />
    );
  }

  if (currentView === "auth") {
    return (
      <AuthView 
        initialEmail={state.userEmail || ""}
        onBack={() => setView("landing")}
        onSuccess={handleLoginSuccess}
      />
    );
  }

  if (currentView === "onboarding") {
    return (
      <OnboardingView 
        defaultEmail={state.userEmail || ""}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // CORE APPLICATION LAYOUT (Sidebar + Main Content Panel + BottomNav)
  return (
    <div 
      id="app-workspace-layout" 
      className="flex h-screen overflow-hidden relative font-sans transition-colors duration-300 bg-gradient-to-br from-[#0f0c29] via-[#15112e] to-[#302b63] text-[#9E9AA7]"
    >
      {/* Abstract, blurred, glowing radial gradients in the background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-[#D988A1] opacity-[0.24] blur-[150px]"></div>
        <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] rounded-full bg-[#8A5A7B] opacity-[0.26] blur-[160px]"></div>
        <div className="absolute -bottom-20 left-1/3 w-[500px] h-[500px] rounded-full bg-[#D988A1] opacity-[0.18] blur-[130px]"></div>
        <div className="absolute top-1/2 left-10 w-[300px] h-[300px] rounded-full bg-[#8A5A7B] opacity-[0.15] blur-[100px]"></div>
      </div>
      
      {/* Desktop Left Sidebar Navigation */}
      <Sidebar 
        currentView={currentView}
        setView={setView}
        businessName={state.businessName}
        onLogout={handleLogout}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Main Content (Center, Flexible) + AI Copilot Panel (Right, 350px) Layout */}
      <div className="flex-1 flex overflow-hidden min-w-0 relative">
        
        {/* Main core center view area */}
        <main id="app-main-panel" className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {currentView === "dashboard" && (
            <DashboardView 
              state={state}
              onAskNova={handleAskNovaQuick}
              onQuickViewCustomer={handleQuickViewCustomer}
              setView={setView}
            />
          )}

          {currentView === "upload" && (
            <UploadView 
              state={state}
              logActivity={logActivity}
              addLedgerItem={addLedgerItem}
            />
          )}

          {currentView === "founder" && (
            <FounderSummaryView 
              state={state}
            />
          )}

          {currentView === "chat" && (
            <CfoChatView 
              state={state}
              addChatMessage={addChatMessage}
              clearChat={clearChat}
              currencySymbol={state.currencySymbol}
            />
          )}

          {currentView === "ledger" && (
            <LedgerView 
              state={state}
              addLedgerItem={addLedgerItem}
              updateLedgerItemAmount={updateLedgerItemAmount}
              logActivity={logActivity}
              selectedCustomerName={quickCustomerName}
              clearSelectedCustomer={() => setQuickCustomerName("")}
            />
          )}

          {currentView === "billing" && (
            <BillingView 
              state={state}
              addInvoice={addInvoice}
              logActivity={logActivity}
            />
          )}

          {currentView === "intelligence" && (
            <RevenueIntelView 
              state={state}
            />
          )}

          {currentView === "audit" && (
            <AuditTrailView 
              state={state}
            />
          )}

          {currentView === "settings" && (
            <SettingsView 
              state={state}
              onUpdateBusiness={updateBusinessMetadata}
              onLogout={handleLogout}
              theme={theme}
              setTheme={setTheme}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Navigation bar */}
      <BottomNav 
        currentView={currentView}
        setView={setView}
      />
    </div>
  );
}
