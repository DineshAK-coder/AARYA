import React, { useState, useEffect } from "react";
import { ViewType, BusinessState, LedgerItem, Invoice, Activity, CfoMessage } from "./types";
import { initialBusinessState } from "./mockData";
import { LandingView } from "./components/LandingView";
import { AuthView } from "./components/AuthView";
import { OnboardingView } from "./components/OnboardingView";
import { Sidebar, BottomNav, MobileHeader } from "./components/Navigation";
import { DashboardView } from "./components/DashboardView";
import { CfoChatView } from "./components/CfoChatView";
import { LedgerView } from "./components/LedgerView";
import { BillingView } from "./components/BillingView";
import { RevenueIntelView } from "./components/RevenueIntelView";
import { AuditTrailView } from "./components/AuditTrailView";
import { SettingsView } from "./components/SettingsView";
import { UploadView } from "./components/UploadView";
import { FounderSummaryView } from "./components/FounderSummaryView";
import { FinancialProvider } from "./context/FinancialContext";
import { supabase } from "./services/apiClient";

export default function App() {
  // ── App state — always starts as NOT logged in ─────────────────────────────
  // We restore the session from Supabase below (useEffect). We do NOT
  // trust localStorage's loggedIn flag directly because the JWT may have
  // expired. Only a valid Supabase session counts.
  const [state, setState] = useState<BusinessState>(() => {
    try {
      const stored = localStorage.getItem("aarya_business_state");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Always reset loggedIn — Supabase session check will set it
        parsed.loggedIn = false;
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse cached business state:", e);
    }
    return { ...initialBusinessState };
  });

  const [currentView, setView] = useState<ViewType>("landing");
  const [quickCustomerName, setQuickCustomerName] = useState<string>("");
  const [preseededPrompt, setPreseededPrompt] = useState<string | null>(null);

  // ── Persist state to localStorage ─────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("aarya_business_state", JSON.stringify(state));
  }, [state]);

  // ── Public Profile Check & Strict Routing ────────────────────────────────
  // Do not rely solely on supabase.auth.getSession(). After confirming a session exists,
  // explicitly query the public users table for the matching user_id.
  const checkUserProfileAndRoute = async (user: any) => {
    if (!supabase || !user) return;
    try {
      const { data: dbUser } = await supabase
        .from("users")
        .select("id, company_id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (dbUser && dbUser.company_id) {
        // Both session and public users row exist: allow access to /dashboard
        setState(prev => ({
          ...prev,
          loggedIn: true,
          userEmail: user.email ?? prev.userEmail,
          companyId: dbUser.company_id,
          onboarded: true,
        }));
        setView(prev => (prev === "landing" || prev === "auth" || prev === "onboarding" ? "dashboard" : prev));
      } else {
        // Auth session exists but public users row does NOT exist: force redirect to /onboarding
        setState(prev => ({
          ...prev,
          loggedIn: true,
          userEmail: user.email ?? prev.userEmail,
          onboarded: false,
        }));
        setView("onboarding");
      }
    } catch (err) {
      console.error("Error checking user profile in public.users:", err);
      setState(prev => ({
        ...prev,
        loggedIn: true,
        userEmail: user.email ?? prev.userEmail,
        onboarded: false,
      }));
      setView("onboarding");
    }
  };

  // ── Restore Supabase session on mount ──────────────────────────────────────
  // Also subscribe to auth events so any sign-in / sign-out / token refresh
  // automatically keeps the UI in sync without page reload.
  useEffect(() => {
    if (!supabase) return;

    // Restore existing session (e.g. after page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkUserProfileAndRoute(session.user);
      }
    });

    // Subscribe to future auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          checkUserProfileAndRoute(session.user);
        } else {
          // Signed out — reset to clean state
          setState({ ...initialBusinessState });
          setView("landing");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Always keep dark mode active
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

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

  const handleLoginSuccess = (email: string, authMode: "login" | "signup") => {
    setState(prev => ({
      ...prev,
      loggedIn: true,
      userEmail: email
    }));
    logActivity({
      actionType: "onboarding",
      description: `Successful ${authMode === "login" ? "sign-in" : "sign-up"} with client node: ${email}`,
      amount: 0
    });

    // Verify user profile in public.users table before routing
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          checkUserProfileAndRoute(user);
        } else {
          setView("onboarding");
        }
      });
    } else {
      if (authMode === "login") {
        setView("dashboard");
      } else {
        setView("onboarding");
      }
    }
  };

  const handleOnboardingComplete = (data: {
    businessName: string;
    industry: string;
    currency: string;
    currencySymbol: string;
    startingBalance: number;
    companyId?: string;
  }) => {
    setState(prev => ({
      ...prev,
      businessName: data.businessName,
      industry: data.industry,
      currency: data.currency,
      currencySymbol: data.currencySymbol,
      startingBalance: data.startingBalance,
      companyId: data.companyId,
      onboarded: true,
    }));

    logActivity({
      actionType: "onboarding",
      description: `Completed corporate onboarding for: ${data.businessName}`,
      amount: data.startingBalance
    });

    setView("dashboard");
  };

  const handleLogout = async () => {
    // Sign out from Supabase — the onAuthStateChange listener will reset state
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      setState({ ...initialBusinessState });
      setView("landing");
    }
  };

  // Navigates directly into virtual CFO chat with preseeded prompt
  const handleAskNovaQuick = (prompt: string) => {
    setPreseededPrompt(prompt);
    setView("chat");
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

  // Enforce Strict Routing:
  // If user is logged in (auth session exists) but not onboarded (no public users row), force redirect to onboarding view
  if (state.loggedIn && !state.onboarded) {
    return (
      <OnboardingView 
        defaultEmail={state.userEmail || ""}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // CORE APPLICATION LAYOUT (Sidebar + Main Content Panel + BottomNav)
  return (
    <FinancialProvider state={state}>
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
        />

        {/* Main Content (Center, Flexible) + AI Copilot Panel (Right, 350px) Layout */}
        <div className="flex-1 flex overflow-hidden min-w-0 relative">
          
          {/* Main core center view area */}
          <main id="app-main-panel" className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
            <MobileHeader currencySymbol={state.currencySymbol} />
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

            {/* Always keep CfoChatView mounted so switching between tabs does NOT unmount the component and vanish the chat log */}
            <div className={currentView === "chat" ? "flex-1 flex flex-col min-w-0 h-full overflow-hidden" : "hidden"}>
              <CfoChatView 
                state={state}
                currencySymbol={state.currencySymbol}
                preseededPrompt={preseededPrompt}
                clearPreseededPrompt={() => setPreseededPrompt(null)}
              />
            </div>

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
    </FinancialProvider>
  );
}
