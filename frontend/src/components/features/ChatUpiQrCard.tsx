import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  QrCode,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';
import { UpiPaymentIntentData } from '../../types';

export interface ChatUpiQrCardProps {
  data: UpiPaymentIntentData;
  onPaymentSettled?: (details: {
    loanId: string;
    amount: number;
    utr: string;
    borrowerName: string;
  }) => void;
  className?: string;
}

export const ChatUpiQrCard: React.FC<ChatUpiQrCardProps> = ({
  data,
  onPaymentSettled,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [settledUtr, setSettledUtr] = useState<string | null>(data.settledUtr || (data.isSettled ? 'UTR849201948210' : null));

  const amount = data.amount || 14200;
  const borrowerName = data.borrowerName || 'Borrower';
  const loanId = data.loanId || 'LN1002';
  const phone = data.phone || '+91 98201 54321';
  const vpa = data.vpa || 'repayx.recovery@icici';
  const payeeName = 'RepayX Loan Recovery Intelligence';

  const upiUri =
    data.upiUri ||
    `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(
      payeeName
    )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`EMI Payment ${loanId}`)}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(upiUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateSettlement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSettling(true);

    // Play synthetic confirmation chime
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
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
      // Audio fallback
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
    }, 1100);
  };

  return (
    <div
      className={`my-2 text-left bg-white text-slate-900 rounded-2xl border border-emerald-200/90 shadow-md overflow-hidden max-w-sm sm:max-w-md w-full transition-all ${className}`}
    >
      {/* Top Header Strip */}
      <div className="bg-gradient-to-r from-[#173D22] via-[#245C35] to-[#1E4D2C] px-3.5 py-2.5 text-white">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#B5F078] text-[#173D22]">
            Instant NPCI UPI 2.0
          </span>
          <span className="text-[10px] text-white/80 font-medium">Real-time Settlement</span>
        </div>
        <div className="flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-[#B5F078] shrink-0" />
          <h4 className="text-xs font-bold tracking-tight text-white">
            Dynamic UPI Payment Intent
          </h4>
        </div>
        <p className="text-[10px] text-white/75 mt-0.5 leading-tight">
          Embedded WhatsApp QR code · Zero-friction 1-tap repayment with instant ledger reconciliation.
        </p>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Borrower & Amount Card */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAF6] border border-[#E7EBE3]">
          <div className="min-w-0 pr-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#777E77]">
              Borrower & Loan
            </div>
            <div className="font-bold text-xs text-[#171A17] truncate">{borrowerName}</div>
            <div className="text-[10px] text-[#777E77] truncate">
              Loan: <span className="font-mono font-semibold">{loanId}</span> · {phone}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#777E77]">
              EMI Amount
            </div>
            <div className="text-lg font-black text-[#245C35]">
              ₹{amount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {settledUtr ? (
          /* Settlement Verified State */
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-center space-y-2 animate-fadeIn">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950">
                Instant UPI Payment Reconciled!
              </div>
              <div className="text-[10px] text-emerald-800 mt-0.5">
                ₹{amount.toLocaleString('en-IN')} received from {borrowerName} ({loanId})
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-emerald-200 text-left text-[10px] font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">UTR Number:</span>
                <span className="font-bold text-emerald-700">{settledUtr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gateway:</span>
                <span className="text-slate-800 font-semibold">NPCI UPI Intent Webhook</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-700">PAID & SETTLED</span>
              </div>
            </div>
          </div>
        ) : (
          /* Active QR & Pay Intent */
          <>
            {/* Dynamic Vector QR Container */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-[#E7EBE3] shadow-xs">
              <div className="p-2 bg-white rounded-lg border border-[#D1E8BC] flex flex-col items-center shadow-xs">
                <svg
                  viewBox="0 0 160 160"
                  className="w-32 h-32 sm:w-36 sm:h-36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
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
                  <text
                    x="80"
                    y="84"
                    textAnchor="middle"
                    fill="#B5F078"
                    fontSize="14"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    ₹
                  </text>
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
                <span className="text-[9px] font-mono font-medium text-[#777E77] mt-1 flex items-center gap-1">
                  Scan directly with any UPI App
                </span>
              </div>

              {/* Supported apps strip */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px]">
                  GPay
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[9px]">
                  PhonePe
                </span>
                <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-[9px]">
                  Paytm
                </span>
                <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-bold text-[9px]">
                  BHIM
                </span>
                <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-bold text-[9px]">
                  WhatsApp Pay
                </span>
              </div>
            </div>

            {/* VPA and Copy */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#777E77] font-medium">Virtual Payment Address:</span>
                <span className="font-mono text-[#171A17] font-semibold">{vpa}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={upiUri}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-500 truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3 text-slate-600" />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 pt-1">
              {/* Direct UPI pay button */}
              <a
                href={upiUri}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-[#245C35] hover:from-emerald-700 hover:to-[#1E4D2C] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Tap to launch PhonePe / GPay / WhatsApp Pay directly"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pay ₹{amount.toLocaleString('en-IN')} via UPI App</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>

              {/* 1-Click Simulation Button */}
              <button
                type="button"
                onClick={handleSimulateSettlement}
                disabled={isSettling}
                className="w-full py-2 px-3 rounded-xl bg-[#245C35] hover:bg-[#1E4D2C] disabled:bg-slate-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-[#B5F078]" />
                <span>
                  {isSettling
                    ? 'Reconciling with Bank Webhook...'
                    : '⚡ Simulate Instant UPI Settlement (1-Click Test)'}
                </span>
              </button>
              <p className="text-[9px] text-center text-[#777E77] leading-tight">
                Simulates real-time webhook callback: triggers instant ledger update and sends borrower an e-receipt in chat.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
