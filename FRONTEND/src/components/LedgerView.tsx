import React, { useState } from "react";
import { 
  Search, 
  Plus, 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  X
} from "lucide-react";
import { motion } from "motion/react";
import { LedgerItem, BusinessState, Invoice, Activity } from "../types";

interface LedgerProps {
  state: BusinessState;
  addLedgerItem: (item: LedgerItem) => void;
  updateLedgerItemAmount: (id: string, amount: number, dueDate?: string) => void;
  logActivity: (activity: Omit<Activity, "id" | "timestamp">) => void;
  selectedCustomerName?: string; // Quick navigation reference
  clearSelectedCustomer: () => void;
}

export const LedgerView: React.FC<LedgerProps> = ({ 
  state, 
  addLedgerItem, 
  updateLedgerItemAmount, 
  logActivity,
  selectedCustomerName,
  clearSelectedCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Modals/forms state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAmount, setNewCustAmount] = useState("");
  const [newCustDueDate, setNewCustDueDate] = useState("2026-07-31");

  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryType, setEntryType] = useState<"debit" | "credit">("debit");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDesc, setEntryDesc] = useState("");

  // Reminder status indicator
  const [reminderSent, setReminderSent] = useState(false);

  // Auto-select quick viewed customer if any
  React.useEffect(() => {
    if (selectedCustomerName) {
      const found = state.ledger.find(item => item.name.toLowerCase() === selectedCustomerName.toLowerCase());
      if (found) {
        setSelectedCustomerId(found.id);
      }
    }
  }, [selectedCustomerName, state.ledger]);

  // Handle closing detail view
  const handleBackToList = () => {
    setSelectedCustomerId(null);
    clearSelectedCustomer();
  };

  // Create new customer action
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const parsedAmount = parseFloat(newCustAmount) || 0;
    const initials = newCustName
      .split(" ")
      .map(n => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "C";

    const newItem: LedgerItem = {
      id: "led_" + Date.now(),
      name: newCustName,
      amount: parsedAmount,
      overdue: parsedAmount > 0 && new Date(newCustDueDate) < new Date(),
      dueDate: newCustDueDate,
      email: newCustEmail || "billing@company.com",
      phone: newCustPhone || "+1 415-000-0000",
      initials
    };

    addLedgerItem(newItem);
    logActivity({
      actionType: "ledger",
      customer: newCustName,
      description: `Created new ledger node for customer: ${newCustName}`,
      amount: parsedAmount
    });

    // Reset Form
    setNewCustName("");
    setNewCustEmail("");
    setNewCustPhone("");
    setNewCustAmount("");
    setShowAddCustomer(false);
  };

  // Add a manual Debit/Credit transaction entry to active customer
  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;

    const currentCustomer = state.ledger.find(item => item.id === selectedCustomerId);
    if (!currentCustomer) return;

    const parsedVal = parseFloat(entryAmount) || 0;
    const computedChange = entryType === "debit" ? parsedVal : -parsedVal;
    const newTotal = currentCustomer.amount + computedChange;

    updateLedgerItemAmount(selectedCustomerId, newTotal, currentCustomer.dueDate);
    logActivity({
      actionType: "ledger",
      customer: currentCustomer.name,
      description: `Added manual ${entryType.toUpperCase()} journal entry: ${entryDesc || "Ledger adjustment"}`,
      amount: parsedVal
    });

    setEntryAmount("");
    setEntryDesc("");
    setShowAddEntry(false);
  };

  // Send automatic reminder
  const handleSendReminder = (customer: LedgerItem) => {
    setReminderSent(true);
    logActivity({
      actionType: "ledger",
      customer: customer.name,
      description: `Dispatched legal financial payment reminder on account balance of ${state.currencySymbol}${customer.amount.toFixed(2)}`,
      amount: customer.amount
    });

    setTimeout(() => {
      setReminderSent(false);
    }, 4000);
  };

  // Filtering ledger list
  const filteredLedger = state.ledger.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCustomer = state.ledger.find(item => item.id === selectedCustomerId);
  
  // Transactions associated with selected customer
  const customerInvoices = selectedCustomer 
    ? state.invoices.filter(inv => inv.customerId === selectedCustomer.id || inv.customer === selectedCustomer.name)
    : [];

  const customerActivities = selectedCustomer
    ? state.activities.filter(act => act.customer === selectedCustomer.name)
    : [];

  return (
    <div id="ledger-view-container" className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 text-neutral-900 bg-[#EAE7E4]">
      
      {/* Dynamic View switching based on selection */}
      {!selectedCustomerId ? (
        // VIEW 1: Searchable list
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight text-neutral-900">Accounts Receivable Ledger</h2>
              <p className="text-xs text-neutral-500 mt-1">Real-time ledger of debts, operational credits, and liquidity assets.</p>
            </div>
            
            <button
              id="ledger-add-customer-btn"
              onClick={() => setShowAddCustomer(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#141414] text-[#FF3B30] font-heading font-bold text-sm hover:scale-103 transition-all cursor-pointer self-start sm:self-auto shadow-sm"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Add Account Node</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-4.5 h-4.5" />
            <input
              type="text"
              id="ledger-search-input"
              placeholder="Search customers by name, initial, or operational email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-[#E5E7EB] focus:border-[#141414] focus:ring-1 focus:ring-[#141414] text-neutral-900 rounded-xl text-sm outline-none placeholder-neutral-400 transition-all shadow-sm"
            />
          </div>

          {/* Ledger Table/List block */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E5E7EB] hidden sm:grid grid-cols-12 text-[10px] font-mono uppercase tracking-wider font-bold text-neutral-500 bg-[#F9FAFB]">
              <div className="col-span-5">Account Customer</div>
              <div className="col-span-3">Action Status</div>
              <div className="col-span-2">Due Badge</div>
              <div className="col-span-2 text-right">Ledger Balance</div>
            </div>

            <div className="divide-y divide-[#E5E7EB]">
              {filteredLedger.length > 0 ? (
                filteredLedger.map((item) => (
                  <div
                    key={item.id}
                    id={`ledger-row-${item.id}`}
                    onClick={() => setSelectedCustomerId(item.id)}
                    className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center hover:bg-[#F9FAFB] cursor-pointer transition-all"
                  >
                    {/* Customer Identity */}
                    <div className="col-span-1 sm:col-span-5 flex items-center gap-3 overflow-hidden">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                        item.amount > 0 && item.overdue ? "bg-red-50 text-red-600 border border-red-200" : "bg-neutral-100 text-neutral-600"
                      }`}>
                        {item.initials}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs md:text-sm font-semibold text-neutral-900 truncate">{item.name}</div>
                        <div className="text-[10px] text-neutral-500 truncate">{item.email}</div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="col-span-1 sm:col-span-3">
                      {item.amount < 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#F4F2F0] text-[#0E3D26] border border-[#E2E1DE]">
                          Credit balance
                        </span>
                      ) : item.overdue ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-red-50 text-red-600 border border-red-100">
                          Overdue debt
                        </span>
                      ) : item.amount === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-neutral-100 text-neutral-500">
                          Settled balance
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-neutral-100 text-neutral-600">
                          Term Pending
                        </span>
                      )}
                    </div>

                    {/* Due Date Badge */}
                    <div className="col-span-1 sm:col-span-2 text-xs text-neutral-500 font-mono">
                      {item.dueDate || "N/A"}
                    </div>

                    {/* Monetary Balance (Owed) */}
                    <div className="col-span-1 sm:col-span-2 text-right">
                      <div className={`text-sm md:text-base font-heading font-bold tracking-tight tabular-nums ${
                        item.amount < 0 ? "text-[#141414]" : item.overdue ? "text-red-600" : "text-neutral-800"
                      }`}>
                        {item.amount < 0 ? "-" : ""}{state.currencySymbol}{Math.abs(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[9px] text-neutral-400 uppercase font-mono tracking-wider">
                        {item.amount < 0 ? "we owe them" : "they owe us"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-neutral-500 text-xs">
                  No active ledger nodes match your filters.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // VIEW 2: CUSTOMER DETAIL
        selectedCustomer && (
          <div className="space-y-6">
            {/* Header / Back Action */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <button
                id="ledger-back-btn"
                onClick={handleBackToList}
                className="flex items-center gap-2 text-xs text-neutral-500 hover:text-[#141414] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Accounts Ledger</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  id="ledger-add-entry-btn"
                  onClick={() => setShowAddEntry(true)}
                  className="px-4 py-2 bg-white border border-[#E5E7EB] hover:border-[#141414] text-xs font-bold rounded-xl text-neutral-700 hover:text-[#141414] transition-all shadow-sm"
                >
                  Add Ledger Entry
                </button>
                
                <button
                  id="ledger-send-reminder-btn"
                  onClick={() => handleSendReminder(selectedCustomer)}
                  className="px-5 py-2.5 bg-[#141414] text-[#FF3B30] text-xs font-heading font-bold rounded-xl hover:scale-103 active:scale-97 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Send CFO Reminder</span>
                </button>
              </div>
            </div>

            {/* Success flash */}
            {reminderSent && (
              <div id="reminder-success-flash" className="p-3 bg-[#F4F2F0] border border-[#E2E1DE] rounded-xl text-[#0E3D26] text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#141414]" />
                <span>Automated reminder email successfully compiled and dispatched to {selectedCustomer.email}!</span>
              </div>
            )}

            {/* Layout Detail Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Profile Card Column */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 h-fit space-y-6 shadow-sm">
                <div className="text-center pb-4 border-b border-neutral-100">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 border border-neutral-200 mx-auto flex items-center justify-center text-neutral-700 font-bold text-xl mb-4">
                    {selectedCustomer.initials}
                  </div>
                  <h3 className="font-heading font-bold text-lg text-neutral-900">{selectedCustomer.name}</h3>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">ID: {selectedCustomer.id.toUpperCase()}</p>
                </div>

                <div className="space-y-3.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500 font-medium">Email</span>
                    <span className="text-neutral-800 font-mono flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-neutral-500" />
                      {selectedCustomer.email}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500 font-medium">Phone</span>
                    <span className="text-neutral-800 font-mono flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-neutral-500" />
                      {selectedCustomer.phone}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500 font-medium">Last Term Due Date</span>
                    <span className="text-neutral-800 font-mono flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-neutral-500" />
                      {selectedCustomer.dueDate || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Account Health metrics */}
                <div className="pt-4 border-t border-neutral-100 space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-neutral-500">CFO Account Diagnostics</div>
                  <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6]">
                    <div className="text-xs text-neutral-400 font-medium">Active Standing Balance</div>
                    <div className={`text-2xl font-heading font-bold tracking-tight mt-1.5 ${
                      selectedCustomer.amount < 0 ? "text-[#141414]" : selectedCustomer.overdue ? "text-red-600" : "text-neutral-800"
                    }`}>
                      {selectedCustomer.amount < 0 ? "-" : ""}{state.currencySymbol}{Math.abs(selectedCustomer.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-2 flex items-center gap-1.5">
                      {selectedCustomer.amount > 0 ? (
                        <>
                          <AlertTriangle className={`w-3.5 h-3.5 ${selectedCustomer.overdue ? "text-red-600" : "text-amber-500"}`} />
                          <span>Requires monitoring: Pending collections</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-[#141414]" />
                          <span>Safe standing: Operational credit ledger</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions Timeline column */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Linked Invoices Section */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                  <h4 className="font-heading font-bold text-base text-neutral-900 mb-4">Invoiced Receivables</h4>
                  <div className="space-y-3">
                    {customerInvoices.length > 0 ? (
                      customerInvoices.map((inv) => (
                        <div key={inv.id} className="p-4 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-neutral-900">{inv.id}</div>
                              <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Date: {inv.date} &bull; terms due {inv.dueDate}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                              inv.status === "Paid" 
                                ? "bg-green-100 text-green-700 border border-green-200" 
                                : inv.status === "Overdue" 
                                ? "bg-red-50 text-red-600 border border-red-100" 
                                : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                            }`}>
                              {inv.status}
                            </span>
                            <span className="text-xs font-mono font-bold text-neutral-800 tracking-tight">
                              {state.currencySymbol}{inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-neutral-500 text-center py-4">No active billings logged for this customer node.</p>
                    )}
                  </div>
                </div>

                {/* Timeline History Section */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                  <h4 className="font-heading font-bold text-base text-neutral-900 mb-4">Account Action Trace</h4>
                  <div className="space-y-4 relative pl-4 border-l border-neutral-200">
                    {customerActivities.length > 0 ? (
                      customerActivities.map((act) => (
                        <div key={act.id} className="relative">
                          {/* Timeline dot */}
                          <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#F3F4F6] border border-neutral-200 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#141414]"></div>
                          </div>
                          
                          <div>
                            <span className="text-[10px] text-neutral-400 font-mono">{act.timestamp}</span>
                            <p className="text-xs font-medium text-neutral-800 mt-1">{act.description}</p>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              impact value: {state.currencySymbol}{act.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-neutral-500 text-center py-4">No historic audit entries logged for this account node.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )
      )}

      {/* MODAL 1: ADD CUSTOMER */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 text-neutral-900 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-heading font-bold text-base text-neutral-900">Create Ledger Account</h3>
              <button 
                onClick={() => setShowAddCustomer(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Customer Name</label>
                <input
                  type="text"
                  required
                  id="new-customer-name"
                  placeholder="e.g. Surinder Thakur"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-neutral-200 focus:border-[#141414] text-xs outline-none text-neutral-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Operational Email</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-neutral-200 focus:border-[#141414] text-xs outline-none text-neutral-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Phone Contact</label>
                <input
                  type="text"
                  placeholder="+1 415-000-0000"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-neutral-200 focus:border-[#141414] text-xs outline-none text-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Outstanding Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newCustAmount}
                    onChange={(e) => setNewCustAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-neutral-200 focus:border-[#141414] text-xs outline-none text-neutral-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Due Date</label>
                  <input
                    type="date"
                    value={newCustDueDate}
                    onChange={(e) => setNewCustDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-neutral-200 focus:border-[#141414] text-xs outline-none text-neutral-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="create-customer-submit"
                className="w-full py-3 bg-[#141414] text-[#FF3B30] text-xs font-heading font-bold rounded-xl transition-all shadow-sm"
              >
                Save Account Node
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: ADD LEDGER TRANSACTION ENTRY */}
      {showAddEntry && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 text-neutral-900 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-heading font-bold text-base text-neutral-900">Add Journal Entry</h3>
              <button 
                onClick={() => setShowAddEntry(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Entry Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEntryType("debit")}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      entryType === "debit" 
                        ? "bg-red-50 text-red-600 border-red-200" 
                        : "bg-white border-neutral-200 text-neutral-500"
                    }`}
                  >
                    Debit (They owe us more)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType("credit")}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      entryType === "credit" 
                        ? "bg-[#F4F2F0] text-[#141414] border-[#E2E1DE]" 
                        : "bg-white border-neutral-200 text-neutral-500"
                    }`}
                  >
                    Credit (Payment received / credit issued)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Impact Amount</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="0.00"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-neutral-200 focus:border-[#141414] text-xs outline-none text-neutral-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Journal Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Received partial bank wire"
                  value={entryDesc}
                  onChange={(e) => setEntryDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-neutral-200 focus:border-[#141414] text-xs outline-none text-neutral-900"
                />
              </div>

              <button
                type="submit"
                id="create-entry-submit"
                className="w-full py-3 bg-[#141414] text-[#FF3B30] text-xs font-heading font-bold rounded-xl transition-all shadow-sm"
              >
                Post Journal Entry
              </button>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};
