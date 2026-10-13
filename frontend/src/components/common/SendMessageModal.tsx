import React, { useState, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  Sparkles,
  User,
  Phone,
  CreditCard,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  X,
  Clock,
  ArrowRight,
  Search,
} from 'lucide-react';
import { Customer, Loan } from '../../types';
import { Modal } from './Modal';
import { useToast } from './Toast';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  loans: Loan[];
  preselectedCustomerId?: string | null;
  onSendMessageSuccess: (data: {
    customerId: string;
    customerName: string;
    channel: 'WhatsApp' | 'SMS';
    messageText: string;
  }) => void;
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  isOpen,
  onClose,
  customers,
  loans,
  preselectedCustomerId,
  onSendMessageSuccess,
}) => {
  const { addToast } = useToast();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomerId || customers[0]?.id || 'CUS001'
  );
  const [channel, setChannel] = useState<'WhatsApp' | 'SMS'>('WhatsApp');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<string>('reminder');
  const [isSending, setIsSending] = useState(false);

  // Sync selected customer if prop changes
  useEffect(() => {
    if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
    }
  }, [preselectedCustomerId]);

  const currentCustomer =
    customers.find((c) => c.id === selectedCustomerId) || customers[0] || ({} as Customer);
  const currentLoan = loans.find((l) => l.customerId === currentCustomer.id);

  // Template generator
  const getTemplateText = (tplKey: string, cust: Customer, loan?: Loan) => {
    const loanId = loan?.id || 'LN1001';
    const amount = loan ? `₹${loan.outstanding.toLocaleString('en-IN')}` : '₹8,500';
    const dueDate = loan?.dueDate || '25 Sep 2026';
    const payLink = `https://pay.loanflow.internal/upi/${loanId}`;

    switch (tplKey) {
      case 'reminder':
        return `Hello ${cust.name}, this is a reminder from LoanFlow that your scheduled payment of ${amount} for loan ${loanId} was due on ${dueDate}. Please pay here: ${payLink}`;
      case 'link':
        return `Dear ${cust.name}, here is your instant UPI repayment link for loan ${loanId} (${amount}): ${payLink}. Supports Google Pay, PhonePe & Paytm.`;
      case 'salary':
        return `Hello ${cust.name}, following up regarding your loan repayment. Could you please confirm your expected salary credit date so we can note it in your record?`;
      case 'grace':
        return `Dear ${cust.name}, we understand you may be facing temporary financial difficulty. We can offer a 5-day grace period for loan ${loanId}. Please reply to confirm.`;
      case 'urgent':
        return `Urgent Notice: Dear ${cust.name}, payment of ${amount} for loan ${loanId} is overdue. Please clear dues today to prevent negative reporting to credit bureaus.`;
      default:
        return '';
    }
  };

  // Pre-fill text when customer or template changes
  useEffect(() => {
    if (activeTemplate !== 'custom' && currentCustomer?.name) {
      setMessageText(getTemplateText(activeTemplate, currentCustomer, currentLoan));
    }
  }, [selectedCustomerId, activeTemplate]);

  // AI draft generator
  const handleGenerateAiDraft = () => {
    const daysOverdue = currentLoan?.daysOverdue || 4;
    const loanId = currentLoan?.id || 'LN1001';
    const amount = currentLoan ? `₹${currentLoan.outstanding.toLocaleString('en-IN')}` : '₹8,500';

    let aiDraft = '';
    if (daysOverdue > 7) {
      aiDraft = `Dear ${currentCustomer.name}, your loan ${loanId} is ${daysOverdue} days past due (${amount}). Per bank policy, please clear by this evening to avoid penalty escalation. Link: https://pay.loanflow.internal/upi/${loanId}`;
    } else {
      aiDraft = `Hello ${currentCustomer.name}, Priya here from LoanFlow. Hope you are well! Just checking in regarding the EMI of ${amount} due on ${currentLoan?.dueDate || '25 Sep'}. Would you like to pay now via UPI or schedule for tomorrow? Link: https://pay.loanflow.internal/upi/${loanId}`;
    }

    setActiveTemplate('custom');
    setMessageText(aiDraft);
    addToast({
      type: 'info',
      title: 'AI Draft Generated',
      message: `Tailored for ${currentCustomer.name}'s loan status`,
    });
  };

  const handleSend = () => {
    if (!messageText.trim()) {
      addToast({
        type: 'warning',
        title: 'Empty Message',
        message: 'Please write a message or select a template.',
      });
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      onSendMessageSuccess({
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        channel,
        messageText: messageText.trim(),
      });
      addToast({
        type: 'success',
        title: `Message Sent via ${channel}!`,
        message: `Successfully delivered to ${currentCustomer.name} (${currentCustomer.phone}).`,
      });
      onClose();
    }, 400);
  };

  const filteredCustomers = searchQuery
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone.includes(searchQuery) ||
          c.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : customers;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Message to Borrower"
      subtitle="Outbound WhatsApp or SMS reminder directly from your dashboard"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Step 1: Select Borrower */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            1. Select Borrower
          </label>
          <div className="relative">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#516072] focus:bg-white transition-all cursor-pointer"
            >
              {filteredCustomers.map((c) => {
                const l = loans.find((item) => item.customerId === c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone} · ₹{l ? l.outstanding.toLocaleString('en-IN') : '8,500'} Due (
                    {l?.status?.toUpperCase() || 'DUE'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Customer mini card */}
          {currentCustomer && (
            <div className="mt-2.5 p-3 bg-[#516072]/10 border border-[#516072]/20 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#516072] text-white font-bold flex items-center justify-center shrink-0">
                  {currentCustomer.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{currentCustomer.name}</div>
                  <div className="text-slate-500 text-[11px]">
                    Phone: {currentCustomer.phone} · ID: {currentCustomer.id}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900 text-sm">
                  ₹{currentLoan ? currentLoan.outstanding.toLocaleString('en-IN') : '8,500'}
                </div>
                <div className="text-[11px] font-medium text-rose-600">
                  {currentLoan?.daysOverdue ? `${currentLoan.daysOverdue} Days Overdue` : 'Due Today'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Choose Channel */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            2. Choose Delivery Channel
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setChannel('WhatsApp')}
              className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                channel === 'WhatsApp'
                  ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  channel === 'WhatsApp' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold">WhatsApp</div>
                <div className="text-[10px] text-slate-500">Highest response rate (94%)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChannel('SMS')}
              className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                channel === 'SMS'
                  ? 'border-[#516072] bg-[#516072]/15 text-[#242D37] ring-2 ring-[#516072]/30 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  channel === 'SMS' ? 'bg-[#516072] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold">SMS Text</div>
                <div className="text-[10px] text-slate-500">Official carrier notification</div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 3: Fast Templates */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              3. Quick 1-Tap Templates
            </label>
            <button
              type="button"
              onClick={handleGenerateAiDraft}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Auto AI Draft
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'reminder', label: '🔔 EMI Reminder' },
              { id: 'link', label: '💳 Instant UPI Link' },
              { id: 'salary', label: '📅 Salary Date Query' },
              { id: 'grace', label: '⏳ 5-Day Grace Offer' },
              { id: 'urgent', label: '⚠️ Overdue Notice' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTemplate(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  activeTemplate === t.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Message Text Area */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              4. Message Content (Edit Freely)
            </label>
            <span className="text-[11px] text-slate-400">{messageText.length} characters</span>
          </div>
          <textarea
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              setActiveTemplate('custom');
            }}
            rows={4}
            placeholder="Type your message to the borrower here..."
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#516072] focus:bg-white leading-relaxed resize-none transition-all"
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !messageText.trim()}
            className="px-5 py-2.5 bg-[#516072] hover:bg-[#414E5E] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-2"
          >
            {isSending ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Sending via {channel}...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send via {channel} Now
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
