import React from 'react';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Zap,
  PhoneCall,
  CreditCard,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { HeroAiSphere3D } from './HeroAiSphere3D';

interface LandingHeroProps {
  onOpenDemoModal: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onOpenDemoModal }) => {
  const navigate = useNavigate();

  return (
    <section
      id="hero"
      className="relative min-h-screen pt-28 pb-16 lg:pt-36 lg:pb-24 flex items-center bg-[#101D25] text-white overflow-hidden"
    >
      {/* Background ambient radial gradients & grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(22,134,83,0.25),rgba(255,255,255,0))]" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#5DE5A1]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-[#168653]/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Futuristic subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#5DE5A1 1px, transparent 1px), linear-gradient(to right, #5DE5A1 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#142630] border border-[#5DE5A1]/30 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-[#5DE5A1] animate-ping" />
              <span className="text-xs font-semibold tracking-wide text-[#5DE5A1] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Next-Gen AI Loan Recovery & EMI Automation
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-heading leading-[1.08]">
              Recover Smarter.{' '}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#5DE5A1] via-emerald-300 to-[#EAF6EF]">
                Collect Faster.
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Meet <strong className="text-white font-semibold">RepayX</strong> — the AI-powered loan recovery platform transforming EMI reminders, intelligent customer conversations and automated payment recovery.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] font-extrabold text-sm sm:text-base shadow-xl shadow-[#168653]/35 hover:shadow-2xl hover:shadow-[#5DE5A1]/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
              >
                <span>Explore RepayX</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/whatsapp')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#142630]/90 border border-[#5DE5A1]/40 text-[#5DE5A1] font-bold text-sm sm:text-base hover:bg-[#168653]/20 hover:border-[#5DE5A1] backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-black/20"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Assistant</span>
              </button>

              <button
                onClick={onOpenDemoModal}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-transparent border border-white/15 text-slate-300 font-semibold text-sm hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Request a Demo</span>
              </button>
            </div>

            {/* Trust Micro-Badges */}
            <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-center lg:justify-start gap-y-3 gap-x-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#5DE5A1]" />
                <span>Zero Compliance Violations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#5DE5A1]" />
                <span>TRAI & RBI Compliant Guardrails</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#5DE5A1]" />
                <span>Instant Dynamic UPI QR</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 3D Sphere & Floating Notification Cards */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* 3D Sphere Container */}
            <div className="relative w-full max-w-[460px] mx-auto">
              <HeroAiSphere3D />

              {/* Floating Simulated Notification Card 1: WhatsApp Reminder (Clickable) */}
              <div
                onClick={() => navigate('/whatsapp')}
                className="absolute top-2 left-0 sm:-left-6 max-w-[185px] sm:max-w-[210px] p-2.5 sm:p-3 rounded-xl bg-[#142630]/90 border border-[#5DE5A1]/40 backdrop-blur-md shadow-xl shadow-black/40 animate-float cursor-pointer hover:border-[#5DE5A1] hover:scale-105 transition-all group"
                style={{ animationDuration: '6s' }}
                title="Click to open WhatsApp Automation Hub"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#168653]/40 flex items-center justify-center text-[#5DE5A1] group-hover:bg-[#168653]">
                    <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-white leading-tight flex items-center gap-1">
                    <span>WhatsApp Sent</span>
                    <span className="text-[9px] text-[#5DE5A1] font-mono">↗</span>
                  </div>
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-300">
                  EMI reminder delivered for Loan #L-9842 (₹8,500)
                </p>
                <div className="mt-1 flex items-center justify-between text-[8px] sm:text-[9px] text-[#5DE5A1]">
                  <span>Status: Delivered</span>
                  <span className="underline group-hover:text-white transition-colors">Open Hub →</span>
                </div>
              </div>

              {/* Floating Simulated Notification Card 2: AI Voice Reminder */}
              <div
                className="absolute -bottom-2 left-0 sm:-left-4 max-w-[190px] sm:max-w-[220px] p-2.5 sm:p-3 rounded-xl bg-[#142630]/90 border border-white/15 backdrop-blur-md shadow-xl shadow-black/40 animate-float"
                style={{ animationDuration: '7s', animationDelay: '1.5s' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-[#5DE5A1]">
                    <PhoneCall className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-white leading-tight">
                    AI Voice Call Answered
                  </div>
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-300">
                  Customer promised repayment: &quot;Salary on 15th&quot;
                </p>
                <div className="mt-1 flex items-center gap-1 text-[8px] sm:text-[9px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>PTP Logged Automatically</span>
                </div>
              </div>

              {/* Floating Simulated Notification Card 3: Payment Recovered */}
              <div
                className="absolute top-1/2 right-0 sm:-right-8 -translate-y-1/2 max-w-[185px] sm:max-w-[210px] p-2.5 sm:p-3 rounded-xl bg-[#142630]/95 border border-[#5DE5A1]/40 backdrop-blur-md shadow-2xl shadow-[#168653]/30 animate-float"
                style={{ animationDuration: '6.5s', animationDelay: '0.8s' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#5DE5A1] flex items-center justify-center text-[#101D25]">
                    <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-white leading-tight">
                    Payment Recovered
                  </div>
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-300">
                  ₹12,450 received via Dynamic UPI Intent
                </p>
                <div className="mt-1 flex items-center justify-between text-[8px] sm:text-[9px] text-[#5DE5A1] font-bold">
                  <span>Reconciled</span>
                  <span>+₹12,450</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
