import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  X,
  Zap,
} from 'lucide-react';

export interface PtpItem {
  id: string;
  borrowerName: string;
  loanId: string;
  phone: string;
  amount: number;
  promisedDate: string;
  status: 'promised' | 'due_today' | 'kept' | 'broken';
  reason: string;
  autoPauseReminders: boolean;
  confidence: number;
  notes: string;
}

const INITIAL_PTP_ITEMS: PtpItem[] = [
  {
    id: 'PTP-101',
    borrowerName: 'Rahul Sharma',
    loanId: 'LN1001',
    phone: '+91 98201 54321',
    amount: 8500,
    promisedDate: 'Today (30 Sep 2026)',
    status: 'due_today',
    reason: 'Salary Credit on Month-End',
    autoPauseReminders: true,
    confidence: 96,
    notes: 'Borrower confirmed in WhatsApp: "Salary 30 tak 100% credit hogi, direct GPay karunga."',
  },
  {
    id: 'PTP-102',
    borrowerName: 'Ananya Verma',
    loanId: 'LN1002',
    phone: '+91 98112 87654',
    amount: 14200,
    promisedDate: '02 Oct 2026',
    status: 'promised',
    reason: 'Client Invoice Clearance',
    autoPauseReminders: true,
    confidence: 91,
    notes: 'Freelance consulting payment expected by 2nd Oct.',
  },
  {
    id: 'PTP-103',
    borrowerName: 'Karan Singh',
    loanId: 'LN1004',
    phone: '+91 98450 77123',
    amount: 11400,
    promisedDate: '28 Sep 2026',
    status: 'broken',
    reason: 'Medical Emergency',
    autoPauseReminders: false,
    confidence: 84,
    notes: 'Promise missed by 2 days; requires supervisor escalation check.',
  },
  {
    id: 'PTP-104',
    borrowerName: 'Sneha Rao',
    loanId: 'LN1005',
    phone: '+91 98860 33412',
    amount: 9200,
    promisedDate: '27 Sep 2026',
    status: 'kept',
    reason: 'Regular EMI via NetBanking',
    autoPauseReminders: true,
    confidence: 98,
    notes: 'Paid in full on promised date via UPI QR intent.',
  },
];

interface PtpTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpiModal?: (item: { borrowerName: string; loanId: string; amount: number }) => void;
}

export const PtpTrackerModal: React.FC<PtpTrackerModalProps> = ({
  isOpen,
  onClose,
  onOpenUpiModal,
}) => {
  const [items, setItems] = useState<PtpItem[]>(INITIAL_PTP_ITEMS);
  const [filter, setFilter] = useState<'all' | 'promised' | 'due_today' | 'kept' | 'broken'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [naturalNote, setNaturalNote] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSmartParse = () => {
    if (!naturalNote.trim()) return;
    setIsParsing(true);
    setTimeout(() => {
      // Simulate NLP extraction
      const extractedItem: PtpItem = {
        id: `PTP-${Math.floor(100 + Math.random() * 900)}`,
        borrowerName: naturalNote.includes('Arjun') ? 'Arjun Mehta' : 'Vikram Malhotra',
        loanId: naturalNote.includes('Arjun') ? 'LN1003' : 'LN1006',
        phone: '+91 98330 19283',
        amount: 22800,
        promisedDate: '05 Oct 2026',
        status: 'promised',
        reason: 'Extracted via NLP Intent Engine',
        autoPauseReminders: true,
        confidence: 94,
        notes: naturalNote,
      };
      setItems([extractedItem, ...items]);
      setIsParsing(false);
      setNaturalNote('');
      setShowAddForm(false);
      showNotification(`Smart PTP recorded for ${extractedItem.borrowerName} with Auto-Pause enabled!`);
    }, 700);
  };

  const handleUpdateStatus = (id: string, newStatus: PtpItem['status']) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    showNotification(`Promise status updated to: ${newStatus.toUpperCase()}`);
  };

  const handleSendCheckin = (item: PtpItem) => {
    showNotification(`Gentle morning check-in reminder dispatched to ${item.borrowerName} over WhatsApp!`);
  };

  const filteredItems = items.filter((item) => filter === 'all' || item.status === filter);

  const totalKept = items.filter((i) => i.status === 'kept').length;
  const realizationRate = Math.round((totalKept / (items.length || 1)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#E7EBE3] animate-scaleUp">
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
              AI Lifecycle Engine
            </span>
            <span className="text-xs text-white/80">Borrower Commitment Management</span>
          </div>
          <h2 className="text-xl font-bold font-heading flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#B5F078]" />
            Promise-to-Pay (PTP) Tracker & Auto-Pause Engine
          </h2>
          <p className="text-xs text-white/70 mt-1">
            Automatically extracts commitments from WhatsApp & email, pauses aggressive dunning, and coordinates gentle morning check-ins.
          </p>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-white/15">
            <div className="bg-white/10 rounded-xl p-2.5">
              <div className="text-[10px] text-white/70">Realization Rate</div>
              <div className="text-lg font-bold font-heading text-[#B5F078]">{realizationRate}%</div>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <div className="text-[10px] text-white/70">Auto-Paused Reminders</div>
              <div className="text-lg font-bold font-heading text-white">4 Accounts</div>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <div className="text-[10px] text-white/70">Check-in Due Today</div>
              <div className="text-lg font-bold font-heading text-amber-300">
                {items.filter((i) => i.status === 'due_today').length} Accounts
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <div className="text-[10px] text-white/70">PTP Volume</div>
              <div className="text-lg font-bold font-heading text-white">₹43,300</div>
            </div>
          </div>
        </div>

        {/* Action Notice Toast inside modal */}
        {actionNotice && (
          <div className="bg-[#EDF5E5] border-b border-[#D1E8BC] px-6 py-2.5 text-xs text-[#245C35] font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-[#245C35]" />
            {actionNotice}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Auto-Pause Policy Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#16A34A] shrink-0" />
              <div>
                <span className="font-bold text-[#166534]">Auto-Pause Dunning Active: </span>
                <span className="text-[#15803D]">
                  When a borrower commits to a payment date, repetitive phone calls & high-urgency notifications are automatically silenced until the promised morning.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] shrink-0">
              PROTECTING CX
            </span>
          </div>

          {/* Controls: Filter & Add */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-[#F8FAF6] p-1 rounded-xl border border-[#E7EBE3]">
              {(['all', 'due_today', 'promised', 'kept', 'broken'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    filter === tab
                      ? 'bg-[#245C35] text-white shadow-sm'
                      : 'text-[#777E77] hover:text-[#171A17]'
                  }`}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-1.5 rounded-xl bg-[#245C35] hover:bg-[#1E4D2C] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4 text-[#B5F078]" />
              Record New PTP via NLP
            </button>
          </div>

          {/* NLP Natural Language Input Form */}
          {showAddForm && (
            <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-[#D1E8BC] space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-[#245C35]">
                <Sparkles className="w-4 h-4 text-[#245C35]" />
                AI Conversational PTP Extractor
              </div>
              <p className="text-xs text-[#777E77]">
                Type the borrower's statement or call notes. RepayX will parse the date, commitment amount, and configure the auto-pause trigger automatically:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder='e.g. "Arjun Mehta called saying client invoice will clear on 5th Oct, will pay Rs 22,800."'
                  value={naturalNote}
                  onChange={(e) => setNaturalNote(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-[#E7EBE3] rounded-xl outline-none focus:border-[#245C35]"
                />
                <button
                  onClick={handleSmartParse}
                  disabled={isParsing || !naturalNote.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#245C35] hover:bg-[#1E4D2C] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-[#B5F078]" />
                  {isParsing ? 'Analyzing...' : 'Parse & Schedule'}
                </button>
              </div>
            </div>
          )}

          {/* PTP Items List */}
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-[#E7EBE3] hover:border-[#D1E8BC] transition-all shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EDF5E5] text-[#245C35] flex items-center justify-center font-bold font-heading">
                      {item.borrowerName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#171A17]">{item.borrowerName}</span>
                        <span className="text-[11px] font-mono text-[#777E77]">{item.loanId}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'due_today'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : item.status === 'kept'
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : item.status === 'broken'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-[#777E77] mt-0.5 flex items-center gap-2">
                        <span>Due: <strong className="text-[#171A17]">{item.promisedDate}</strong></span>
                        <span>·</span>
                        <span>Reason: {item.reason}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                    <div className="text-base font-black text-[#245C35] font-heading">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-[#777E77] flex items-center gap-1">
                      <PauseCircle className="w-3 h-3 text-[#245C35]" />
                      Auto-Pause Active
                    </div>
                  </div>
                </div>

                {/* Notes box */}
                <div className="p-2.5 rounded-xl bg-[#F8FAF6] border border-[#E7EBE3] text-xs text-[#555] flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-[#777E77] shrink-0 mt-0.5" />
                  <span className="italic">"{item.notes}"</span>
                </div>

                {/* Card Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F2F4EE]">
                  <div className="text-[11px] text-[#777E77]">
                    Confidence Score: <strong className="text-[#245C35]">{item.confidence}%</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenUpiModal && (
                      <button
                        onClick={() =>
                          onOpenUpiModal({
                            borrowerName: item.borrowerName,
                            loanId: item.loanId,
                            amount: item.amount,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EDF5E5] hover:bg-[#D1E8BC] text-[#245C35] transition-colors"
                      >
                        ⚡ Instant UPI Link
                      </button>
                    )}

                    {item.status === 'due_today' && (
                      <button
                        onClick={() => handleSendCheckin(item)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        Send Morning Check-in
                      </button>
                    )}

                    {item.status !== 'kept' && (
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'kept')}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#245C35] hover:bg-[#1E4D2C] text-white transition-colors"
                      >
                        Mark Kept
                      </button>
                    )}

                    {item.status !== 'broken' && item.status !== 'kept' && (
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'broken')}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                      >
                        Mark Broken
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
