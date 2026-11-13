import React, { useState } from 'react';
import { X, CheckCircle2, Sparkles, Building, Mail, User, Phone, ArrowRight } from 'lucide-react';

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoRequestModal: React.FC<DemoRequestModalProps> = ({ isOpen, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [phone, setPhone] = useState('');
  const [portfolioSize, setPortfolioSize] = useState('₹10Cr - ₹50Cr');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFullName('');
    setWorkEmail('');
    setInstitution('');
    setPhone('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-lg bg-[#142630] border border-[#5DE5A1]/20 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-white">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#5DE5A1]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#168653]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="p-6 sm:p-8 relative z-10">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          {submitted ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#168653]/30 border border-[#5DE5A1] flex items-center justify-center text-[#5DE5A1] mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 id="demo-modal-title" className="text-xl font-bold font-heading text-white mb-2">
                Demo Request Confirmed
              </h3>
              <p className="text-sm text-slate-300 max-w-sm mx-auto mb-6">
                Thank you, <span className="font-semibold text-[#5DE5A1]">{fullName || 'Executive'}</span>. A RepayX loan recovery specialist will contact you at <span className="font-semibold text-white">{workEmail || 'your email'}</span> within 2 business hours.
              </p>
              <div className="bg-[#101D25] border border-white/10 rounded-xl p-4 text-xs text-left text-slate-300 mb-6 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Institution:</span>
                  <span className="font-medium text-white">{institution || 'Financial Institution'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Portfolio Bracket:</span>
                  <span className="font-medium text-[#5DE5A1]">{portfolioSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Environment:</span>
                  <span className="font-medium text-white">Private Sandbox Guided Tour</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-[#168653]/25 cursor-pointer"
              >
                Close & Return to Page
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5DE5A1] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enterprise Guided Walkthrough</span>
              </div>
              <h3 id="demo-modal-title" className="text-2xl font-bold font-heading text-white mb-2">
                Request a Custom Demo
              </h3>
              <p className="text-xs text-slate-300 mb-6">
                See how RepayX automates borrower outreach across WhatsApp, AI Voice, SMS, and Email with full compliance guardrails.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#101D25] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE5A1] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Work Email <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="priya@fintech-nbfc.in"
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#101D25] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE5A1] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Bank / NBFC Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="Apex Capital"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#101D25] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE5A1] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#101D25] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE5A1] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Monthly Loan Portfolio Under Management
                  </label>
                  <select
                    value={portfolioSize}
                    onChange={(e) => setPortfolioSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#101D25] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#5DE5A1] transition-colors"
                  >
                    <option value="Under ₹10Cr">Under ₹10Cr AUM</option>
                    <option value="₹10Cr - ₹50Cr">₹10Cr - ₹50Cr AUM</option>
                    <option value="₹50Cr - ₹200Cr">₹50Cr - ₹200Cr AUM</option>
                    <option value="₹200Cr+">₹200Cr+ Enterprise AUM</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] font-bold text-sm hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Scheduling session...</span>
                    ) : (
                      <>
                        <span>Confirm Request</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-center text-slate-400">
                  By clicking, you agree to receive a calendar invitation. Strict confidentiality assured.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
