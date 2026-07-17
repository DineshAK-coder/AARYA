import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Check, AlertCircle, RefreshCw, Eye, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { BusinessState, LedgerItem } from "../types";
import { uploadTransactions } from "../services/apiClient";
import { useFinancials } from "../context/FinancialContext";

interface UploadViewProps {
  state: BusinessState;
  logActivity: (act: { actionType: "ledger"; description: string; amount: number }) => void;
  addLedgerItem: (item: LedgerItem) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ state, logActivity, addLedgerItem }) => {
  const { refreshFinancials } = useFinancials();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "parsed" | "integrated" | "error">("idle");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mappingSource, setMappingSource] = useState<string>("auto");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setUploadState("uploading");
    setUploadError(null);

    try {
      // ── Real backend call ──────────────────────────────────────────────────
      const result = await uploadTransactions(selectedFile);

      if (result.success) {
        // Build preview rows from the backend's detected mappings info.
        // The backend returns the count of inserted rows; we create placeholder
        // summary rows for the preview table.
        setMappingSource(result.data.mapping_source ?? "auto");
        setParsedRows(
          Array.from({ length: Math.min(result.data.inserted, 10) }, (_, i) => ({
            id: `row_${i}`,
            name: `Transaction ${i + 1}`,
            amount: 0,
            type: "Imported",
            dueDate: new Date().toISOString().split("T")[0],
            initials: "TX",
          }))
        );
        // Store the real insert count for display
        setParsedRows([{ id: "summary", name: `${result.data.inserted} transactions imported`, amount: 0, type: "Imported", dueDate: "-", initials: "✓" }]);
        setUploadState("parsed");
      } else {
        throw new Error("Backend returned success:false");
      }
    } catch (err: any) {
      console.error("[UploadView] Upload failed:", err);
      setUploadError(err?.message ?? "Upload failed. Please check the backend server.");
      setUploadState("error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleIntegrate = () => {
    if (parsedRows.length === 0) return;
    setUploadState("uploading");

    setTimeout(() => {
      // Add items to global ledger
      parsedRows.forEach((row) => {
        addLedgerItem({
          id: row.id + "_" + Date.now(),
          name: row.name,
          amount: row.type === "Payable" ? -Math.abs(row.amount) : Math.abs(row.amount),
          overdue: new Date(row.dueDate) < new Date(),
          dueDate: row.dueDate,
          email: `accounts@${row.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
          phone: "+91 98765 43210",
          initials: row.initials
        });
      });

      logActivity({
        actionType: "ledger",
        description: `Imported and merged ${parsedRows.length} transactions from ledger sheet: ${file?.name || "financial_ledger.csv"}`,
        amount: parsedRows.reduce((acc, curr) => acc + (curr.type === "Receivable" ? curr.amount : 0), 0)
      });

      refreshFinancials();
      setUploadState("integrated");
    }, 1200);
  };

  const resetUploader = () => {
    setFile(null);
    setUploadState("idle");
    setParsedRows([]);
    setUploadError(null);
    setMappingSource("auto");
  };

  return (
    <div id="upload-view-container" className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 text-neutral-900 bg-[#EAE7E4] dark:bg-[#121212] dark:text-[#f4f4f5]">
      
      {/* Header */}
      <div className="mb-8">
        <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">
          AARYA DATA STREAM
        </p>
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-neutral-900 dark:text-white tracking-tight mt-1">
          Data Upload Center
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Securely upload and parse your accounting files (CSV, XLS, or bank statement files) to update the Indian startup copilot.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Interactive Drag and Drop zone */}
        <div className="lg:col-span-2 space-y-6">
          <div 
            id="drag-drop-zone"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={uploadState === "idle" ? handleButtonClick : undefined}
            className={`relative rounded-3xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center transition-all group ${
              uploadState === "idle" ? "cursor-pointer hover:border-[#D988A1]/50" : ""
            } ${
              dragActive 
                ? "border-[#D988A1] bg-[#D988A1]/5" 
                : "border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] hover:border-neutral-400 dark:hover:border-neutral-700"
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              onClick={(e) => e.stopPropagation()}
            />

            {uploadState === "idle" && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-[#D988A1] group-hover:scale-110 group-hover:bg-[#D988A1]/10 transition-all flex items-center justify-center mx-auto shadow-sm">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <span 
                    className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-[#D988A1] transition-colors underline decoration-2 underline-offset-4"
                  >
                    Click to upload
                  </span>
                  <span className="text-sm text-neutral-500"> or drag and drop your ledger sheet</span>
                  <p className="text-xs text-neutral-400 font-mono mt-1">Supports CSV, Excel (XLSX, XLS) up to 25MB</p>
                </div>
              </div>
            )}

            {uploadState === "uploading" && (
              <div className="space-y-4 py-6">
                <RefreshCw className="w-10 h-10 text-[#FF3B30] animate-spin mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Uploading to AARYA Backend...</h3>
                  <p className="text-xs text-neutral-400 font-mono mt-1">Hybrid ingestion engine is parsing headers via Fuse.js + Gemini AI</p>
                </div>
              </div>
            )}

            {uploadState === "error" && (
              <div className="space-y-4 py-6">
                <XCircle className="w-10 h-10 text-red-500 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-red-500">Upload Failed</h3>
                  <p className="text-xs text-neutral-400 font-mono mt-1">{uploadError || "An unexpected error occurred."}</p>
                </div>
                <button onClick={resetUploader} className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-800 transition-all">
                  Try Again
                </button>
              </div>
            )}

            {uploadState === "parsed" && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate max-w-[280px] mx-auto">
                    {file?.name}
                  </h3>
                  <p className="text-xs text-emerald-500 font-semibold flex items-center justify-center gap-1.5 mt-1">
                    <Check className="w-4 h-4" /> Parsed successfully &bull; {parsedRows.length} entries mapped
                  </p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <button 
                    onClick={handleIntegrate}
                    className="px-5 py-2.5 rounded-xl bg-[#FF3B30] text-white text-xs font-bold hover:bg-[#e0342a] active:scale-95 transition-all shadow-md"
                  >
                    Integrate with AARYA Ledger
                  </button>
                  <button 
                    onClick={resetUploader}
                    className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {uploadState === "integrated" && (
              <div className="space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Ledger Merged!</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    The startup financial database has been updated and the AI Copilot now has the new records.
                  </p>
                </div>
                <button 
                  onClick={resetUploader}
                  className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-all"
                >
                  Upload Another File
                </button>
              </div>
            )}
          </div>

          {/* Table Preview of Parsed Content */}
          {parsedRows.length > 0 && (
            <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-[#FF3B30]" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Sheet Rows Detected</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-mono">
                      <th className="py-3 font-semibold">Entity</th>
                      <th className="py-3 font-semibold">Category</th>
                      <th className="py-3 font-semibold">Amount</th>
                      <th className="py-3 font-semibold">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono text-xs">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="text-neutral-800 dark:text-neutral-200">
                        <td className="py-3 font-semibold text-neutral-900 dark:text-white">{row.name}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.type === "Receivable" 
                              ? "bg-emerald-500/10 text-emerald-600" 
                              : "bg-[#FF3B30]/10 text-[#FF3B30]"
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="py-3 font-bold">
                          {row.type === "Payable" ? "-" : ""}{state.currencySymbol}{row.amount.toLocaleString("en-US")}
                        </td>
                        <td className="py-3 text-neutral-400">{row.dueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Compliance Checklist & Guidelines */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4">Indian Compliance Checker</h3>
            <ul className="space-y-3.5 text-xs text-neutral-600 dark:text-neutral-400">
              <li className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white">TDS (Tax Deducted at Source)</span>
                  <p className="mt-0.5">Ensure vendor payments are tagged with appropriate TDS categories (194C, 194J, etc.).</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white">GST Invoicing Integrity</span>
                  <p className="mt-0.5">Validate State Code of supply vs. Place of Supply for correct CGST/SGST vs IGST calculation.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white">MSME Payment Compliance</span>
                  <p className="mt-0.5">Section 43B(h) mandates payout within 45 days to registered MSMEs. AARYA flags overdue entries automatically.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
};
