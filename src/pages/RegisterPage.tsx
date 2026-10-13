import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, User, Eye, EyeOff, ArrowRight, Loader2, Check, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { OAuthButtons } from '../components/auth/OAuthButtons';

interface RegisterPageProps {
  onNavigate: (path: string) => void;
}

export function RegisterPage({ onNavigate }: RegisterPageProps) {
  const { register, branding } = useAuth();
  const { success, error: toastError } = useToast();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPasswordLongEnough = password.length >= 8;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!isPasswordLongEnough) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!doPasswordsMatch) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMessage('Please accept the service policy to continue.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register(username.trim(), email.trim(), password);
      success('Account created successfully!');
      onNavigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please try a different username or email.';
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
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header titles */}
            <div className="space-y-2 text-left relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>INITIALIZE STORAGE ENCLAVE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-between">
                <span>Create account</span>
                <Sparkles className="w-5 h-5 text-purple-400" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Join {branding?.appName || 'CloudStoragePX'} with 50 GB complimentary encrypted storage.
              </p>
            </div>

            {/* Error Notification Banner */}
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5 backdrop-blur-md"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </motion.div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Username */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-slate-300">
                  Username
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. alexander"
                    autoComplete="username"
                    className="w-full px-4 py-2.5 sm:py-3 bg-[#111b38]/70 border border-slate-700/80 group-hover:border-indigo-500/50 text-xs sm:text-sm text-white placeholder-slate-500 rounded-2xl focus:bg-[#152145] focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-cyan-400 transition-all duration-200"
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-slate-300">
                  Email Address
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="alex@domain.io"
                    autoComplete="email"
                    className="w-full px-4 py-2.5 sm:py-3 bg-[#111b38]/70 border border-slate-700/80 group-hover:border-indigo-500/50 text-xs sm:text-sm text-white placeholder-slate-500 rounded-2xl focus:bg-[#152145] focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-cyan-400 transition-all duration-200"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                </div>
              </div>

              {/* Password & Confirm Password grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold text-slate-300">
                    Master Password
                  </label>
                  <div className="relative group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Min. 8 chars"
                      autoComplete="new-password"
                      className="w-full pl-3.5 pr-9 py-2.5 sm:py-3 bg-[#111b38]/70 border border-slate-700/80 group-hover:border-indigo-500/50 text-xs sm:text-sm text-white placeholder-slate-500 rounded-2xl focus:bg-[#152145] focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-cyan-400 transition-all duration-200 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-cyan-300 absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Repeat master password"
                      autoComplete="new-password"
                      className="w-full pl-3.5 pr-9 py-2.5 sm:py-3 bg-[#111b38]/70 border border-slate-700/80 group-hover:border-indigo-500/50 text-xs sm:text-sm text-white placeholder-slate-500 rounded-2xl focus:bg-[#152145] focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-cyan-400 transition-all duration-200 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="p-1 text-slate-400 hover:text-cyan-300 absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Requirements Badges */}
              <div className="p-3 bg-[#101936]/60 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-3 text-[11px]">
                <div className={`flex items-center gap-1.5 ${isPasswordLongEnough ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${isPasswordLongEnough ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                    ✓
                  </div>
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${doPasswordsMatch ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${doPasswordsMatch ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                    ✓
                  </div>
                  <span>Passwords match</span>
                </div>
              </div>

              {/* Terms checkbox */}
              <div className="flex items-start gap-2.5 pt-1 text-left">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded-md border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30 cursor-pointer accent-indigo-500 shrink-0"
                />
                <label htmlFor="terms" className="text-xs text-slate-400 cursor-pointer leading-relaxed">
                  I acknowledge the zero-knowledge policy: I understand only my master key can decrypt my files.
                </label>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isSubmitting || !agreedToTerms}
                className="w-full relative group overflow-hidden py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 active:from-indigo-700 active:to-cyan-600 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 hover:shadow-cyan-500/30 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                {/* Glow shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Provisioning Space...</span>
                  </>
                ) : (
                  <>
                    <span>Create Secure Account</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-mono font-semibold">
                <span className="bg-[#0d1429] px-3 text-slate-500">
                  Or register with provider
                </span>
              </div>
            </div>

            {/* OAuth registration options */}
            <OAuthButtons onSuccess={() => onNavigate('/dashboard')} />

            {/* Footer Back to Sign In */}
            <div className="pt-2 text-center text-xs text-slate-400">
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline transition-colors cursor-pointer"
              >
                Sign in to your cloud
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AuthLayout>
  );
}
