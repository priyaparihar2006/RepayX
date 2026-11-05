import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Download,
  FileCheck,
  FileText,
  Percent,
  Printer,
  QrCode,
  ShieldAlert,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';

interface BorrowerOption {
  loanId: string;
  name: string;
  overdue: number;
  dpd: number;
  phone: string;
  type: string;
}

const BORROWER_CANDIDATES: BorrowerOption[] = [
  {
    loanId: 'LN1003',
    name: 'Arjun Mehta',
    overdue: 45600,
    dpd: 14,
    phone: '+91 98330 19283',
    type: 'Business Loan',
  },
  {
    loanId: 'LN1004',
    name: 'Karan Singh',
    overdue: 11400,
    dpd: 7,
    phone: '+91 98450 77123',
    type: 'Personal Loan',
  },
  {
    loanId: 'LN1001',
    name: 'Rahul Sharma',
    overdue: 8500,
    dpd: 4,
    phone: '+91 98201 54321',
    type: 'Personal Loan',
  },
  {
    loanId: 'LN1006',
    name: 'Vikram Malhotra',
    overdue: 28400,
    dpd: 22,
    phone: '+91 97110 44521',
    type: 'Auto Loan',
  },
];

interface OtsGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLoanId?: string;
}

export const OtsGeneratorModal: React.FC<OtsGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialLoanId = 'LN1003',
}) => {
  const [selectedBorrower, setSelectedBorrower] = useState<BorrowerOption>(
    BORROWER_CANDIDATES.find((b) => b.loanId === initialLoanId) || BORROWER_CANDIDATES[0]
  );
  const [selectedTier, setSelectedTier] = useState<'tierA' | 'tierB' | 'tierC'>('tierA');
  const [customDiscount, setCustomDiscount] = useState<number>(10);
  const [showLetterPreview, setShowLetterPreview] = useState(false);

  if (!isOpen) return null;

  const overdue = selectedBorrower.overdue;
  const tierADiscount = Math.round(overdue * (customDiscount / 100));
  const tierAPayable = overdue - tierADiscount;

  const tierBSplitEmis = 3;
  const tierBEmiAmount = Math.round(overdue / tierBSplitEmis);

  const tierCPrincipalOnly = Math.round(overdue * 0.7);
  const tierCSavings = overdue - tierCPrincipalOnly;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-[#E7EBE3] animate-scaleUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#173D22] via-[#245C35] to-[#1E4D2C] p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#B5F078] text-[#173D22]">
              Fintech Restructuring
            </span>
            <span className="text-xs text-white/80">NPA Prevention Engine</span>
          </div>
          <h2 className="text-xl font-bold font-heading flex items-center gap-2">
            <Percent className="w-5 h-5 text-[#B5F078]" />
            One-Time Settlement (OTS) & Restructuring Generator
          </h2>
          <p className="text-xs text-white/70 mt-1">
            Generate customized concession offers, restructuring repayment schedules, and audit-ready legal settlement letters.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {showLetterPreview ? (
            /* Printable Formal Settlement Letter View */
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE3]">
                <button
                  onClick={() => setShowLetterPreview(false)}
                  className="text-xs font-bold text-[#245C35] hover:underline flex items-center gap-1"
                >
                  ← Back to Settlement Calculator
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 rounded-xl bg-[#245C35] hover:bg-[#1E4D2C] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Printer className="w-4 h-4 text-[#B5F078]" />
                    Print / Save as PDF
                  </button>
                </div>
              </div>

              {/* Printable Document Box */}
              <div
                id="printable-ots-letter"
                className="bg-white p-8 rounded-2xl border-2 border-[#E7EBE3] shadow-md space-y-6 text-[#171A17] font-sans"
              >
                {/* Letterhead */}
                <div className="flex items-start justify-between border-b-2 border-[#245C35] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#245C35] text-[#B5F078] flex items-center justify-center font-bold text-lg font-heading">
                      RX
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg tracking-tight text-[#171A17]">
                        REPAYX CREDIT & RECOVERY LIMITED
                      </h3>
                      <p className="text-[11px] text-[#777E77]">
                        Retail Debt Restructuring & Legal Settlement Wing · RBI Regulated NBFC
                      </p>
                      <p className="text-[10px] text-[#777E77] font-mono">
                        Ref: RX-OTS-2026-{selectedBorrower.loanId}-V4
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-bold text-[#245C35]">FORMAL OTS SANCTION</div>
                    <div className="text-[#777E77] text-[11px]">Date: 29 September 2026</div>
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-[#F8FAF6] p-4 rounded-xl border border-[#E7EBE3]">
                  <div>
                    <span className="text-[#777E77] block text-[10px] uppercase font-semibold">Borrower Name</span>
                    <strong className="text-sm text-[#171A17]">{selectedBorrower.name}</strong>
                    <div className="text-[#777E77] mt-0.5">Phone: {selectedBorrower.phone}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[#777E77] block text-[10px] uppercase font-semibold">Loan Account</span>
                    <strong className="text-sm font-mono text-[#245C35]">{selectedBorrower.loanId}</strong>
                    <div className="text-[#777E77] mt-0.5">{selectedBorrower.type} · Overdue: {selectedBorrower.dpd} DPD</div>
                  </div>
                </div>

                {/* Letter Body */}
                <div className="text-xs space-y-3 leading-relaxed text-[#333]">
                  <p>
                    <strong>Subject: In-Principle Approval for One-Time Settlement (OTS) / Restructuring Scheme</strong>
                  </p>
                  <p>
                    Dear {selectedBorrower.name},
                  </p>
                  <p>
                    With reference to your outstanding overdue balance of{' '}
                    <strong>₹{selectedBorrower.overdue.toLocaleString('en-IN')}</strong> under Loan Account Number{' '}
                    <strong>{selectedBorrower.loanId}</strong>, the Competent Settlement Authority of RepayX is pleased to grant formal approval for a negotiated settlement scheme under the following terms:
                  </p>

                  <div className="p-4 rounded-xl bg-[#EDF5E5] border border-[#D1E8BC] space-y-2">
                    <div className="flex justify-between font-bold text-sm text-[#245C35]">
                      <span>Sanctioned Settlement Amount:</span>
                      <span>
                        ₹
                        {(selectedTier === 'tierA'
                          ? tierAPayable
                          : selectedTier === 'tierB'
                          ? overdue
                          : tierCPrincipalOnly
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-[#245C35]">
                      <span>Approved Concession / Late Fee Waiver:</span>
                      <span>
                        ₹
                        {(selectedTier === 'tierA'
                          ? tierADiscount
                          : selectedTier === 'tierB'
                          ? 0
                          : tierCSavings
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-[#245C35]">
                      <span>Settlement Mode:</span>
                      <span>
                        {selectedTier === 'tierA'
                          ? 'Immediate Single Tranche (within 24 Hours via UPI/NetBanking)'
                          : selectedTier === 'tierB'
                          ? '3 Monthly Restructured EMIs of ₹' + tierBEmiAmount.toLocaleString('en-IN')
                          : 'Principal-Only Final Full & Final Closure'}
                      </span>
                    </div>
                  </div>

                  <p>
                    Upon fulfillment of the sanctioned settlement amount as specified above, RepayX will issue an unconditional <strong>No Objection Certificate (NOC)</strong> and update your credit bureau reporting (CIBIL/Equifax) as <em>"Settled in Full"</em>.
                  </p>
                </div>

                {/* Stamp & Signatures */}
                <div className="pt-6 border-t border-[#E7EBE3] flex items-end justify-between">
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-[#171A17]">Digital Verification Seal</div>
                    <div className="w-20 h-20 rounded-xl bg-[#F8FAF6] border border-[#E7EBE3] flex items-center justify-center p-2">
                      <QrCode className="w-14 h-14 text-[#245C35]" />
                    </div>
                    <span className="text-[9px] font-mono text-[#777E77]">Valid for 72 Hours</span>
                  </div>

                  <div className="text-right text-xs space-y-1">
                    <div className="inline-block px-3 py-1 bg-[#EDF5E5] border border-[#D1E8BC] rounded-lg text-[#245C35] font-bold text-[10px] uppercase mb-1">
                      Digitally Approved
                    </div>
                    <div className="font-bold text-sm text-[#171A17]">Priya Parihar</div>
                    <div className="text-[11px] text-[#777E77]">Chief Collection Manager</div>
                    <div className="text-[10px] text-[#777E77]">Retail Credit & Recovery Hub</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Select Borrower */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#777E77] block mb-2">
                  Select Delinquent Account for Settlement
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BORROWER_CANDIDATES.map((b) => (
                    <button
                      key={b.loanId}
                      onClick={() => setSelectedBorrower(b)}
                      className={`p-3.5 rounded-2xl text-left border transition-all ${
                        selectedBorrower.loanId === b.loanId
                          ? 'bg-[#EDF5E5] border-[#245C35] shadow-sm ring-2 ring-[#B5F078]'
                          : 'bg-white border-[#E7EBE3] hover:border-[#D1E8BC]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#171A17]">{b.name}</span>
                        <span className="font-mono text-xs text-[#245C35] font-bold">
                          ₹{b.overdue.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-xs text-[#777E77] mt-1 flex justify-between">
                        <span>{b.loanId} · {b.type}</span>
                        <span className="text-amber-700 font-semibold">{b.dpd} DPD</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3 Settlement Tiers */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#777E77] block mb-2">
                  Choose Strategic Settlement Option
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Tier A */}
                  <div
                    onClick={() => setSelectedTier('tierA')}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      selectedTier === 'tierA'
                        ? 'bg-[#F0FDF4] border-[#16A34A] shadow-md ring-2 ring-[#86EFAC]'
                        : 'bg-white border-[#E7EBE3] hover:border-[#D1E8BC]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534]">
                        24-Hour Quick Pay
                      </span>
                      <Zap className="w-4 h-4 text-[#16A34A]" />
                    </div>
                    <div className="text-xs font-bold text-[#171A17]">Tier 1: Instant Concession</div>
                    <div className="text-xl font-black text-[#166534] mt-2 font-heading">
                      ₹{tierAPayable.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[11px] text-[#777E77] mt-1">
                      Save ₹{tierADiscount.toLocaleString('en-IN')} ({customDiscount}% penalty waiver). Settles today in 1 shot.
                    </p>
                  </div>

                  {/* Tier B */}
                  <div
                    onClick={() => setSelectedTier('tierB')}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      selectedTier === 'tierB'
                        ? 'bg-[#EFF6FF] border-[#3B82F6] shadow-md ring-2 ring-[#93C5FD]'
                        : 'bg-white border-[#E7EBE3] hover:border-[#D1E8BC]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DBEAFE] text-[#1E40AF]">
                        Restructuring
                      </span>
                      <FileCheck className="w-4 h-4 text-[#3B82F6]" />
                    </div>
                    <div className="text-xs font-bold text-[#171A17]">Tier 2: 3-Split Restructure</div>
                    <div className="text-xl font-black text-[#1E40AF] mt-2 font-heading">
                      ₹{tierBEmiAmount.toLocaleString('en-IN')}<span className="text-xs font-normal text-[#555]">/mo</span>
                    </div>
                    <p className="text-[11px] text-[#777E77] mt-1">
                      Split balance into 3 easy interest-free monthly installments. Zero late fine.
                    </p>
                  </div>

                  {/* Tier C */}
                  <div
                    onClick={() => setSelectedTier('tierC')}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      selectedTier === 'tierC'
                        ? 'bg-[#FEF2F2] border-[#EF4444] shadow-md ring-2 ring-[#FCA5A5]'
                        : 'bg-white border-[#E7EBE3] hover:border-[#D1E8BC]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B]">
                        Hard Default OTS
                      </span>
                      <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                    </div>
                    <div className="text-xs font-bold text-[#171A17]">Tier 3: Principal Recovery</div>
                    <div className="text-xl font-black text-[#991B1B] mt-2 font-heading">
                      ₹{tierCPrincipalOnly.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[11px] text-[#777E77] mt-1">
                      Principal-only settlement. Forgive ₹{tierCSavings.toLocaleString('en-IN')} interest & issue NOC.
                    </p>
                  </div>
                </div>
              </div>

              {/* Concession Slider for Tier A */}
              {selectedTier === 'tierA' && (
                <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-[#E7EBE3] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#171A17]">Negotiated Concession Percentage:</span>
                    <span className="font-mono font-bold text-[#245C35] text-sm">{customDiscount}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={customDiscount}
                    onChange={(e) => setCustomDiscount(Number(e.target.value))}
                    className="w-full accent-[#245C35] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#777E77]">
                    <span>Standard (5%)</span>
                    <span>Manager Discretion (15%)</span>
                    <span>Director Approved (30%)</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => setShowLetterPreview(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#245C35] hover:bg-[#1E4D2C] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <FileText className="w-4 h-4 text-[#B5F078]" />
                  Generate Official Settlement Letter & NOC
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
