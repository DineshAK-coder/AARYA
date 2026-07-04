export interface LedgerItem {
  id: string;
  name: string;
  amount: number; // positive = owed to us (debt), negative = we owe them (credit)
  dueDate?: string;
  overdue: boolean;
  email: string;
  phone: string;
  initials: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  customer: string;
  customerId: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
  date: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
}

export interface Activity {
  id: string;
  timestamp: string;
  actionType: "ledger" | "billing" | "chat" | "onboarding" | "settings";
  customer?: string;
  description: string;
  amount: number;
}

export interface CfoMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
}

export interface BusinessState {
  businessName: string;
  industry: string;
  currency: string;
  currencySymbol: string;
  startingBalance: number;
  ledger: LedgerItem[];
  invoices: Invoice[];
  activities: Activity[];
  chatHistory: CfoMessage[];
  onboarded: boolean;
  loggedIn: boolean;
  userEmail?: string;
}

export type ViewType =
  | "landing"
  | "auth"
  | "onboarding"
  | "dashboard"
  | "chat"
  | "ledger"
  | "billing"
  | "intelligence"
  | "audit"
  | "settings"
  | "upload"
  | "founder";
