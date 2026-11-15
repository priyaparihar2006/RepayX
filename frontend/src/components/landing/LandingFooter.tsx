import React from 'react';
import { ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { useNavigate } from 'react-router';

interface LandingFooterProps {
  onOpenDemoModal: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onOpenDemoModal }) => {
  const navigate = useNavigate();

  return (
    <footer className="bg-[#0b141a] text-slate-400 text-xs border-t border-white/10 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Col 1: Brand & Bio */}
          <div className="lg:col-span-5 space-y-4">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-3 text-left cursor-pointer group"
              title="Back to top"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#168653] to-[#5DE5A1] p-0.5 shadow-md shadow-[#168653]/30 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#101D25] rounded-[10px] flex items-center justify-center text-white font-extrabold text-sm">
                  <span className="text-[#5DE5A1]">R</span>
                </div>
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white font-heading">
                Repay<span className="text-[#5DE5A1]">X</span>
              </span>
            </button>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              AI-powered loan recovery and EMI reminder automation platform transforming collections for forward-thinking banks, NBFCs, and FinTech lenders.
            </p>

            <div className="text-[11px] text-[#5DE5A1] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>&quot;Recover Smarter. Collect Faster.&quot;</span>
            </div>
          </div>

          {/* Col 2: Platform Links */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Application Modules
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Risk Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/customers')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Borrower Risk Portfolio
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/whatsapp')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  WhatsApp Outreach Hub
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/automation')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  EMI Reminder Automation
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/analytics/risk')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Delinquency Risk Analytics
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/loans')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Loan Portfolio Ledger
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Features */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Capabilities
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('/whatsapp')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Conversational WhatsApp
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/automation')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  AI Voice Calling Agent
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Dynamic UPI QR Intent
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/escalations')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  3-Stage Escalation Ladder
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/knowledge-base')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  RAG Policy Retrieval
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/escalations')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Executive OTS Authorizations
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Demo & Support */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Institutional
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={onOpenDemoModal}
                  className="text-[#5DE5A1] hover:underline font-semibold cursor-pointer"
                >
                  Schedule Demo
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/settings')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  System & Policy Settings
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/knowledge-base')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  RAG Knowledge Base
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} RepayX Technologies. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>TRAI DLT Registered</span>
            <span>•</span>
            <span>Zero Data Sharing</span>
            <span>•</span>
            <span>RBI Fair Practice Guardrails</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
