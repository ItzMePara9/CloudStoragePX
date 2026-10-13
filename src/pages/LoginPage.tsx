import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Eye, EyeOff, ArrowRight, Loader2, HelpCircle, Shield, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { OAuthButtons } from '../components/auth/OAuthButtons';

interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { login } = useAuth();
  const { success, error: toastError } = useToast();

  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const isRegistrationOpen = true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginInput.trim() || !password) {
      setErrorMessage('Please enter both your email/username and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(loginInput.trim(), password);
      success('Welcome back!');
      onNavigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Invalid username or password.';
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        {/* Futuristic Card Container with Realistic Glassmorphism & Gradient Border */}
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-indigo-500/40 via-purple-500/20 to-cyan-500/30 shadow-2xl shadow-indigo-950/50">
          <div className="relative rounded-3xl bg-[#0d1429]/90 backdrop-blur-2xl p-6 sm:p-9 text-slate-100 space-y-6 overflow-hidden">
            {/* Ambient top light beam */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header titles */}
            <div className="space-y-2 text-left relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-medium">
                <Shield className="w-3 h-3" />
                <span>SECURE ACCESS PORTAL</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-between">
                <span>Welcome back</span>
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Sign in to authenticate with your decentralized cloud storage vault.
              </p>
            </div>

            {/* Error Notification Banner */}
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5 backdrop-blur-md"
              >
                <span className="font-bold shrink-0 text-rose-400">•</span>
                <span className="leading-relaxed">{errorMessage}</span>
              </motion.div>
            )}

            {/* Primary Password Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Email / Username Input */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-slate-300">
                  Email Address or Username
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={loginInput}
                    onChange={(e) => {
                      setLoginInput(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="name@cloudstoragepx.io or username"
                    autoComplete="username"
                    className="w-full px-4 py-3 bg-[#111b38]/70 border border-slate-700/80 group-hover:border-indigo-500/50 text-xs sm:text-sm text-white placeholder-slate-500 rounded-2xl focus:bg-[#152145] focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-cyan-400 transition-all duration-200"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                </div>
              </div>

              {/* Password Input with Show/Hide toggle */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full pl-4 pr-11 py-3 bg-[#111b38]/70 border border-slate-700/80 group-hover:border-indigo-500/50 text-xs sm:text-sm text-white placeholder-slate-500 rounded-2xl focus:bg-[#152145] focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-cyan-400 transition-all duration-200 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-cyan-300 absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30 cursor-pointer accent-indigo-500"
                  />
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 font-medium transition-colors">
                    Remember this workstation
                  </span>
                </label>
              </div>

              {/* Primary Submit Button with Futuristic Glow & Motion */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full relative group overflow-hidden py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 active:from-indigo-700 active:to-cyan-600 disabled:opacity-60 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 hover:shadow-cyan-500/30 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                {/* Glow shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Cloud</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Subtle Futuristic Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-mono font-semibold">
                <span className="bg-[#0d1429] px-3 text-slate-500">
                  Or authenticate with
                </span>
              </div>
            </div>

            {/* Genuine Google & GitHub OAuth Buttons */}
            <OAuthButtons onSuccess={() => onNavigate('/dashboard')} />

            {/* Footer Link to Registration */}
            {isRegistrationOpen && (
              <div className="pt-2 text-center text-xs text-slate-400">
                <span>Need a cloud account? </span>
                <button
                  type="button"
                  onClick={() => onNavigate('/register')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline transition-colors cursor-pointer"
                >
                  Create one now
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0d1429] border border-slate-700/80 rounded-3xl shadow-2xl p-6 text-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 text-cyan-400">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Password Recovery</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Because CloudStoragePX is encrypted with end-to-end zero-knowledge security, passwords cannot be recovered via public unauthenticated emails without pre-configured SMTP.
            </p>
            <div className="p-3 bg-[#111a36] border border-slate-700/80 rounded-2xl text-xs text-slate-300 space-y-1.5 font-mono">
              <p className="font-semibold text-white">Recovery Options:</p>
              <p>• Contact the system <strong>Owner</strong> to issue a password reset token in the admin portal.</p>
              <p>• Or run CLI reset on host server: <code className="text-cyan-300">npm run setup</code></p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
