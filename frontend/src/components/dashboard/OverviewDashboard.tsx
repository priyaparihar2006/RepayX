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
  Eye,
  EyeOff,
  Sparkles,
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
  const [showBalance, setShowBalance] = useState(true);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  // Simplified priority action list (compact, minimal text)
  const priorityActionList = [
    {
      customer: 'Rahul Sharma',
      customerId: 'CUS001',
      convId: 'CONV001',
      amount: '₹8,500',
      status: '4d Overdue',
      statusColor: 'text-rose-700 bg-[#FDF2F4] border-rose-200',
      tag: 'Salary delay',
    },
    {
      customer: 'Ananya Verma',
      customerId: 'CUS002',
      convId: 'CONV002',
      amount: '₹14,200',
      status: 'PTP Agreed',
      statusColor: 'text-amber-800 bg-[#FEF7EA] border-amber-200',
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
      statusColor: 'text-emerald-800 bg-[#EDF5E5] border-[#D1E8BC]',
      tag: 'Auto-debit',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 2 Top Hero Cards Inspired by Reference 2 (Modern Banking Dashboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Hero Card: Floating Portfolio Collections Balance Card (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-[20px] p-6 border border-[#E7EBE3] shadow-fintech-card flex flex-col justify-between relative overflow-hidden transition-all duration-200">
          <div>
            {/* Top Row: Title + Currency Switcher + Eye Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#777E77] uppercase tracking-wider">
                  Total Portfolio Recoveries
                </span>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-[#777E77] hover:text-[#171A17] transition-colors cursor-pointer p-0.5"
                  title={showBalance ? 'Hide balance' : 'Show balance'}
                >
                  {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Currency Pill Switcher */}
              <div className="flex items-center p-0.5 bg-[#F5F7F3] rounded-full border border-[#E7EBE3] text-[11px] font-semibold">
                <button
                  onClick={() => setCurrency('INR')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    currency === 'INR'
                      ? 'bg-[#245C35] text-white shadow-2xs font-bold'
                      : 'text-[#777E77] hover:text-[#171A17]'
                  }`}
                >
                  INR ₹
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    currency === 'USD'
                      ? 'bg-[#245C35] text-white shadow-2xs font-bold'
                      : 'text-[#777E77] hover:text-[#171A17]'
                  }`}
                >
                  USD $
                </button>
              </div>
            </div>

            {/* Big Headline Balance */}
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#171A17] font-heading tracking-tight">
                {showBalance ? (currency === 'INR' ? '₹8,42,000' : '$10,120') : '••••••••'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EDF5E5] text-[#245C35] border border-[#D1E8BC]">
                <TrendingUp className="w-3 h-3 text-[#245C35]" />
                +12.4% vs last mo
              </span>
            </div>

            <p className="text-xs text-[#777E77] mt-1.5">
              Collected across 1,248 active borrower EMI accounts this billing cycle.
            </p>
          </div>

          {/* Bottom Action Strip */}
          <div className="mt-6 pt-4 border-t border-[#E7EBE3] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#777E77]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#16A34A]" />
              <span className="font-medium text-[#171A17]">Desk active</span>
              <span>·</span>
              <span>1,248 Accounts</span>
              <span>·</span>
              <span>78.4% Auto-debit</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsHowToUseOpen(true)}
                className="px-3.5 py-2 text-[#777E77] hover:text-[#171A17] hover:bg-[#F5F7F3] text-xs font-semibold rounded-full border border-[#E7EBE3] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Guide</span>
              </button>
              <button
                onClick={() => {
                  setTargetCustomerId(null);
                  setIsSendMessageOpen(true);
                }}
                className="px-4 py-2 bg-[#245C35] hover:bg-[#1B4728] active:bg-[#14351E] text-white text-xs font-bold rounded-full shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-[#B5F078]" />
                <span>New Message</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Hero Card: Priority Recovery Hero Card in Fresh Lime Green #B5F078 (5 cols) */}
        <div className="lg:col-span-5 bg-[#B5F078] text-[#171A17] rounded-[20px] p-6 shadow-fintech-card flex flex-col justify-between relative overflow-hidden transition-all duration-200">
          <div>
            {/* Top Badge */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#171A17] text-[#B5F078]">
                <Sparkles className="w-3 h-3 text-[#B5F078]" />
                Priority Recovery Radar
              </span>
              <span className="text-xs font-bold text-[#171A17]/80">Today</span>
            </div>

            {/* Headline */}
            <div className="mt-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#171A17] tracking-tight">
                143 Overdue Loans
              </h2>
              <p className="text-xs font-medium text-[#171A17]/80 mt-1">
                Accounts with missed installments requiring targeted AI reminders today.
              </p>
            </div>

            {/* Nested Mini Cards */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="bg-white/90 backdrop-blur-xs p-3 rounded-2xl border border-white/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#777E77] block">
                  Due Today
                </span>
                <span className="text-xl font-extrabold text-[#171A17] font-heading mt-0.5 block">
                  86
                </span>
              </div>
              <div className="bg-white/90 backdrop-blur-xs p-3 rounded-2xl border border-white/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#777E77] block">
                  Follow-ups
                </span>
                <span className="text-xl font-extrabold text-[#245C35] font-heading mt-0.5 block">
                  64
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-5 pt-3 border-t border-[#171A17]/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#171A17]/80">
              Immediate attention
            </span>
            <button
              onClick={() => onNavigateTab('follow-ups')}
              className="px-4 py-2 bg-[#171A17] hover:bg-[#242C36] text-[#B5F078] text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span>Review Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5 Minimalist KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Active Loans */}
        <div className="bg-white p-4 rounded-[20px] border border-[#E7EBE3] shadow-fintech-card hover:shadow-fintech-hover transition-all min-w-0">
          <div className="flex items-center justify-between text-[#777E77] mb-2 gap-2">
            <span className="text-xs font-medium text-[#777E77] truncate">Active Loans</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#245C35] flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#171A17] font-heading truncate">
            1,248
          </div>
          <div className="text-[11px] text-[#245C35] font-semibold mt-1 truncate">
            +4.8% growth
          </div>
        </div>

        {/* Due Today */}
        <div className="bg-white p-4 rounded-[20px] border border-[#E7EBE3] shadow-fintech-card hover:shadow-fintech-hover transition-all min-w-0">
          <div className="flex items-center justify-between text-[#777E77] mb-2 gap-2">
            <span className="text-xs font-medium text-[#777E77] truncate">Due Today</span>
            <div className="w-8 h-8 rounded-full bg-[#FEF7EA] text-[#D97706] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#D97706] font-heading truncate">
            86
          </div>
          <div className="text-[11px] text-[#B45309] font-medium mt-1 truncate">
            Pending auto-debit
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white p-4 rounded-[20px] border border-[#E7EBE3] shadow-fintech-card hover:shadow-fintech-hover transition-all min-w-0">
          <div className="flex items-center justify-between text-[#777E77] mb-2 gap-2">
            <span className="text-xs font-medium text-[#777E77] truncate">Overdue</span>
            <div className="w-8 h-8 rounded-full bg-[#FDF2F4] text-[#E11D48] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#E11D48] font-heading truncate">
            143
          </div>
          <div className="text-[11px] text-[#E11D48] font-medium mt-1 truncate">
            Action needed
          </div>
        </div>

        {/* Follow-ups */}
        <div className="bg-white p-4 rounded-[20px] border border-[#E7EBE3] shadow-fintech-card hover:shadow-fintech-hover transition-all min-w-0">
          <div className="flex items-center justify-between text-[#777E77] mb-2 gap-2">
            <span className="text-xs font-medium text-[#777E77] truncate">Follow-ups</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#245C35] flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#245C35] font-heading truncate">
            64
          </div>
          <div className="text-[11px] text-[#245C35] font-medium mt-1 truncate">
            Scheduled automated
          </div>
        </div>

        {/* Recovered */}
        <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-[20px] border border-[#E7EBE3] shadow-fintech-card hover:shadow-fintech-hover transition-all min-w-0">
          <div className="flex items-center justify-between text-[#777E77] mb-2 gap-2">
            <span className="text-xs font-medium text-[#777E77] truncate">Recovered</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#16A34A] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#16A34A] font-heading tabular-nums truncate">
            ₹8.42L
          </div>
          <div className="text-[11px] text-[#16A34A] font-medium mt-1 truncate">
            +12.4% this cycle
          </div>
        </div>
      </div>

      {/* Simplified Priority Action List — Styled like modern transactions list */}
      <div className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card overflow-hidden transition-all duration-200">
        <div className="p-4 sm:px-6 sm:py-4 border-b border-[#E7EBE3] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-[#171A17] font-heading">
              Priority Follow-ups
            </h3>
            <span className="text-[11px] bg-[#FDF2F4] text-[#E11D48] font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
              5 urgent
            </span>
          </div>

          <button
            onClick={() => onNavigateTab('conversations')}
            className="text-xs font-semibold text-[#245C35] hover:text-[#1B4728] px-3 py-1 rounded-full bg-[#EDF5E5] hover:bg-[#D1E8BC] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clean, Simple Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[540px]">
            <thead>
              <tr className="bg-[#F5F7F3] border-b border-[#E7EBE3] text-[10px] font-semibold text-[#777E77] uppercase tracking-wider">
                <th className="py-3 px-5 font-semibold">Borrower</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Tag</th>
                <th className="py-3 px-5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EBE3]">
              {priorityActionList.map((item) => (
                <tr
                  key={item.customerId}
                  className="hover:bg-[#EDF5E5]/40 transition-colors group cursor-pointer"
                >
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#245C35] font-bold text-xs flex items-center justify-center shrink-0 border border-[#D1E8BC]">
                        {item.customer.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-[#171A17] group-hover:text-[#245C35] transition-colors block">
                          {item.customer}
                        </span>
                        <span className="text-[11px] text-[#777E77] font-mono">
                          {item.customerId}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#171A17] tabular-nums">
                    {item.amount}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.statusColor}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] text-[#777E77] font-medium">
                      {item.tag}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setTargetCustomerId(item.customerId);
                          setIsSendMessageOpen(true);
                        }}
                        className="px-3 py-1 bg-[#245C35] hover:bg-[#1B4728] text-white rounded-full text-[11px] font-semibold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3 text-[#B5F078]" />
                        <span>Message</span>
                      </button>
                      <button
                        onClick={() => onOpenConversation(item.convId)}
                        className="p-1.5 text-[#777E77] hover:text-[#171A17] hover:bg-[#EDF5E5] rounded-full cursor-pointer transition-colors"
                        title="Open message history"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
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
