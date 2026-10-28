import React, { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Calendar,
  Eye,
  RefreshCw,
  Search,
} from 'lucide-react';
import { FollowUpItem } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface FollowupsPageProps {
  followups: FollowUpItem[];
  onOpenConversation: (conversationId?: string) => void;
  onUpdateFollowupStatus: (id: string, status: any) => void;
}

export const FollowupsPage: React.FC<FollowupsPageProps> = ({
  followups,
  onOpenConversation,
  onUpdateFollowupStatus,
}) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'escalated' | 'failed'>('all');
  const [search, setSearch] = useState('');

  // Reschedule Modal State
  const [selectedFollowup, setSelectedFollowup] = useState<FollowUpItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('2026-10-01');
  const [rescheduleTime, setRescheduleTime] = useState('11:00 AM');
  const [rescheduleReason, setRescheduleReason] = useState('Requested by borrower');

  const filtered = followups.filter((f) => {
    const matchesTab = activeTab === 'all' || f.status === activeTab;
    const matchesSearch =
      f.customerName.toLowerCase().includes(search.toLowerCase()) ||
      f.loanId.toLowerCase().includes(search.toLowerCase()) ||
      f.aiReason.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleRescheduleSubmit = () => {
    if (!selectedFollowup) return;
    addToast({
      type: 'success',
      title: 'Follow-up Rescheduled',
      message: `${selectedFollowup.customerName} follow-up moved to ${rescheduleDate} at ${rescheduleTime}.`,
    });
    setSelectedFollowup(null);
  };

  const handleCancelFollowup = (id: string, name: string) => {
    onUpdateFollowupStatus(id, 'failed');
    addToast({
      type: 'warning',
      title: 'Follow-up Cancelled',
      message: `Follow-up for ${name} has been removed from active queue.`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#171A17] tracking-tight font-heading">Follow-ups</h1>
        <p className="text-xs sm:text-sm text-[#777E77] mt-0.5">
          Schedule, track, and execute AI omnichannel customer outreach.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#777E77]">Today's Follow-ups</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#245C35] flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#171A17] mt-2 tabular-nums">64</p>
          <span className="text-[11px] text-[#245C35] font-semibold mt-1 block">Omnichannel queue</span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#B45309]">Pending Action</span>
            <div className="w-8 h-8 rounded-full bg-[#FEF7EA] text-[#D97706] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#D97706] mt-2 tabular-nums">18</p>
          <span className="text-[11px] text-[#B45309] font-medium mt-1 block">Requires outreach</span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#245C35]">Completed</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#16A34A] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#16A34A] mt-2 tabular-nums">42</p>
          <span className="text-[11px] text-[#16A34A] font-medium mt-1 block">Response received</span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Escalated</span>
            <div className="w-8 h-8 rounded-full bg-[#FDF2F4] text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-rose-600 mt-2 tabular-nums">4</p>
          <span className="text-[11px] text-rose-600 font-medium mt-1 block">Disputes / Hardship</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-[20px] p-4 border border-[#E7EBE3] shadow-fintech-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#F5F7F3] p-1 rounded-full border border-[#E7EBE3] overflow-x-auto text-xs font-semibold">
          {(['all', 'pending', 'completed', 'escalated', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-full capitalize transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#245C35] text-white shadow-2xs font-bold'
                  : 'text-[#777E77] hover:text-[#171A17]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#777E77]" />
          <input
            type="text"
            placeholder="Search follow-ups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-full pl-10 pr-4 py-2 text-xs text-[#171A17] placeholder-[#777E77] focus:outline-none focus:ring-2 focus:ring-[#245C35]/20 focus:border-[#245C35] transition-all"
          />
        </div>
      </div>

      {/* Follow-ups Table */}
      <div className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card overflow-hidden transition-all duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F7F3] text-[#777E77] uppercase tracking-wider text-[10px] font-semibold border-b border-[#E7EBE3]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Loan ID</th>
                <th className="py-3.5 px-4 font-semibold">Type</th>
                <th className="py-3.5 px-4 font-semibold">Scheduled At</th>
                <th className="py-3.5 px-4 font-semibold">AI Reason / Context</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EBE3] text-[#171A17]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#EDF5E5]/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#171A17]">{item.customerName}</p>
                    <span className="text-[10px] text-[#777E77] font-mono">{item.customerId}</span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-[#171A17]">
                    {item.loanId}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F7F3] text-[#777E77] border border-[#E7EBE3]">
                      {item.followupType}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#171A17]">
                    <div>{item.scheduledAt}</div>
                    <span className="text-[10px] text-[#777E77]">{item.scheduledTime}</span>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-[#171A17] truncate" title={item.aiReason}>
                      {item.aiReason}
                    </p>
                    <span className="text-[10px] text-[#777E77]">Attempt #{item.attemptNumber}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === 'completed'
                          ? 'bg-[#EDF5E5] text-[#245C35] border-[#D1E8BC]'
                          : item.status === 'pending'
                          ? 'bg-[#FEF7EA] text-[#B45309] border-amber-200'
                          : item.status === 'escalated'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-[#FDF2F4] text-rose-700 border-rose-200'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenConversation()}
                        className="p-1.5 text-[#777E77] hover:text-[#245C35] hover:bg-[#EDF5E5] rounded-full transition-colors cursor-pointer"
                        title="Open Conversation"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedFollowup(item)}
                        className="px-3 py-1 rounded-full bg-[#EDF5E5] hover:bg-[#D1E8BC] text-[#245C35] font-semibold text-[11px] cursor-pointer transition-colors"
                      >
                        Reschedule
                      </button>

                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleCancelFollowup(item.id, item.customerName)}
                          className="px-2.5 py-1 rounded-full border border-[#E7EBE3] hover:bg-[#FDF2F4] hover:text-rose-700 hover:border-rose-200 text-[#777E77] font-medium text-[11px] cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!selectedFollowup}
        onClose={() => setSelectedFollowup(null)}
        title="Reschedule Follow-up"
        subtitle={`Borrower: ${selectedFollowup?.customerName} (${selectedFollowup?.loanId})`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-[#171A17] block mb-1.5">New Date</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-full px-4 py-2 text-xs text-[#171A17] font-mono focus:outline-none focus:border-[#245C35]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#171A17] block mb-1.5">Time Slot</label>
            <select
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-full px-4 py-2 text-xs text-[#171A17] focus:outline-none focus:border-[#245C35]"
            >
              <option value="10:00 AM">10:00 AM</option>
              <option value="11:30 AM">11:30 AM</option>
              <option value="02:30 PM">02:30 PM</option>
              <option value="04:30 PM">04:30 PM</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-[#171A17] block mb-1.5">Reason for Rescheduling</label>
            <input
              type="text"
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-full px-4 py-2 text-xs text-[#171A17] focus:outline-none focus:border-[#245C35]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setSelectedFollowup(null)}
              className="px-4 py-2 rounded-full text-[#777E77] hover:bg-[#F5F7F3] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRescheduleSubmit}
              className="px-4 py-2 rounded-full bg-[#245C35] hover:bg-[#1B4728] text-white font-semibold cursor-pointer shadow-xs transition-colors"
            >
              Confirm Reschedule
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
