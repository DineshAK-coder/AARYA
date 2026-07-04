import React, { useState } from "react";
import { User, Shield, Bell, HelpCircle, Save, LogOut, CheckCircle, Sparkles } from "lucide-react";
import { BusinessState } from "../types";

interface SettingsProps {
  state: BusinessState;
  onUpdateBusiness: (name: string, industry: string) => void;
  onLogout: () => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const SettingsView: React.FC<SettingsProps> = ({ state, onUpdateBusiness, onLogout, theme, setTheme }) => {
  const [name, setName] = useState(state.businessName);
  const [ind, setInd] = useState(state.industry);
  const [saved, setSaved] = useState(false);

  // Toggle states
  const [autoEmail, setAutoEmail] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [bankSync, setBankSync] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusiness(name, ind);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div id="settings-view-container" className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 text-neutral-900 bg-[#EAE7E4]">
      
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight text-neutral-900">System Settings</h2>
        <p className="text-xs text-neutral-500 mt-1">Configure business metadata, API synchronization parameters, and virtual CFO reminders.</p>
      </div>

      {saved && (
        <div id="settings-success-flash" className="mb-6 p-4 bg-[#F4F2F0] border border-[#E2E1DE] rounded-xl text-[#0E3D26] text-xs font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle className="w-4.5 h-4.5 text-[#141414]" />
          <span>Business metadata successfully updated and cached!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card & Info */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 h-fit space-y-6 shadow-sm">
          <div className="text-center pb-4 border-b border-neutral-100">
            <div className="w-16 h-16 rounded-full bg-neutral-100 border border-neutral-200 mx-auto flex items-center justify-center text-[#141414] font-bold text-xl mb-4">
              CF
            </div>
            <h3 className="font-heading font-bold text-base text-neutral-900">Business Owner</h3>
            <p className="text-[10px] text-neutral-500 font-mono mt-1">Active User Role</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">Linked Account Email</label>
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-700 truncate font-mono">
                {state.userEmail || "ponnarasuperumal05@gmail.com"}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">AI Intelligence Model</label>
              <div className="p-3 bg-[#141414]/5 border border-[#141414]/10 rounded-xl text-xs text-[#141414] flex items-center gap-2 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#141414]" />
                <span>Gemini-3.5-Flash (Active)</span>
              </div>
            </div>
          </div>

          <button
            id="settings-logout-btn"
            onClick={onLogout}
            className="w-full py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-heading font-bold hover:bg-red-100/60 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Secure Logout</span>
          </button>
        </div>

        {/* Business Form & Notification Toggles */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Metadata Edit Form */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <h4 className="font-heading font-bold text-base text-neutral-900 mb-4">Enterprise Information</h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500">Business Legal Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-neutral-200 focus:border-[#141414] rounded-xl text-xs outline-none text-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500">Primary Industry</label>
                  <input
                    type="text"
                    required
                    value={ind}
                    onChange={(e) => setInd(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-neutral-200 focus:border-[#141414] rounded-xl text-xs outline-none text-neutral-900"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  id="settings-save-metadata-btn"
                  className="px-5 py-2.5 bg-[#141414] text-[#FF3B30] text-xs font-heading font-bold rounded-xl hover:scale-103 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Information</span>
                </button>
              </div>
            </form>
          </div>

          {/* User Interface Theme Customization */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <h4 className="font-heading font-bold text-base text-neutral-900 mb-4">Interface Customization</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
                <div>
                  <div className="text-xs font-semibold text-neutral-800">Application Dark Theme</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Toggle between crisp light workspace and deep dark presentation theme</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500 capitalize">{theme} mode</span>
                  <button
                    type="button"
                    id="toggle-dark-theme-settings"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className={`w-11 h-6 rounded-full p-1 transition-all ${theme === "dark" ? "bg-[#141414]" : "bg-neutral-200"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${theme === "dark" ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow/Notification Preferences */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <h4 className="font-heading font-bold text-base text-neutral-900 mb-4">Operational Automation</h4>
            
            <div className="space-y-4">
              
              {/* Option 1 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
                <div>
                  <div className="text-xs font-semibold text-neutral-800">Auto Email Overdue Collections</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Let A.A.R.Y.A dispatch reminders automatically when terms expire</div>
                </div>
                <button
                  type="button"
                  id="toggle-auto-email"
                  onClick={() => setAutoEmail(!autoEmail)}
                  className={`w-11 h-6 rounded-full p-1 transition-all ${autoEmail ? "bg-[#141414]" : "bg-neutral-200"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${autoEmail ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Option 2 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
                <div>
                  <div className="text-xs font-semibold text-neutral-800">Weekly AI Strategy Reports</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">A.A.R.Y.A compiles custom cash forecasts every Sunday morning</div>
                </div>
                <button
                  type="button"
                  id="toggle-weekly-report"
                  onClick={() => setWeeklyReport(!weeklyReport)}
                  className={`w-11 h-6 rounded-full p-1 transition-all ${weeklyReport ? "bg-[#141414]" : "bg-neutral-200"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${weeklyReport ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Option 3 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
                <div>
                  <div className="text-xs font-semibold text-neutral-800">Synchronize Bank Statements</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Automated wire checking linked to operational currency accounts</div>
                </div>
                <button
                  type="button"
                  id="toggle-bank-sync"
                  onClick={() => setBankSync(!bankSync)}
                  className={`w-11 h-6 rounded-full p-1 transition-all ${bankSync ? "bg-[#141414]" : "bg-neutral-200"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${bankSync ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
