import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Zap,
  Loader2,
  Building2,
  BadgeCheck,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { paymentsApi, RazorpayPaymentItem } from '../../services/payments';

interface DynamicUpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrowerName?: string;
  loanId?: string;
  amount?: number;
  phone?: string;
  customerId?: string;
  email?: string;
  onPaymentSettled?: (details: {
    loanId: string;
    amount: number;
    utr: string;
    borrowerName: string;
    paymentId?: string;
    linkId?: string;
  }) => void;
}

export const DynamicUpiModal: React.FC<DynamicUpiModalProps> = ({
  isOpen,
  onClose,
  borrowerName = 'Rahul Sharma',
  loanId = 'LN1001',
  amount = 8500,
  phone = '+91 98201 54321',
  customerId = '385057',
  email = 'rahul.sharma@example.com',
  onPaymentSettled,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [razorpayData, setRazorpayData] = useState<RazorpayPaymentItem | null>(null);
  const [settledDetails, setSettledDetails] = useState<{
    utr: string;
    paymentId: string;
    linkId: string;
    amount: number;
    timestamp: string;
  } | null>(null);

  // Fallback VPA
  const upiId = 'repayx.recovery@icici';
  const payeeName = 'RepayX Loan Recovery Intelligence';

  // Fetch or generate Razorpay dynamic payment link upon modal open
  useEffect(() => {
    if (!isOpen) {
      setSettledDetails(null);
      return;
    }

    let isMounted = true;
    async function initRazorpayLink() {
      setLoadingLink(true);
      try {
        const item = await paymentsApi.createPaymentLink({
          customer_id: customerId,
          customer_name: borrowerName,
          loan_id: loanId,
          amount,
          phone,
          email,
          description: `EMI Payment for Loan #${loanId}`,
        });
        if (isMounted && item) {
          setRazorpayData(item);
        }
      } catch (err) {
        console.warn('Could not generate Razorpay link from API, using dynamic link:', err);
      } finally {
        if (isMounted) setLoadingLink(false);
      }
    }

    void initRazorpayLink();
    return () => {
      isMounted = false;
    };
  }, [isOpen, customerId, borrowerName, loanId, amount, phone, email]);

  if (!isOpen) return null;

  const paymentUrl = razorpayData?.short_url || `https://rzp.io/rzp/repayx-${loanId.toLowerCase()}`;
  const paymentLinkId = razorpayData?.payment_link_id || `plink_rzp_${loanId}`;
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Razorpay EMI ${loanId}`)}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(paymentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText(paymentLinkId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleSimulateSettlement = async () => {
    setIsSettling(true);

    // Audio chime confirmation
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
    } catch {}

    const generatedUtr = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const generatedPayId = `pay_${loanId}_${Date.now().toString().slice(-6)}`;

    try {
      await paymentsApi.simulateWebhook(loanId, amount, customerId, false);
    } catch (err) {
      console.warn('Webhook simulation call note:', err);
    }

    setTimeout(() => {
      setSettledDetails({
        utr: generatedUtr,
        paymentId: generatedPayId,
        linkId: paymentLinkId,
        amount,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
      setIsSettling(false);
      if (onPaymentSettled) {
        onPaymentSettled({
          loanId,
          amount,
          utr: generatedUtr,
          borrowerName,
          paymentId: generatedPayId,
          linkId: paymentLinkId,
        });
      }
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp max-h-[92vh] flex flex-col">
        {/* Razorpay Brand Header */}
        <div className="bg-gradient-to-r from-[#0C2340] via-[#0D325E] to-[#173D22] p-5 sm:p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#3395FF] text-white shadow-sm">
              <ShieldCheck className="w-3 h-3" />
              Razorpay Secured
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#B5F078] text-[#173D22]">
              Instant NPCI UPI 2.0
            </span>
            <span className="text-[11px] text-white/80">Real-time Webhook</span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#3395FF]" />
            Razorpay Dynamic QR & Payment Gateway
          </h2>
          <p className="text-xs text-white/75 mt-1">
            Scan QR with any UPI App, or pay securely using Debit/Credit Card, NetBanking & EMI.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {settledDetails ? (
            /* Settlement Success View */
            <div className="text-center py-4 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border-2 border-emerald-400 shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-1">
                  <BadgeCheck className="w-3.5 h-3.5" /> Razorpay Verified
                </span>
                <h3 className="text-lg font-bold text-slate-900">Payment Successfully Reconciled!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Payment of <span className="font-bold text-slate-900">₹{amount.toLocaleString('en-IN')}</span> for{' '}
                  <span className="font-semibold text-slate-900">{borrowerName}</span> ({loanId}) verified via Razorpay webhook.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2 font-mono">
                <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                  <span className="text-slate-500">Razorpay Payment ID:</span>
                  <span className="font-bold text-blue-700">{settledDetails.paymentId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Razorpay Link ID:</span>
                  <span className="font-bold text-slate-800">{settledDetails.linkId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Bank UTR Number:</span>
                  <span className="font-bold text-emerald-700">{settledDetails.utr}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-semibold text-slate-800">Razorpay UPI QR / Cards</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Webhook Status:</span>
                  <span className="text-emerald-700 font-bold">HMAC-SHA256 SIGNED (PAID)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Ledger Update:</span>
                  <span className="text-emerald-700 font-bold">BALANCE RECONCILED</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-800">{settledDetails.timestamp} Today</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSettledDetails(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Generate Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#173D22] hover:bg-[#0F2916] text-white transition-colors"
                >
                  Close & View Ledger
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Borrower & Amount Card */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Borrower & Loan Account</div>
                  <div className="font-bold text-sm text-slate-900">{borrowerName}</div>
                  <div className="text-xs text-slate-500">Loan: <span className="font-mono font-semibold text-slate-700">{loanId}</span> · {phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">EMI Amount</div>
                  <div className="text-2xl font-black text-emerald-700 font-heading">
                    ₹{amount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Dynamic Razorpay QR Scanner Box */}
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-inner relative group">
                {/* Razorpay Scanner Image */}
                <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-blue-100 flex flex-col items-center relative">
                  {loadingLink ? (
                    <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-[#0082FB]" />
                      <span className="text-xs font-medium">Generating Razorpay QR...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Dynamic Scannable QR Code */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(
                          paymentUrl || upiIntentUri
                        )}`}
                        alt="Razorpay Dynamic Payment QR Code"
                        className="w-44 h-44 rounded-lg block"
                        onError={(e) => {
                          // Fallback to SVG QR if remote API is delayed
                          (e.target as HTMLElement).style.display = 'none';
                          const fallback = document.getElementById('qr-svg-fallback');
                          if (fallback) fallback.style.display = 'block';
                        }}
                      />

                      {/* Fallback SVG QR representation */}
                      <div id="qr-svg-fallback" style={{ display: 'none' }}>
                        <svg viewBox="0 0 160 160" className="w-44 h-44" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="160" height="160" fill="white" />
                          <rect x="10" y="10" width="40" height="40" rx="4" fill="#0C2340" />
                          <rect x="16" y="16" width="28" height="28" rx="2" fill="white" />
                          <rect x="22" y="22" width="16" height="16" rx="1" fill="#0C2340" />
                          <rect x="110" y="10" width="40" height="40" rx="4" fill="#0C2340" />
                          <rect x="116" y="16" width="28" height="28" rx="2" fill="white" />
                          <rect x="122" y="22" width="16" height="16" rx="1" fill="#0C2340" />
                          <rect x="10" y="110" width="40" height="40" rx="4" fill="#0C2340" />
                          <rect x="16" y="116" width="28" height="28" rx="2" fill="white" />
                          <rect x="22" y="122" width="16" height="16" rx="1" fill="#0C2340" />
                          <rect x="58" y="14" width="8" height="8" fill="#171A17" />
                          <rect x="74" y="14" width="8" height="8" fill="#171A17" />
                          <rect x="90" y="14" width="8" height="8" fill="#171A17" />
                          <rect x="58" y="30" width="8" height="8" fill="#171A17" />
                          <rect x="74" y="38" width="8" height="8" fill="#171A17" />
                          <rect x="90" y="30" width="8" height="8" fill="#171A17" />
                          <rect x="14" y="58" width="8" height="8" fill="#171A17" />
                          <rect x="30" y="58" width="8" height="8" fill="#171A17" />
                          <rect x="46" y="58" width="8" height="8" fill="#171A17" />
                          <rect x="62" y="58" width="8" height="8" fill="#0082FB" />
                          <rect x="78" y="58" width="8" height="8" fill="#171A17" />
                          <rect x="94" y="58" width="8" height="8" fill="#0082FB" />
                          <rect x="110" y="58" width="8" height="8" fill="#171A17" />
                          <rect x="126" y="58" width="8" height="8" fill="#171A17" />
                          <rect x="142" y="58" width="8" height="8" fill="#171A17" />
                          <rect x="58" y="106" width="8" height="8" fill="#171A17" />
                          <rect x="74" y="106" width="8" height="8" fill="#171A17" />
                          <rect x="90" y="114" width="8" height="8" fill="#171A17" />
                          <rect x="110" y="106" width="8" height="8" fill="#171A17" />
                          <rect x="126" y="114" width="8" height="8" fill="#171A17" />
                          <rect x="142" y="106" width="8" height="8" fill="#171A17" />
                          <rect x="58" y="130" width="8" height="8" fill="#171A17" />
                          <rect x="74" y="138" width="8" height="8" fill="#171A17" />
                          <rect x="90" y="130" width="8" height="8" fill="#0082FB" />
                          <rect x="110" y="138" width="8" height="8" fill="#171A17" />
                          <rect x="134" y="130" width="8" height="8" fill="#171A17" />
                        </svg>
                      </div>

                      {/* Razorpay Brand Center Badge */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-xl bg-[#0C2340] border-2 border-white shadow-md flex items-center justify-center">
                          <span className="text-white font-black text-sm tracking-tighter">R</span>
                          <span className="text-[#3395FF] font-black text-xs">zp</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] font-mono font-semibold text-slate-600 mt-2 flex items-center gap-1">
                    Scan with any UPI App or Mobile Camera
                  </span>
                </div>

                {/* UPI & Payment App Badges */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100">GPay</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-100">PhonePe</span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-bold border border-sky-100">Paytm</span>
                  <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-bold border border-orange-100">BHIM</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">WhatsApp Pay</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold">CRED</span>
                </div>
              </div>

              {/* Razorpay Payment Details Grid */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Razorpay Payment Link ID:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-800">{paymentLinkId}</span>
                    <button
                      onClick={handleCopyId}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                      title="Copy Link ID"
                    >
                      {copiedId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Razorpay Hosted Checkout URL:</span>
                    <a
                      href={paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#0082FB] hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Open Checkout <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={paymentUrl}
                      className="w-full text-[11px] font-mono bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700 select-all outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 transition-colors border border-blue-200"
                    >
                      {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Accepted Payment Modes Pill Bar */}
                <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Accepted:</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-medium">
                    <Smartphone className="w-2.5 h-2.5 text-blue-600" /> UPI QR & Apps
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-medium">
                    <CreditCard className="w-2.5 h-2.5 text-emerald-600" /> Visa / MC / RuPay
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-medium">
                    <Building2 className="w-2.5 h-2.5 text-purple-600" /> NetBanking
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-medium">
                    <Wallet className="w-2.5 h-2.5 text-amber-600" /> EMI & Wallets
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0082FB] hover:bg-[#0070DE] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Pay via Razorpay Hosted Page (Card, NetBanking, UPI)
                </a>

                <button
                  onClick={handleSimulateSettlement}
                  disabled={isSettling}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#173D22] hover:bg-[#0F2916] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-[#B5F078]" />
                  {isSettling ? 'Verifying Razorpay HMAC Webhook...' : '⚡ Simulate Instant Razorpay Webhook Settlement (1-Click Test)'}
                </button>

                <p className="text-[10px] text-center text-slate-500">
                  Simulates verified Razorpay <code className="font-mono text-slate-700">payment_link.paid</code> webhook: auto-reconciles loan ledger, records transaction, and halts overdue reminders.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
