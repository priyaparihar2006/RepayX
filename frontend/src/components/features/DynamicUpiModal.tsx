import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  QrCode,
  Smartphone,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

interface DynamicUpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrowerName?: string;
  loanId?: string;
  amount?: number;
  phone?: string;
  onPaymentSettled?: (details: {
    loanId: string;
    amount: number;
    utr: string;
    borrowerName: string;
  }) => void;
}

export const DynamicUpiModal: React.FC<DynamicUpiModalProps> = ({
  isOpen,
  onClose,
  borrowerName = 'Rahul Sharma',
  loanId = 'LN1001',
  amount = 8500,
  phone = '+91 98201 54321',
  onPaymentSettled,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [settledUtr, setSettledUtr] = useState<string | null>(null);

  if (!isOpen) return null;

  const upiId = 'repayx.recovery@icici';
  const payeeName = 'RepayX Loan Recovery Intelligence';
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`EMI Payment ${loanId}`)}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(upiUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateSettlement = () => {
    setIsSettling(true);
    // Play synthetic confirmation chime
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext fallback
    }

    setTimeout(() => {
      const generatedUtr = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      setSettledUtr(generatedUtr);
      setIsSettling(false);
      if (onPaymentSettled) {
        onPaymentSettled({
          loanId,
          amount,
          utr: generatedUtr,
          borrowerName,
        });
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E7EBE3] animate-scaleUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#173D22] via-[#245C35] to-[#1E4D2C] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#B5F078] text-[#173D22]">
              Instant NPCI UPI 2.0
            </span>
            <span className="text-xs text-white/80">Real-time Settlement</span>
          </div>
          <h2 className="text-xl font-bold font-heading flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#B5F078]" />
            Dynamic UPI Payment Intent
          </h2>
          <p className="text-xs text-white/70 mt-1">
            Zero-friction 1-click payment link with auto-reconciling webhook verification.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {settledUtr ? (
            /* Settlement Success View */
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-[#EDF5E5] text-[#245C35] mx-auto flex items-center justify-center border-2 border-[#B5F078] shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-[#245C35]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#171A17]">Instant Payment Reconciled!</h3>
                <p className="text-xs text-[#777E77] mt-1">
                  Payment of <span className="font-bold text-[#171A17]">₹{amount.toLocaleString('en-IN')}</span> for{' '}
                  <span className="font-semibold text-[#171A17]">{borrowerName}</span> ({loanId}) verified via UPI Gateway.
                </p>
              </div>

              <div className="bg-[#F8FAF6] p-4 rounded-2xl border border-[#E7EBE3] text-left text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#777E77]">UTR Number:</span>
                  <span className="font-bold text-[#245C35]">{settledUtr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777E77]">Payment Mode:</span>
                  <span className="font-semibold text-[#171A17]">UPI Intent (PhonePe/GPay)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777E77]">Ledger Status:</span>
                  <span className="text-[#245C35] font-bold">PAID & SETTLED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777E77]">Timestamp:</span>
                  <span className="text-[#171A17]">{new Date().toLocaleTimeString()} Today</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSettledUtr(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#F2F4EE] hover:bg-[#E5E9E0] text-[#171A17] transition-colors"
                >
                  Generate Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#245C35] hover:bg-[#1E4D2C] text-white transition-colors"
                >
                  Close & View Ledger
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Borrower & Amount Card */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAF6] border border-[#E7EBE3]">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#777E77]">Borrower & Loan</div>
                  <div className="font-bold text-sm text-[#171A17]">{borrowerName}</div>
                  <div className="text-xs text-[#777E77]">Loan: <span className="font-mono">{loanId}</span> · {phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#777E77]">EMI Amount</div>
                  <div className="text-2xl font-black text-[#245C35] font-heading">
                    ₹{amount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Dynamic QR Code Box */}
              <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white border border-[#E7EBE3] shadow-inner relative group">
                {/* QR Vector Rendering */}
                <div className="p-3 bg-white rounded-xl shadow-md border border-[#D1E8BC] flex flex-col items-center">
                  <svg
                    viewBox="0 0 160 160"
                    className="w-40 h-40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Background */}
                    <rect width="160" height="160" fill="white" />
                    {/* Top Left Finder */}
                    <rect x="10" y="10" width="40" height="40" rx="4" fill="#245C35" />
                    <rect x="16" y="16" width="28" height="28" rx="2" fill="white" />
                    <rect x="22" y="22" width="16" height="16" rx="1" fill="#245C35" />
                    {/* Top Right Finder */}
                    <rect x="110" y="10" width="40" height="40" rx="4" fill="#245C35" />
                    <rect x="116" y="16" width="28" height="28" rx="2" fill="white" />
                    <rect x="122" y="22" width="16" height="16" rx="1" fill="#245C35" />
                    {/* Bottom Left Finder */}
                    <rect x="10" y="110" width="40" height="40" rx="4" fill="#245C35" />
                    <rect x="16" y="116" width="28" height="28" rx="2" fill="white" />
                    <rect x="22" y="122" width="16" height="16" rx="1" fill="#245C35" />
                    {/* Dynamic Data Cells Matrix */}
                    <rect x="58" y="14" width="8" height="8" fill="#171A17" />
                    <rect x="74" y="14" width="8" height="8" fill="#171A17" />
                    <rect x="90" y="14" width="8" height="8" fill="#171A17" />
                    <rect x="58" y="30" width="8" height="8" fill="#171A17" />
                    <rect x="74" y="38" width="8" height="8" fill="#171A17" />
                    <rect x="90" y="30" width="8" height="8" fill="#171A17" />
                    <rect x="14" y="58" width="8" height="8" fill="#171A17" />
                    <rect x="30" y="58" width="8" height="8" fill="#171A17" />
                    <rect x="46" y="58" width="8" height="8" fill="#171A17" />
                    <rect x="62" y="58" width="8" height="8" fill="#245C35" />
                    <rect x="78" y="58" width="8" height="8" fill="#171A17" />
                    <rect x="94" y="58" width="8" height="8" fill="#245C35" />
                    <rect x="110" y="58" width="8" height="8" fill="#171A17" />
                    <rect x="126" y="58" width="8" height="8" fill="#171A17" />
                    <rect x="142" y="58" width="8" height="8" fill="#171A17" />
                    {/* Center Brand Badge */}
                    <rect x="65" y="65" width="30" height="30" rx="6" fill="#245C35" />
                    <text x="80" y="84" textAnchor="middle" fill="#B5F078" fontSize="14" fontWeight="bold" fontFamily="sans-serif">₹</text>
                    {/* Bottom Matrix */}
                    <rect x="58" y="106" width="8" height="8" fill="#171A17" />
                    <rect x="74" y="106" width="8" height="8" fill="#171A17" />
                    <rect x="90" y="114" width="8" height="8" fill="#171A17" />
                    <rect x="110" y="106" width="8" height="8" fill="#171A17" />
                    <rect x="126" y="114" width="8" height="8" fill="#171A17" />
                    <rect x="142" y="106" width="8" height="8" fill="#171A17" />
                    <rect x="58" y="130" width="8" height="8" fill="#171A17" />
                    <rect x="74" y="138" width="8" height="8" fill="#171A17" />
                    <rect x="90" y="130" width="8" height="8" fill="#245C35" />
                    <rect x="110" y="138" width="8" height="8" fill="#171A17" />
                    <rect x="134" y="130" width="8" height="8" fill="#171A17" />
                  </svg>
                  <span className="text-[10px] font-mono font-medium text-[#777E77] mt-1.5 flex items-center gap-1">
                    Scan with any UPI App
                  </span>
                </div>

                {/* App icons strip */}
                <div className="flex items-center gap-2 mt-3 text-[11px] text-[#777E77]">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">GPay</span>
                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px]">PhonePe</span>
                  <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-[10px]">Paytm</span>
                  <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-bold text-[10px]">BHIM</span>
                  <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-bold text-[10px]">WhatsApp Pay</span>
                </div>
              </div>

              {/* UPI Intent String & Copy */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#777E77] font-medium">Virtual Payment Address (VPA):</span>
                  <span className="font-mono text-[#171A17] font-semibold">{upiId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={upiUri}
                    className="w-full text-[11px] font-mono bg-[#F8FAF6] border border-[#E7EBE3] px-3 py-2 rounded-xl text-[#777E77] select-all outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="shrink-0 px-3 py-2 rounded-xl bg-[#EDF5E5] hover:bg-[#D1E8BC] text-[#245C35] text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleSimulateSettlement}
                  disabled={isSettling}
                  className="w-full py-3 px-4 rounded-xl bg-[#245C35] hover:bg-[#1E4D2C] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Zap className="w-4 h-4 text-[#B5F078]" />
                  {isSettling ? 'Reconciling with Bank Webhook...' : '⚡ Simulate Instant UPI Settlement (1-Click Test)'}
                </button>
                <p className="text-[10px] text-center text-[#777E77]">
                  Demonstrates real-time webhook callback: triggers instant ledger update and sends borrower an e-receipt.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
