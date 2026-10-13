import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Send,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Loan, Customer, FollowUpItem } from '../../types';
import { SendMessageModal } from '../common/SendMessageModal';
import { HowToUseModal } from '../common/HowToUseModal';
import { FollowUpPerformanceCard } from './FollowUpPerformanceCard';
import { ThreeDPieChart } from './ThreeDPieChart';

interface OverviewDashboardProps {
  loans: Loan[];
  customers: Customer[];
  followups: FollowUpItem[];
  onSelectCustomer: (customerId: string) => void;
  onOpenConversation: (conversationId: string) => void;
  onNavigateTab: (tab: string) => void;
  onComposeNewMessage?: () => void;
  onDirectSendMessage?: (data: any) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  loans,
  customers,
  followups,
  onSelectCustomer,
  onOpenConversation,
  onNavigateTab,
  onComposeNewMessage,
  onDirectSendMessage,
}) => {
  // Modals
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [targetCustomerId, setTargetCustomerId] = useState<string | null>(null);

  // Simplified priority action list (compact, minimal text)
  const priorityActionList = [
    {
      customer: 'Rahul Sharma',
      customerId: 'CUS001',
      convId: 'CONV001',
      amount: '₹8,500',
      status: '4d Overdue',
      statusColor: 'text-rose-700 bg-rose-50 border-rose-200',
      tag: 'Salary delay',
    },
    {
      customer: 'Ananya Verma',
      customerId: 'CUS002',
      convId: 'CONV002',
      amount: '₹14,200',
      status: 'PTP Agreed',
      statusColor: 'text-amber-800 bg-amber-50 border-amber-200',
      tag: 'Tomorrow 11 AM',
    },
    {
      customer: 'Arjun Mehta',
      customerId: 'CUS003',
      convId: 'CONV003',
      amount: '₹45,600',
      status: '14d Overdue',
      statusColor: 'text-rose-800 bg-rose-100 border-rose-300 font-bold',
      tag: 'EMI restructuring',
    },
    {
      customer: 'Karan Singh',
      customerId: 'CUS004',
      convId: 'CONV004',
      amount: '₹11,400',
      status: 'Disputed',
      statusColor: 'text-purple-700 bg-purple-50 border-purple-200',
      tag: 'Branch payment',
    },
    {
      customer: 'Sneha Rao',
      customerId: 'CUS005',
      convId: 'CONV005',
      amount: '₹9,200',
      status: 'Due Today',
      statusColor: 'text-blue-700 bg-blue-50 border-blue-200',
      tag: 'Auto-debit',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Streamlined Clean Header */}
      <div className="bg-gradient-to-r from-[#242C36] via-[#354352] to-[#516072] text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/10">
            <span className="text-xl">👋</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold font-heading tracking-tight">
              Good morning, Priya
            </h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Desk active</span>
              <span>·</span>
              <span className="text-amber-300 font-semibold">86 Due</span>
              <span>·</span>
              <span className="text-rose-300 font-semibold">143 Overdue</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsHowToUseOpen(true)}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/15 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
            <span>Guide</span>
          </button>

          <button
            onClick={() => {
              setTargetCustomerId(null);
              setIsSendMessageOpen(true);
            }}
            className="px-4 py-2 bg-white text-[#242C36] hover:bg-slate-100 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Send className="w-3.5 h-3.5 text-[#516072]" />
            <span>New Message</span>
          </button>
        </div>
      </div>

      {/* 5 Minimalist KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Active Loans */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 gap-2">
            <span className="text-xs font-medium text-slate-500 truncate">Active Loans</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-500 font-heading truncate">
            1,248
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 truncate">
            +4.8%
          </div>
        </div>

        {/* Due Today */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 gap-2">
            <span className="text-xs font-medium text-slate-500 truncate">Due Today</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 font-heading truncate">
            86
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-1 truncate">
            Pending
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 gap-2">
            <span className="text-xs font-medium text-slate-500 truncate">Overdue</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 font-heading truncate">
            143
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-1 truncate">
            Action needed
          </div>
        </div>

        {/* Follow-ups */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 gap-2">
            <span className="text-xs font-medium text-slate-500 truncate">Follow-ups</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 font-heading truncate">
            64
          </div>
          <div className="text-[11px] text-indigo-600 font-medium mt-1 truncate">
            Scheduled
          </div>
        </div>

        {/* Recovered */}
        <div className="col-span-2 sm:col-span-1 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 gap-2">
            <span className="text-xs font-medium text-slate-500 truncate">Recovered</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-heading tabular-nums truncate">
            ₹8.42L
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 truncate">
            +12.4%
          </div>
        </div>
      </div>

      {/* Simplified Priority Action List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Priority Follow-ups
            </h3>
            <span className="text-[11px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">
              5
            </span>
          </div>

          <button
            onClick={() => onNavigateTab('conversations')}
            className="text-xs font-semibold text-[#516072] hover:text-[#384351] flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clean, Simple Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[540px]">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                <th className="py-2.5 px-4 font-medium">Borrower</th>
                <th className="py-2.5 px-3 font-medium">Amount</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Tag</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {priorityActionList.map((item) => (
                <tr
                  key={item.customerId}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#516072]/15 text-[#516072] font-bold text-xs flex items-center justify-center shrink-0">
                        {item.customer.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-900 group-hover:text-[#516072] transition-colors">
                        {item.customer}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 tabular-nums">
                    {item.amount}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.statusColor}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {item.tag}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setTargetCustomerId(item.customerId);
                          setIsSendMessageOpen(true);
                        }}
                        className="px-2.5 py-1 bg-[#516072] hover:bg-[#43505F] text-white rounded-lg text-[11px] font-semibold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Message</span>
                      </button>
                      <button
                        onClick={() => onOpenConversation(item.convId)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                        title="Open message history"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Column Section: Follow-Up Performance & 3D Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Follow-Up Performance Module (2 cols) */}
        <div className="lg:col-span-2 min-w-0">
          <FollowUpPerformanceCard
            onOpenMessages={() => onNavigateTab('conversations')}
            onComposeMessage={() => {
              setTargetCustomerId(null);
              setIsSendMessageOpen(true);
            }}
          />
        </div>

        {/* 3D Animated Pie Chart: Payment Status Distribution (1 col) */}
        <div className="lg:col-span-1 min-w-0">
          <ThreeDPieChart
            onSliceClick={(slice) => {
              if (slice.id === 'overdue' || slice.id === 'ptp') {
                onNavigateTab('follow-ups');
              } else {
                onNavigateTab('loans');
              }
            }}
          />
        </div>
      </div>

      {/* Outbound Send Message Modal */}
      <SendMessageModal
        isOpen={isSendMessageOpen}
        onClose={() => {
          setIsSendMessageOpen(false);
          setTargetCustomerId(null);
        }}
        customers={customers}
        loans={loans}
        preselectedCustomerId={targetCustomerId}
        onSendMessageSuccess={(data) => {
          if (onDirectSendMessage) {
            onDirectSendMessage(data);
          } else {
            onNavigateTab('conversations');
          }
        }}
      />

      {/* How to Use Modal */}
      <HowToUseModal
        isOpen={isHowToUseOpen}
        onClose={() => setIsHowToUseOpen(false)}
        onOpenSendMessage={() => setIsSendMessageOpen(true)}
        onNavigateToMessages={() => onNavigateTab('conversations')}
      />
    </div>
  );
};
