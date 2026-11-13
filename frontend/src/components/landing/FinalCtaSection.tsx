import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router';

interface FinalCtaSectionProps {
  onOpenDemoModal: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({ onOpenDemoModal }) => {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 lg:py-32 bg-[#101D25] text-white overflow-hidden border-t border-white/10">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(93,229,161,0.18)_0%,rgba(16,29,37,0)_70%)] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#168653]/25 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Glow badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#142630] border border-[#5DE5A1]/30 text-[#5DE5A1] text-xs font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Deploy Autonomous Recovery Today</span>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-heading tracking-tight leading-[1.1] mb-6">
          Stop Chasing Payments.{' '}
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#5DE5A1] via-emerald-300 to-[#EAF6EF]">
            Start Recovering Intelligently.
          </span>
        </h2>

        {/* Description */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Transform your loan recovery operations with intelligent automation and smarter customer communication.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] font-extrabold text-base shadow-xl shadow-[#168653]/40 hover:shadow-2xl hover:shadow-[#5DE5A1]/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onOpenDemoModal}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#142630] border border-white/20 text-white font-semibold text-base hover:bg-white/10 hover:border-[#5DE5A1]/40 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Request a Demo</span>
          </button>
        </div>

        {/* Guarantees */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#5DE5A1]" />
            <span>Instant Sandbox Access</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#5DE5A1]" />
            <span>Pre-Configured WhatsApp Templates</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#5DE5A1]" />
            <span>Zero Lock-In Contract</span>
          </div>
        </div>
      </div>
    </section>
  );
};
