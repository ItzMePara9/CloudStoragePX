import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  FolderGit2, 
  Smartphone, 
  HardDrive, 
  Lock, 
  Cloud, 
  Sparkles, 
  Cpu, 
  Database, 
  Radio, 
  Zap,
  CheckCircle2
} from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-screen bg-[#070b19] flex flex-col lg:flex-row overflow-x-hidden selection:bg-indigo-500/25 selection:text-indigo-300 relative text-slate-100">
      {/* Dynamic ambient cyber glow backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft pulsing nebula orbs */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[130px] animate-pulse-glow" />
        <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] bg-purple-600/12 rounded-full blur-[140px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[150px] animate-pulse-glow" style={{ animationDelay: '4s' }} />
        
        {/* Tech grid texture */}
        <div className="absolute inset-0 bg-cyber-grid opacity-60" />
      </div>

      {/* ============================================================ */}
      {/* LEFT SIDE — Futuristic Brand & Vault Holographic Panel       */}
      {/* ============================================================ */}
      <div className="relative z-10 w-full lg:w-[48%] xl:w-[45%] p-6 sm:p-10 lg:p-14 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80 backdrop-blur-md shrink-0">
        {/* Top Header: Logo + Tagline */}
        <motion.div 
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 opacity-70 blur-xs group-hover:opacity-100 transition duration-500 animate-shimmer-border" />
              <img
                src="/logo.png"
                alt="CloudStoragePX"
                className="relative w-11 h-11 rounded-xl object-contain bg-[#0c1226] border border-indigo-400/40 p-1 shadow-inner"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">
                  CloudStorage<span className="text-cyan-400 font-black">PX</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                  CORE 2.4
                </span>
              </div>
              <span className="text-[11px] text-indigo-300/90 font-medium tracking-wide flex items-center gap-1.5">
                <span>Your Cloud. Your Control.</span>
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-semibold">ONLINE</span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px]">AES-256</span>
          </div>
        </motion.div>

        {/* Center Section: Hero Title + Realistic Holographic Storage Hub Illustration */}
        <div className="relative z-10 my-8 lg:my-auto space-y-7">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Next-Gen Enterprise Cloud Infrastructure</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Your files.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 drop-shadow-sm">
                Your sovereignty.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-lg">
              Zero-knowledge architecture with hardware-grade client encryption, instant multi-threaded streaming, and unlimited decentralized replication.
            </p>
          </motion.div>

          {/* Futuristic Interactive Hologram Device Centerpiece */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative py-4 select-none"
          >
            <div className="relative w-full max-w-md mx-auto h-56 sm:h-64 flex items-center justify-center">
              {/* Outer Orbit Hologram Ring */}
              <div className="absolute inset-2 sm:inset-4 rounded-full border border-dashed border-indigo-500/20 animate-spin" style={{ animationDuration: '60s' }} />
              <div className="absolute inset-8 sm:inset-10 rounded-full border border-cyan-500/15 animate-spin" style={{ animationDuration: '40s', animationDirection: 'reverse' }} />

              {/* Central Quantum Vault Cube */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="relative z-20 w-32 h-32 sm:w-36 sm:h-36 rounded-3xl p-[1.5px] bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 shadow-2xl shadow-indigo-500/30 animate-float-slow cursor-pointer"
              >
                <div className="w-full h-full rounded-[22px] bg-[#0b1227]/95 backdrop-blur-xl flex flex-col items-center justify-center p-3 text-center border border-indigo-400/20 relative overflow-hidden group">
                  {/* Internal grid line overlay */}
                  <div className="absolute inset-0 bg-dot-matrix opacity-30" />
                  
                  {/* Subtle sweep light */}
                  <div className="absolute -inset-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent rotate-45 pointer-events-none group-hover:translate-x-full transition-transform duration-1000" />

                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30 mb-1.5 shadow-inner">
                    <Lock className="w-5 h-5 text-cyan-300 drop-shadow" />
                  </div>
                  <span className="text-[12px] font-bold text-white tracking-wide">
                    Zero-Knowledge
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 mt-0.5 tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30">
                    AES-256-GCM
                  </span>
                </div>
              </motion.div>

              {/* Orbiting Satellite Node 1: Direct Cloud Stream */}
              <motion.div 
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="absolute top-2 right-1 sm:right-4 z-20 p-3 rounded-2xl bg-[#0f1738]/90 border border-indigo-500/30 backdrop-blur-xl shadow-xl flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-400/30">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-white">Direct Stream</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  </div>
                  <span className="text-[9px] text-cyan-300 font-mono">1.2 GB/s Throughput</span>
                </div>
              </motion.div>

              {/* Orbiting Satellite Node 2: Redundant Storage */}
              <motion.div 
                animate={{ y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1 }}
                className="absolute bottom-2 left-1 sm:left-4 z-20 p-3 rounded-2xl bg-[#0f1738]/90 border border-purple-500/30 backdrop-blur-xl shadow-xl flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-400/30">
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-white">Immutable Vault</span>
                    <CheckCircle2 className="w-3 h-3 text-purple-400" />
                  </div>
                  <span className="text-[9px] text-purple-300 font-mono">100% Data Integrity</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Three Compact Futuristic Feature Highlights */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2"
          >
            <div className="p-3.5 rounded-2xl bg-[#0d1530]/80 border border-indigo-500/20 backdrop-blur-md hover:border-indigo-500/40 transition-colors group">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">Private Cloud</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Client-side encrypted keys. No telemetry or tracking.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0d1530]/80 border border-cyan-500/20 backdrop-blur-md hover:border-cyan-500/40 transition-colors group">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">Fast Sync</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Chunked streaming with concurrent chunk hashing.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0d1530]/80 border border-purple-500/20 backdrop-blur-md hover:border-purple-500/40 transition-colors group">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 group-hover:text-purple-300 transition-colors">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">Multi-Device</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Seamless access across web, mobile, and API clients.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bottom Footer Note */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ENCRYPTED PROTOCOL ACTIVE</span>
          </div>
          <span className="text-slate-500">SHA-256 VERIFIED</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT SIDE — Premium Realistic Glassmorphic Auth Form Panel  */}
      {/* ============================================================ */}
      <div className="flex-1 relative z-10 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14 overflow-y-auto">
        <div className="w-full max-w-md my-auto py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
