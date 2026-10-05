import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  CreditCard,
  MessageSquare,
  ShieldAlert,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  UserCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Customer, Loan, TimelineEvent } from '../../types';
import { RAHUL_TIMELINE } from '../../data/mockData';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface CustomerDetailViewProps {
  customer: Customer;
  loan?: Loan;
  onBack: () => void;
  onOpenConversation: (conversationId?: string) => void;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  customer,
  loan,
  onBack,
  onOpenConversation,
}) => {
  const { addToast } = useToast();
  const [timeline, setTimeline] = useState<TimelineEvent[]>(RAHUL_TIMELINE);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [isSendFollowupModalOpen, setIsSendFollowupModalOpen] = useState(false);

  // Form states for modals
  const [paymentAmount, setPaymentAmount] = useState(loan ? loan.outstanding.toString() : '8500');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'NetBanking' | 'Auto-Debit'>('UPI');
  const [escalationReason, setEscalationReason] = useState('Prolonged delinquency risk');
  const [followupChannel, setFollowupChannel] = useState<'WhatsApp' | 'SMS'>('WhatsApp');
  const [followupTemplate, setFollowupTemplate] = useState('reminder');
  const [followupMessageText, setFollowupMessageText] = useState(
    `Dear ${customer.name}, gentle reminder from RepayX that your scheduled EMI of ₹${
      loan?.emi.toLocaleString('en-IN') || '8,500'
    } for loan ${loan?.id || 'LN1001'} was due on ${
      loan?.dueDate || '25 Sep 2026'
    }. Please click here to make your payment: https://pay.repayx.internal/${loan?.id || 'LN1001'}`
  );

  const handleSendFollowupSubmit = () => {
    const newEvent: TimelineEvent = {
      id: `T-${Date.now()}`,
      date: '29 Sep 2026',
      time: '12:00 PM',
      title: `Outbound ${followupChannel} Follow-up Sent`,
      description: `"${followupMessageText}"`,
      type: 'manager',
      meta: 'Dispatched by Priya Parihar',
    };
    setTimeline([newEvent, ...timeline]);
    setIsSendFollowupModalOpen(false);
    addToast({
      type: 'success',
      title: 'Follow-up Dispatched',
      message: `Message sent to ${customer.name} via ${followupChannel}. Timeline updated.`,
    });
  };

  const handleMarkPaymentSubmit = () => {
    const newEvent: TimelineEvent = {
      id: `T-${Date.now()}`,
      date: '29 Sep 2026',
      time: '11:45 AM',
      title: 'Payment Recorded',
      description: `Payment of ₹${Number(paymentAmount).toLocaleString(
        'en-IN'
      )} received via ${paymentMethod} marked by Priya Parihar.`,
      type: 'payment',
      meta: 'Verified Ledger Entry',
    };
    setTimeline([newEvent, ...timeline]);
    setIsPaymentModalOpen(false);
    addToast({
      type: 'success',
      title: 'Payment Recorded',
      message: `₹${Number(paymentAmount).toLocaleString('en-IN')} marked as received.`,
    });
  };

  const handleEscalateSubmit = () => {
    const newEvent: TimelineEvent = {
      id: `T-${Date.now()}`,
      date: '29 Sep 2026',
      time: '11:50 AM',
      title: 'Case Escalated',
      description: `Escalated to Credit Head. Reason: ${escalationReason}`,
      type: 'manager',
      meta: 'Priya Parihar',
    };
    setTimeline([newEvent, ...timeline]);
    setIsEscalateModalOpen(false);
    addToast({
      type: 'warning',
      title: 'Account Escalated',
      message: 'Escalation ticket created and dispatched to supervisor queue.',
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back Button & Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customers</span>
        </button>
        <span className="text-slate-400">/</span>
        <span className="text-xs font-semibold text-slate-600">{customer.name}</span>
      </div>

      {/* Customer Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center font-bold text-xl text-slate-700 overflow-hidden ring-2 ring-slate-100 shrink-0">
            {customer.avatar ? (
              <img
                src={customer.avatar}
                alt={customer.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              customer.name.charAt(0)
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {customer.id}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  loan?.status === 'overdue'
                    ? 'bg-rose-100 text-rose-800'
                    : loan?.status === 'promise_to_pay'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {loan?.status ? loan.status.replace('_', ' ').toUpperCase() : 'ACTIVE'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1.5">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {customer.phone}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {customer.email}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {customer.city}
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                Risk Score: {customer.creditScore} ({customer.riskCategory})
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsSendFollowupModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Follow-up</span>
          </button>

          <button
            onClick={() => onOpenConversation()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>View Conversation</span>
          </button>

          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Mark Payment</span>
          </button>

          <button
            onClick={() => setIsEscalateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Escalate</span>
          </button>
        </div>
      </div>

      {/* Customer Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500">Loan Amount</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            ₹{loan?.principal.toLocaleString('en-IN') || '1,00,000'}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">{loan?.loanType || 'Personal Loan'}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500">Monthly EMI</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            ₹{loan?.emi.toLocaleString('en-IN') || '8,500'}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Tenure: {loan?.tenureMonths || 14} mos</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs bg-rose-50/20">
          <span className="text-[11px] font-medium text-rose-700 font-semibold">Outstanding Balance</span>
          <p className="text-xl font-bold font-mono text-rose-700 mt-1 tabular-nums">
            ₹{loan?.outstanding.toLocaleString('en-IN') || '8,500'}
          </p>
          <span className="text-[10px] text-rose-600 mt-1 block">Principal + Penalties</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500">Due Date</span>
          <p className="text-base font-bold font-mono text-slate-800 mt-1">
            {loan?.dueDate || '25 Sep 2026'}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Cycle: 25th of month</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs bg-amber-50/20">
          <span className="text-[11px] font-medium text-amber-800 font-semibold">Days Overdue (DPD)</span>
          <p className="text-xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
            {loan?.daysOverdue !== undefined ? loan.daysOverdue : 4} Days
          </p>
          <span className="text-[10px] text-amber-700 mt-1 block">Bucket 1 (1-30 DPD)</span>
        </div>
      </div>

      {/* Customer Timeline (Section 11 Requirement) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recovery & Follow-Up Timeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological log of customer interactions, AI intent models, system triggers, and manager actions.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> System
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> AI Action
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Customer
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Manager / Payment
            </span>
          </div>
        </div>

        {/* Vertical Timeline Stream */}
        <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {timeline.map((event) => {
            const isSystem = event.type === 'system';
            const isAI = event.type === 'ai';
            const isCustomer = event.type === 'customer';
            const isManager = event.type === 'manager';
            const isPayment = event.type === 'payment';

            return (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs text-white ${
                    isAI
                      ? 'bg-purple-600'
                      : isCustomer
                      ? 'bg-blue-600'
                      : isManager
                      ? 'bg-amber-600'
                      : isPayment
                      ? 'bg-emerald-600'
                      : 'bg-slate-500'
                  }`}
                >
                  {isAI && <Sparkles className="w-3 h-3" />}
                  {isCustomer && <MessageSquare className="w-3 h-3" />}
                  {isManager && <UserCheck className="w-3 h-3" />}
                  {isPayment && <CheckCircle2 className="w-3 h-3" />}
                  {isSystem && <Clock className="w-3 h-3" />}
                </div>

                {/* Event Content Card */}
                <div className="flex-1 bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{event.title}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          isAI
                            ? 'bg-purple-100 text-purple-700'
                            : isCustomer
                            ? 'bg-blue-100 text-blue-700'
                            : isManager
                            ? 'bg-amber-100 text-amber-700'
                            : isPayment
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {event.type}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      <span>{event.date}</span> · <span>{event.time}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-normal">{event.description}</p>

                  {event.meta && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Source / Verified: {event.meta}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mark Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Loan Repayment"
        subtitle={`Loan ${loan?.id} · ${customer.name}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Repayment Amount (₹)</label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            >
              <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
              <option value="NetBanking">NetBanking (IMPS / NEFT)</option>
              <option value="Auto-Debit">Auto-Debit (NACH Re-attempt)</option>
            </select>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
            ⚠️ Note: Recording this will register a verified receipt into the payments ledger and trigger an automated WhatsApp confirmation to the borrower.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleMarkPaymentSubmit}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Confirm & Post Payment
            </button>
          </div>
        </div>
      </Modal>

      {/* Send Follow-up Modal */}
      <Modal
        isOpen={isSendFollowupModalOpen}
        onClose={() => setIsSendFollowupModalOpen(false)}
        title="Send Customer Follow-Up Message"
        subtitle={`Dispatch omnichannel communication to ${customer.name} (${customer.phone})`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Delivery Channel</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFollowupChannel('WhatsApp')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  followupChannel === 'WhatsApp'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>💬 WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setFollowupChannel('SMS')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  followupChannel === 'SMS'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>📱 SMS</span>
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Select Policy Template</label>
            <select
              value={followupTemplate}
              onChange={(e) => {
                const tpl = e.target.value;
                setFollowupTemplate(tpl);
                const outstanding = loan ? `₹${loan.outstanding.toLocaleString('en-IN')}` : '₹8,500';
                const loanId = loan ? loan.id : 'LN1001';
                if (tpl === 'reminder') {
                  setFollowupMessageText(
                    `Dear ${customer.name}, gentle reminder that your scheduled EMI of ${outstanding} for loan ${loanId} is due. Please click here to make payment: https://pay.repayx.internal/${loanId}`
                  );
                } else if (tpl === 'overdue') {
                  setFollowupMessageText(
                    `Urgent: Dear ${customer.name}, your payment of ${outstanding} for loan ${loanId} is overdue. Please complete repayment today to avoid additional penal charges.`
                  );
                } else if (tpl === 'delay') {
                  setFollowupMessageText(
                    `Hello ${customer.name}, we have noted your timeline. When your salary credits, please use this verified UPI link: https://pay.repayx.internal/upi/${loanId}`
                  );
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            >
              <option value="reminder">📌 Pre-Due / Due Date Friendly Reminder</option>
              <option value="overdue">⚠️ Overdue & Delinquency Default Warning</option>
              <option value="delay">⏳ Salary Delay Acknowledgment & UPI Link</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Message Preview & Edit</label>
            <textarea
              rows={4}
              value={followupMessageText}
              onChange={(e) => setFollowupMessageText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-purple-900 text-[11px] flex items-center justify-between">
            <span>Authorizing Executive: <strong>Priya Parihar</strong></span>
            <span className="text-[10px] font-mono text-purple-700">Digital Audit Trail</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsSendFollowupModalOpen(false);
                onOpenConversation();
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Open Full Chat Screen →
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSendFollowupModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendFollowupSubmit}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Follow-up</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Escalate Modal */}
      <Modal
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
        title="Escalate Account to Senior Recovery"
        subtitle={`Account: ${customer.name} (${loan?.id})`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Escalation Reason</label>
            <select
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            >
              <option value="Prolonged delinquency risk">Prolonged Delinquency Risk (DPD &gt; 15)</option>
              <option value="Unreachable on contact numbers">Unreachable / Contactability Issue</option>
              <option value="Dispute over penal interest">Dispute over penal interest or fee</option>
              <option value="Legal demand notice requirement">Require Field Visit / Legal Demand Notice</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEscalateModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleEscalateSubmit}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Dispatch Escalation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
