import React, { useState } from "react";
import { Mail, Lock, Sparkles, ArrowRight, Chrome, Apple, ArrowLeft, Github } from "lucide-react";
import { motion } from "motion/react";

interface AuthProps {
  onSuccess: (email: string) => void;
  onBack: () => void;
  initialEmail: string;
}

export const AuthView: React.FC<AuthProps> = ({ onSuccess, onBack, initialEmail }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(initialEmail || "ponnarasuperumal05@gmail.com");
  const [password, setPassword] = useState("••••••••");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    setError("");
    onSuccess(email);
  };

  return (
    <div id="auth-view-container" className="min-h-screen bg-[#EAE7E4] text-neutral-900 flex flex-col justify-center items-center px-4 relative">
      {/* Background radial glow */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[#141414]/5 blur-[100px] pointer-events-none" />

      {/* Back button */}
      <button 
        id="auth-back-btn"
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs text-neutral-500 hover:text-[#141414] transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Pitch</span>
      </button>

      {/* Main Container Card (White card centered on light background) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-8 md:p-10 shadow-lg relative overflow-hidden"
      >
        {/* Title block */}
        <div className="text-center mb-8">
          <div className="inline-flex w-10 h-10 rounded-xl bg-[#141414] text-[#FF3B30] items-center justify-center font-bold text-xl mb-3">
            A
          </div>
          <h2 className="font-heading font-bold text-2xl tracking-tight text-[#141414]">
            {isLogin ? "Welcome back" : "Create business account"}
          </h2>
          <p className="text-xs text-neutral-500 mt-1 font-sans">
            {isLogin ? "Access your virtual AI CFO intelligence" : "Get started with next-gen automated ledger capital"}
          </p>
        </div>

        {error && (
          <div id="auth-error-block" className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Business Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Consulting Inc."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-[#141414] focus:ring-2 focus:ring-[#141414]/10 text-sm outline-none text-neutral-900 placeholder:text-neutral-300"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
              <input
                type="email"
                required
                id="auth-input-email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:border-[#141414] focus:ring-2 focus:ring-[#141414]/10 text-sm outline-none text-neutral-900 placeholder:text-neutral-300"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Password</label>
              {isLogin && (
                <a href="#forgot" className="text-[10px] font-medium text-neutral-400 hover:text-black">Forgot?</a>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
              <input
                type="password"
                required
                id="auth-input-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:border-[#141414] focus:ring-2 focus:ring-[#141414]/10 text-sm outline-none text-neutral-900"
              />
            </div>
          </div>

          <button 
            type="submit"
            id="auth-submit-btn"
            className="w-full py-3.5 rounded-xl bg-[#141414] text-[#FF3B30] font-heading font-bold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-2 shadow-sm"
          >
            <span>{isLogin ? "Sign In" : "Register Account"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="my-6 flex items-center justify-between text-neutral-300 text-xs">
          <span className="w-1/4 h-[1px] bg-neutral-100"></span>
          <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Or connect with</span>
          <span className="w-1/4 h-[1px] bg-neutral-100"></span>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            type="button"
            onClick={() => onSuccess(email)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors text-xs font-semibold text-neutral-600"
          >
            <Chrome className="w-4 h-4 text-red-500" />
            <span>Google</span>
          </button>
          <button 
            type="button"
            onClick={() => onSuccess(email)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors text-xs font-semibold text-neutral-600"
          >
            <Apple className="w-4 h-4 text-neutral-900" />
            <span>Apple</span>
          </button>
        </div>

        {/* Footer Toggle */}
        <div className="text-center pt-2 border-t border-neutral-100 text-xs text-neutral-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-bold text-neutral-900 hover:underline"
          >
            {isLogin ? "Create one" : "Log in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
