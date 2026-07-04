import { BusinessState } from "./types";

/**
 * Clean empty state — used for brand-new users who have just signed up.
 * No placeholder data. Everything starts blank so the real backend data
 * drives the UI after onboarding.
 */
export const initialBusinessState: BusinessState = {
  businessName: "",
  industry: "",
  currency: "INR (₹)",
  currencySymbol: "₹",
  startingBalance: 0,
  ledger: [],
  invoices: [],
  activities: [],
  chatHistory: [
    {
      id: "msg_welcome",
      sender: "agent",
      text: "Hello! I am A.A.R.Y.A — your Autonomous AI for Runway, Yield & Analytics. Complete your company onboarding and upload your first ledger sheet to get started. I'm ready to analyze your cash flow, collections, and runway the moment data arrives.",
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    },
  ],
  onboarded: false,
  loggedIn: false,
  userEmail: undefined,
  companyId: undefined,
};
