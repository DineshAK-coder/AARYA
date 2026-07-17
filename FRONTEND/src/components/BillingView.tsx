import React, { useState } from "react";
import { Plus, Trash2, CheckCircle, Receipt, ArrowRight, FileText, Check, AlertCircle, X } from "lucide-react";
import { Invoice, BusinessState, LedgerItem, InvoiceLineItem, Activity } from "../types";
import { motion } from "motion/react";

interface BillingProps {
  state: BusinessState;
  addInvoice: (invoice: Invoice) => void;
  logActivity: (activity: Omit<Activity, "id" | "timestamp">) => void;
}

export const BillingView: React.FC<BillingProps> = ({ state, addInvoice, logActivity }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Invoice Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState(state.ledger[0]?.id || "");
  const [invoiceDate, setInvoiceDate] = useState("2026-07-03");
  const [invoiceDueDate, setInvoiceDueDate] = useState("2026-07-17");
  const [status, setStatus] = useState<"Paid" | "Pending" | "Overdue">("Pending");
  
  // Line items state
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { id: "li_init_1", description: "Advisory Service Hour", qty: 1, price: 150.00 }
  ]);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("150.00");

  // Success indicator
  const [successMsg, setSuccessMsg] = useState("");

  const handleAddLineItem = () => {
    if (!newItemDesc.trim()) return;
    const qty = parseInt(newItemQty) || 1;
    const price = parseFloat(newItemPrice) || 0;

    const newItem: InvoiceLineItem = {
      id: "li_" + Date.now(),
      description: newItemDesc,
      qty,
      price
    };

    setLineItems([...lineItems, newItem]);
    setNewItemDesc("");
    setNewItemQty("1");
    setNewItemPrice("150.00");
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;

    const targetCustomer = state.ledger.find(item => item.id === selectedCustomerId);
    if (!targetCustomer) return;

    // Calculate total amount from line items
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const newInvoice: Invoice = {
      id: "INV-" + (1000 + state.invoices.length + 1),
      customer: targetCustomer.name,
      customerId: targetCustomer.id,
      amount: totalAmount,
      status: status,
      date: invoiceDate,
      dueDate: invoiceDueDate,
      lineItems: lineItems
    };

    addInvoice(newInvoice);
    logActivity({
      actionType: "billing",
      customer: targetCustomer.name,
      description: `Compiled and finalized Invoice ${newInvoice.id} with ${lineItems.length} line items`,
      amount: totalAmount
    });

    setSuccessMsg(`Invoice ${newInvoice.id} successfully compiled and logged!`);
    setTimeout(() => setSuccessMsg(""), 4000);

    // Reset Form
    setLineItems([{ id: "li_init_1", description: "Advisory Service Hour", qty: 1, price: 150.00 }]);
    setShowCreateModal(false);
  };

  return (
    <div id="billing-view-container" className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 text-neutral-900 bg-[#EAE7E4]">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight text-neutral-900">Billing & Invoicing Workspace</h2>
          <p className="text-xs text-neutral-500 mt-1">Compile client invoices, manage tax receipts, and track collection terms.</p>
        </div>

        <button
          id="billing-create-invoice-btn"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#141414] text-[#FF3B30] font-heading font-bold text-sm hover:scale-103 transition-all cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Invoice Document</span>
        </button>
      </div>

      {successMsg && (
        <div id="billing-success-banner" className="mb-6 p-4 bg-[#F4F2F0] border border-[#E2E1DE] rounded-xl text-[#0E3D26] text-xs font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle className="w-4.5 h-4.5 text-[#141414]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Invoice summary cards panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-sm">
          <div className="text-xs text-neutral-500 font-mono">TOTAL PAID INVOICES</div>
          <div className="text-2xl font-heading font-bold text-[#141414] mt-2 font-mono">
            {state.currencySymbol}{state.invoices.filter(i => i.status === "Paid").reduce((sum, i) => sum + i.amount, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-neutral-400 mt-2">&bull; Fully collected asset balance</div>
        </div>

        <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-sm">
          <div className="text-xs text-neutral-500 font-mono">PENDING CLIENT RECEIVABLES</div>
          <div className="text-2xl font-heading font-bold text-neutral-800 mt-2 font-mono">
            {state.currencySymbol}{state.invoices.filter(i => i.status === "Pending").reduce((sum, i) => sum + i.amount, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#141414] font-semibold mt-2">&bull; Expected in current payment term</div>
        </div>

        <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-sm">
          <div className="text-xs text-neutral-500 font-mono text-red-600">TOTAL OVERDUE OUTSTANDING</div>
          <div className="text-2xl font-heading font-bold text-red-600 mt-2 font-mono">
            {state.currencySymbol}{state.invoices.filter(i => i.status === "Overdue").reduce((sum, i) => sum + i.amount, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-red-600 font-semibold mt-2">&bull; Overdue term - requires priority collection</div>
        </div>
      </div>

      {/* Invoices List Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E5E7EB] hidden md:grid grid-cols-12 text-[10px] font-mono uppercase tracking-wider font-bold text-neutral-500 bg-[#F9FAFB]">
          <div className="col-span-2">Invoice reference</div>
          <div className="col-span-4">Associated Customer</div>
          <div className="col-span-2">Issue Date</div>
          <div className="col-span-2">Terms Standing</div>
          <div className="col-span-2 text-right">Invoice Amount</div>
        </div>

        <div className="divide-y divide-[#E5E7EB]">
          {state.invoices.map((inv) => (
            <div key={inv.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center hover:bg-[#F9FAFB] transition-colors">
              <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-400" />
                <span className="text-xs font-semibold text-neutral-800 font-mono">{inv.id}</span>
              </div>
              <div className="col-span-1 md:col-span-4 text-xs font-bold text-neutral-900">
                {inv.customer}
              </div>
              <div className="col-span-1 md:col-span-2 text-xs text-neutral-500 font-mono">
                {inv.date}
              </div>
              <div className="col-span-1 md:col-span-2">
                {inv.status === "Paid" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-green-100 text-green-700 border border-green-200">
                    <Check className="w-3 h-3" /> Fully Collected
                  </span>
                ) : inv.status === "Overdue" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-red-50 text-red-600 border border-red-100 animate-pulse">
                    <AlertCircle className="w-3 h-3" /> Overdue Term
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-neutral-100 text-neutral-600">
                    Expected Pending
                  </span>
                )}
              </div>
              <div className="col-span-1 md:col-span-2 text-right text-sm font-bold font-mono text-neutral-900 tracking-tight tabular-nums">
                {state.currencySymbol}{inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-3xl p-6 text-neutral-900 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <h3 className="font-heading font-bold text-lg text-neutral-900">Compile Billing Invoice</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-6">
              
              {/* Customer Selector & Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Target Client Node</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs outline-none focus:border-[#141414] text-neutral-900"
                  >
                    {state.ledger.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs outline-none focus:border-[#141414] text-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Terms Due Date</label>
                  <input
                    type="date"
                    required
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs outline-none focus:border-[#141414] text-neutral-900"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Terms Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {["Paid", "Pending", "Overdue"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st as any)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        status === st 
                          ? "bg-[#F4F2F0] text-[#141414] border-[#E2E1DE]" 
                          : "bg-white border-neutral-200 text-neutral-500"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Line Items Section */}
              <div className="space-y-4 border-t border-neutral-100 pt-4">
                <h4 className="font-heading font-bold text-xs text-neutral-500 uppercase tracking-wider">Invoice Line Items</h4>
                
                {/* Active Items Table */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] flex items-center justify-between text-xs">
                      <div className="flex-1 pr-4 truncate font-medium text-neutral-800">{item.description}</div>
                      <div className="flex items-center gap-6">
                        <span className="text-neutral-500 font-mono">Qty: {item.qty}</span>
                        <span className="text-neutral-500 font-mono">Price: {state.currencySymbol}{item.price.toFixed(2)}</span>
                        <span className="font-bold font-mono text-neutral-900 text-right w-16">
                          {state.currencySymbol}{(item.price * item.qty).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inline item adder form */}
                <div className="p-3 bg-[#F9FAFB] rounded-xl border border-neutral-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-end shadow-sm">
                  <div className="col-span-1 md:col-span-6 space-y-1">
                    <label className="text-[9px] font-bold text-neutral-500 uppercase">Item Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Strategic Advisory Service"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-neutral-500 uppercase">Qty</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3 space-y-1">
                    <label className="text-[9px] font-bold text-neutral-500 uppercase">Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="150.00"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="col-span-1 py-1.5 rounded-lg bg-white border border-neutral-200 text-[#141414] text-xs font-bold hover:border-[#141414] hover:bg-[#F4F2F0] flex items-center justify-center transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex justify-between items-center bg-neutral-50 p-4 rounded-xl border border-neutral-200 font-heading">
                <span className="text-sm font-bold text-neutral-500">Total Invoice Valuation</span>
                <span className="text-xl font-bold text-[#141414] font-mono">
                  {state.currencySymbol}{lineItems.reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Submission button */}
              <button
                type="submit"
                id="invoice-submit-btn"
                className="w-full py-3.5 bg-[#141414] text-[#FF3B30] font-heading font-bold text-sm rounded-xl hover:scale-101 active:scale-99 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Finalize & Log Invoice Document</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </button>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};
