import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  PhoneCall,
  UserCheck,
  Search,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { EscalationRecord } from '../../types';
import { INITIAL_ESCALATIONS } from '../../data/mockData';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

export const EscalationsPage: React.FC<{
  onOpenConversation: (customerId?: string) => void;
}> = ({ onOpenConversation }) => {
  const { addToast } = useToast();
  const [escalations, setEscalations] = useState<EscalationRecord[]>(INITIAL_ESCALATIONS);
  const [search, setSearch] = useState('');
  const [selectedEscalation, setSelectedEscalation] = useState<EscalationRecord | null>(null);

  const handleApprove = (id: string, name: string) => {
    setEscalations((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'Approved' } : e))
    );
    addToast({
      type: 'success',
      title: 'Escalation Approved',
      message: `Approved recommendation for ${name}. Recovery parameters updated.`,
    });
    setSelectedEscalation(null);
  };

  const handleReject = (id: string, name: string) => {
    setEscalations((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'Rejected' } : e))
    );
    addToast({
      type: 'warning',
      title: 'Escalation Rejected',
      message: `Request for ${name} rejected. Standard dunning cadence resumed.`,
    });
    setSelectedEscalation(null);
  };

  const filtered = escalations.filter(
    (e) =>
      e.customerName.toLowerCase().includes(search.toLowerCase()) ||
      e.loanId.toLowerCase().includes(search.toLowerCase()) ||
      e.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Escalations Queue</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          High-priority exceptions, dispute tickets, and extension authorizations requiring manager review.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-800 font-semibold">High Priority</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-700 mt-2 tabular-nums">12</p>
          <span className="text-[10px] text-rose-600 mt-0.5 block">Requires action &lt; 2 hrs</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-200/80 shadow-xs bg-purple-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-800 font-semibold">Payment Disputes</span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-purple-700 mt-2 tabular-nums">6</p>
          <span className="text-[10px] text-purple-600 mt-0.5 block">Counter / Ledger mismatch</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-xs bg-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-800 font-semibold">Extension Requests</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-blue-700 mt-2 tabular-nums">4</p>
          <span className="text-[10px] text-blue-600 mt-0.5 block">Medical / Hardship</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800 font-semibold">Financial Difficulty</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-2 tabular-nums">8</p>
          <span className="text-[10px] text-amber-600 mt-0.5 block">Restructuring candidates</span>
        </div>
      </div>

      {/* Search & Queue */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-800">Escalated Items</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
              {filtered.length} Active
            </span>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search escalation queue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Reason / Issue</th>
                <th className="py-3.5 px-4">AI Recommendation</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Assigned To</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{item.customerName}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.customerId} · {item.loanId}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="font-semibold text-slate-800 truncate" title={item.reason}>
                      {item.reason}
                    </p>
                    <span
                      className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        item.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="flex items-start gap-1.5 text-purple-950 bg-purple-50/60 p-2 rounded-xl border border-purple-100">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed line-clamp-2" title={item.aiRecommendation}>
                        {item.aiRecommendation}
                      </p>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                    {item.createdAt}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.priority === 'Critical'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : item.priority === 'High'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {item.assignedTo}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedEscalation(item)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] cursor-pointer"
                      >
                        Review
                      </button>

                      {item.status === 'Open' && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id, item.customerName)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="Quick Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(item.id, item.customerName)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Quick Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedEscalation}
        onClose={() => setSelectedEscalation(null)}
        title="Escalation Review & Authorization"
        subtitle={`Case #${selectedEscalation?.id} · ${selectedEscalation?.customerName} (${selectedEscalation?.loanId})`}
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Customer Reason / Hardship:</span>
              <p className="font-semibold text-slate-900 mt-0.5">{selectedEscalation?.reason}</p>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-[10px] text-purple-700 font-bold uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                AI Policy Grounded Recommendation:
              </span>
              <p className="text-slate-800 mt-1 leading-relaxed">{selectedEscalation?.aiRecommendation}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                onOpenConversation();
                setSelectedEscalation(null);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect Full Chat History</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  selectedEscalation && handleReject(selectedEscalation.id, selectedEscalation.customerName)
                }
                className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold"
              >
                Reject Request
              </button>
              <button
                onClick={() =>
                  selectedEscalation && handleApprove(selectedEscalation.id, selectedEscalation.customerName)
                }
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Approve & Execute Policy
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
