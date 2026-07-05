import React, { useState } from "react";
import { Mail, Lock, Sparkles, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../services/apiClient";

interface AuthProps {
  onSuccess: (email: string, authMode: "login" | "signup") => void;
  onBack: () => void;
  initialEmail: string;
}

export const AuthView: React.FC<AuthProps> = ({ onSuccess, onBack, initialEmail }) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // ── Supabase is not configured — graceful fallback ──────────────────────
    if (!supabase) {
      setError(
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
        if (authErr) throw authErr;
        if (!data.session) throw new Error("No session returned from Supabase.");
        onSuccess(email, "login");
      } else {
        const { data, error: authErr } = await supabase.auth.signUp({ email, password });
        if (authErr) throw authErr;
        if (data.session) {
          // Auto-confirmed (e.g. email confirmation disabled in Supabase settings)
          onSuccess(email, "signup");
        } else {
          // Confirmation email sent
          setSuccessMsg(
            "Account created! Check your email for a confirmation link, then come back and sign in."
          );
        }
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-view-container" className="min-h-screen bg-[#EAE7E4] text-neutral-900 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[#141414]/5 blur-[120px] pointer-events-none top-[-15%] left-[10%]" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[#FF3B30]/5 blur-[100px] pointer-events-none bottom-[-10%] right-[5%]" />

      {/* Back button */}
      <button
        id="auth-back-btn"
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs text-neutral-500 hover:text-[#141414] transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Home</span>
      </button>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-xl relative overflow-hidden"
      >
        {/* Top gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#FF3B30] via-[#141414] to-[#FF3B30]" />

        <div className="p-8 md:p-10">
          {/* Logo + Title */}
          <div className="text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-xl bg-[#141414] text-[#FF3B30] items-center justify-center font-bold text-2xl mb-3 shadow-md">
              A
            </div>
            <h1 className="font-heading font-bold text-2xl tracking-tight text-[#141414]">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {mode === "login"
                ? "Sign in to access your AI CFO dashboard"
                : "Join AARYA and take control of your finances"}
            </p>
          </div>

          {/* Mode Toggle Tabs */}
          <div className="flex bg-neutral-100 rounded-xl p-1 mb-6">
            <button
              id="tab-login"
              type="button"
              onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                mode === "login"
                  ? "bg-white text-[#141414] shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              id="tab-signup"
              type="button"
              onClick={() => { setMode("signup"); setError(""); setSuccessMsg(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                mode === "signup"
                  ? "bg-white text-[#141414] shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>

          {/* Error / Success Banners */}
          <AnimatePresence>
            {error && (
              <motion.div
                id="auth-error-block"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium"
              >
                {error}
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                id="auth-success-block"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"
              >
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  id="auth-input-email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:border-[#141414] focus:ring-2 focus:ring-[#141414]/10 text-sm outline-none text-neutral-900 placeholder:text-neutral-300 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  id="auth-input-password"
                  placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-11 pr-10 py-3 rounded-xl border border-neutral-200 focus:border-[#141414] focus:ring-2 focus:ring-[#141414]/10 text-sm outline-none text-neutral-900 placeholder:text-neutral-300 transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (signup only) */}
            <AnimatePresence>
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required={mode === "signup"}
                      id="auth-input-confirm-password"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 focus:border-[#141414] focus:ring-2 focus:ring-[#141414]/10 text-sm outline-none text-neutral-900 placeholder:text-neutral-300 transition-all disabled:opacity-60"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              id="auth-submit-btn"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#141414] text-[#FF3B30] font-heading font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 shadow-md disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === "login" ? "Signing in..." : "Creating account..."}</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Sign In to AARYA" : "Create Account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Supabase note */}
          {!supabase && (
            <p className="mt-4 text-center text-[10px] text-amber-600 font-mono">
              ⚠ Supabase not configured — auth is unavailable
            </p>
          )}

          {/* Mode switcher footer */}
          <div className="mt-6 text-center text-xs text-neutral-500 border-t border-neutral-100 pt-5">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(""); }}
                  className="font-bold text-[#141414] hover:underline"
                >
                  Create one free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="font-bold text-[#141414] hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Security note */}
      <p className="mt-5 text-[10px] text-neutral-400 font-mono">
        🔒 Secured by Supabase Auth · JWT tokens · Row-Level Security
      </p>
    </div>
  );
};
