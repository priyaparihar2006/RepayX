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
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Follow-ups</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Schedule, track, and execute AI omnichannel customer outreach.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today's Follow-ups</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarClock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">64</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Omnichannel queue</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800 font-semibold">Pending Action</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-2 tabular-nums">18</p>
          <span className="text-[10px] text-amber-600 mt-0.5 block">Requires outreach</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800 font-semibold">Completed</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-2 tabular-nums">42</p>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Response received</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-800 font-semibold">Escalated</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-700 mt-2 tabular-nums">4</p>
          <span className="text-[10px] text-rose-600 mt-0.5 block">Disputes / Hardship</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto text-xs font-semibold">
          {(['all', 'pending', 'completed', 'escalated', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search follow-ups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Follow-ups Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Loan ID</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Scheduled At</th>
                <th className="py-3.5 px-4">AI Reason / Context</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{item.customerName}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{item.customerId}</span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                    {item.loanId}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.followupType}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                    <div>{item.scheduledAt}</div>
                    <span className="text-[10px] text-slate-400">{item.scheduledTime}</span>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-slate-700 truncate" title={item.aiReason}>
                      {item.aiReason}
                    </p>
                    <span className="text-[10px] text-slate-400">Attempt #{item.attemptNumber}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : item.status === 'escalated'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenConversation()}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Open Conversation"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedFollowup(item)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                      >
                        Reschedule
                      </button>

                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleCancelFollowup(item.id, item.customerName)}
                          className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-500 font-medium text-[11px] cursor-pointer transition-colors"
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
            <label className="font-semibold text-slate-700 block mb-1">New Date</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Time Slot</label>
            <select
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            >
              <option value="10:00 AM">10:00 AM</option>
              <option value="11:30 AM">11:30 AM</option>
              <option value="02:30 PM">02:30 PM</option>
              <option value="04:30 PM">04:30 PM</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Reason for Rescheduling</label>
            <input
              type="text"
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setSelectedFollowup(null)}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleRescheduleSubmit}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Confirm Reschedule
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
