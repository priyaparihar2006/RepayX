import React from 'react';
import { X, LayoutDashboard, KeyRound, ArrowRight, ShieldCheck, CheckCircle2, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router';

interface LoginQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContactModal?: () => void;
}

export const LoginQuickModal: React.FC<LoginQuickModalProps> = ({
  isOpen,
  onClose,
  onOpenContactModal,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoDashboard = () => {
    onClose();
    navigate('/dashboard');
  };

  const handleGoWhatsApp = () => {
    onClose();
    navigate('/whatsapp');
  };

  const handleGoAutomation = () => {
    onClose();
    navigate('/automation');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md bg-[#142630] border border-[#5DE5A1]/20 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-white">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#5DE5A1]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="p-6 sm:p-8 relative z-10">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5DE5A1] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RepayX Platform Access</span>
          </div>

          <h3 id="login-modal-title" className="text-2xl font-bold font-heading text-white mb-2">
            Welcome to RepayX
          </h3>
          <p className="text-xs text-slate-300 mb-6">
            Choose your destination to access the loan recovery intelligence platform.
          </p>

          <div className="space-y-3">
            {/* Direct Dashboard Entry */}
            <button
              onClick={handleGoDashboard}
              className="w-full text-left p-4 rounded-xl bg-[#101D25] border border-white/10 hover:border-[#5DE5A1] hover:bg-[#162f3c] transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5 font-bold text-sm text-white group-hover:text-[#5DE5A1] transition-colors">
                  <div className="p-2 rounded-lg bg-[#168653]/30 text-[#5DE5A1]">
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <span>Recovery Operational Cockpit</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#5DE5A1] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-300 pl-10">
                Direct access to Borrower Risk Analytics, WhatsApp outreach, dynamic settlements, and Loan Ledgers.
              </p>
              <div className="mt-2 pl-10 flex items-center gap-1.5 text-[11px] text-[#5DE5A1]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Pre-authenticated Session Active (Manager Priya Parihar)</span>
              </div>
            </button>

            {/* Direct WhatsApp Assistant Entry */}
            <button
              onClick={handleGoWhatsApp}
              className="w-full text-left p-4 rounded-xl bg-[#101D25] border border-emerald-500/30 hover:border-[#5DE5A1] hover:bg-[#162f3c] transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5 font-bold text-sm text-white group-hover:text-[#5DE5A1] transition-colors">
                  <div className="p-2 rounded-lg bg-[#168653]/40 text-[#5DE5A1]">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span>WhatsApp Outreach Hub</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#5DE5A1] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-300 pl-10">
                Engage borrowers via bilingual WhatsApp chat, send EMI reminders, and collect repayments via UPI.
              </p>
              <div className="mt-2 pl-10 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>Live Meta WhatsApp Engine Connected</span>
              </div>
            </button>

            {/* Automation Key Gate */}
            <button
              onClick={handleGoAutomation}
              className="w-full text-left p-4 rounded-xl bg-[#101D25] border border-white/10 hover:border-[#5DE5A1] hover:bg-[#162f3c] transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5 font-bold text-sm text-white group-hover:text-[#5DE5A1] transition-colors">
                  <div className="p-2 rounded-lg bg-emerald-950 text-[#5DE5A1]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <span>Reminder Automation Key Gate</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#5DE5A1] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-300 pl-10">
                Access scheduled batch jobs, multi-channel policy configurations, and API authorization tokens.
              </p>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Need institutional onboarding?</span>
            <button
              onClick={() => {
                onClose();
                if (onOpenContactModal) onOpenContactModal();
              }}
              className="text-[#5DE5A1] hover:underline font-medium cursor-pointer"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
