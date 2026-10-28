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
    const payLink = `https://pay.repayx.ai/inv/${loanId}`;

    switch (tplKey) {
      case 'reminder':
        return `Hello ${cust.name}, this is a reminder from RepayX that your scheduled payment of ${amount} for loan ${loanId} was due on ${dueDate}. Please pay here: ${payLink}`;
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
      aiDraft = `Dear ${currentCustomer.name}, your loan ${loanId} is ${daysOverdue} days past due (${amount}). Per policy, please clear by this evening to avoid penalty escalation. Link: https://pay.repayx.ai/inv/${loanId}`;
    } else {
      aiDraft = `Hello ${currentCustomer.name}, Priya here from RepayX. Hope you are well! Just checking in regarding the EMI of ${amount} due on ${currentLoan?.dueDate || '25 Sep'}. Would you like to pay now via UPI or schedule for tomorrow? Link: https://pay.repayx.ai/inv/${loanId}`;
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
          <label className="block text-xs font-bold text-[#171A17] uppercase tracking-wider mb-1.5 font-heading">
            1. Select Borrower
          </label>
          <div className="relative">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-[#F5F7F3] border border-[#E7EBE3] rounded-full text-xs font-semibold text-[#171A17] focus:outline-none focus:ring-2 focus:ring-[#245C35]/20 focus:border-[#245C35] transition-all cursor-pointer"
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
            <div className="mt-2.5 p-3.5 bg-[#EDF5E5] border border-[#D1E8BC] rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#245C35] text-white font-bold flex items-center justify-center shrink-0">
                  {currentCustomer.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <div className="font-bold text-[#171A17]">{currentCustomer.name}</div>
                  <div className="text-[#245C35] text-[11px] font-mono">
                    Phone: {currentCustomer.phone} · ID: {currentCustomer.id}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#171A17] text-sm tabular-nums">
                  ₹{currentLoan ? currentLoan.outstanding.toLocaleString('en-IN') : '8,500'}
                </div>
                <div className="text-[11px] font-semibold text-rose-700">
                  {currentLoan?.daysOverdue ? `${currentLoan.daysOverdue} Days Overdue` : 'Due Today'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Choose Channel */}
        <div>
          <label className="block text-xs font-bold text-[#171A17] uppercase tracking-wider mb-1.5 font-heading">
            2. Choose Delivery Channel
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setChannel('WhatsApp')}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                channel === 'WhatsApp'
                  ? 'border-[#245C35] bg-[#EDF5E5] text-[#245C35] ring-2 ring-[#B5F078] shadow-xs'
                  : 'border-[#E7EBE3] bg-white hover:bg-[#F5F7F3] text-[#777E77]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  channel === 'WhatsApp' ? 'bg-[#245C35] text-white' : 'bg-[#F5F7F3] text-[#777E77]'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#171A17]">WhatsApp</div>
                <div className="text-[10px] text-[#245C35] font-semibold">Highest response rate (94%)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChannel('SMS')}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                channel === 'SMS'
                  ? 'border-[#245C35] bg-[#EDF5E5] text-[#245C35] ring-2 ring-[#B5F078] shadow-xs'
                  : 'border-[#E7EBE3] bg-white hover:bg-[#F5F7F3] text-[#777E77]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  channel === 'SMS' ? 'bg-[#245C35] text-white' : 'bg-[#F5F7F3] text-[#777E77]'
                }`}
              >
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#171A17]">SMS Text</div>
                <div className="text-[10px] text-[#777E77]">Official carrier notification</div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 3: Fast Templates */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-[#171A17] uppercase tracking-wider font-heading">
              3. Quick 1-Tap Templates
            </label>
            <button
              type="button"
              onClick={handleGenerateAiDraft}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#245C35] bg-[#EDF5E5] hover:bg-[#D1E8BC] px-3 py-1 rounded-full border border-[#D1E8BC] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#245C35]" />
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  activeTemplate === t.id
                    ? 'bg-[#245C35] text-white border-[#245C35] shadow-xs'
                    : 'bg-[#F5F7F3] hover:bg-[#EDF5E5] text-[#171A17] border-[#E7EBE3]'
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
            <label className="text-xs font-bold text-[#171A17] uppercase tracking-wider font-heading">
              4. Message Content (Edit Freely)
            </label>
            <span className="text-[11px] text-[#777E77]">{messageText.length} characters</span>
          </div>
          <textarea
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              setActiveTemplate('custom');
            }}
            rows={4}
            placeholder="Type your message to the borrower here..."
            className="w-full p-3.5 bg-[#F5F7F3] border border-[#E7EBE3] rounded-2xl text-xs sm:text-sm text-[#171A17] focus:outline-none focus:ring-2 focus:ring-[#245C35]/20 focus:border-[#245C35] leading-relaxed resize-none transition-all"
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-[#E7EBE3]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#777E77] hover:text-[#171A17] rounded-full hover:bg-[#F5F7F3] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !messageText.trim()}
            className="px-5 py-2 bg-[#245C35] hover:bg-[#1B4728] disabled:opacity-50 text-white rounded-full text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-2"
          >
            {isSending ? (
              <>
                <Clock className="w-4 h-4 animate-spin text-[#B5F078]" />
                Sending via {channel}...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-[#B5F078]" />
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
