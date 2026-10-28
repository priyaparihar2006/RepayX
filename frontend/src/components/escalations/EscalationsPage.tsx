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
        <h1 className="text-xl sm:text-2xl font-bold text-[#171A17] tracking-tight font-heading">Escalations Queue</h1>
        <p className="text-xs sm:text-sm text-[#777E77] mt-0.5">
          High-priority exceptions, dispute tickets, and extension authorizations requiring manager review.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">High Priority</span>
            <div className="w-8 h-8 rounded-full bg-[#FDF2F4] text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-rose-600 mt-2 tabular-nums">12</p>
          <span className="text-[11px] text-rose-600 font-medium mt-1 block">Requires action &lt; 2 hrs</span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-800">Payment Disputes</span>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-purple-700 mt-2 tabular-nums">6</p>
          <span className="text-[11px] text-purple-600 font-medium mt-1 block">Counter / Ledger mismatch</span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#245C35]">Extension Requests</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#245C35] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#245C35] mt-2 tabular-nums">4</p>
          <span className="text-[11px] text-[#245C35] font-medium mt-1 block">Medical / Hardship</span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#B45309]">Financial Difficulty</span>
            <div className="w-8 h-8 rounded-full bg-[#FEF7EA] text-[#D97706] flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#D97706] mt-2 tabular-nums">8</p>
          <span className="text-[11px] text-[#B45309] font-medium mt-1 block">Restructuring candidates</span>
        </div>
      </div>

      {/* Search & Queue */}
      <div className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card overflow-hidden transition-all duration-200">
        <div className="p-4 sm:px-6 sm:py-4 border-b border-[#E7EBE3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F5F7F3]">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-xs text-[#171A17]">Escalated Items</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF2F4] text-rose-700 border border-rose-200">
              {filtered.length} Active
            </span>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#777E77]" />
            <input
              type="text"
              placeholder="Search escalation queue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-[#E7EBE3] rounded-full pl-10 pr-4 py-1.5 text-xs text-[#171A17] placeholder-[#777E77] focus:outline-none focus:ring-2 focus:ring-[#245C35]/20 focus:border-[#245C35] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F7F3] text-[#777E77] uppercase tracking-wider text-[10px] font-semibold border-b border-[#E7EBE3]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Reason / Issue</th>
                <th className="py-3.5 px-4 font-semibold">AI Recommendation</th>
                <th className="py-3.5 px-4 font-semibold">Created</th>
                <th className="py-3.5 px-4 font-semibold">Priority</th>
                <th className="py-3.5 px-4 font-semibold">Assigned To</th>
                <th className="py-3.5 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EBE3] text-[#171A17]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#EDF5E5]/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#171A17]">{item.customerName}</p>
                    <span className="text-[10px] text-[#777E77] font-mono">
                      {item.customerId} · {item.loanId}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="font-semibold text-[#171A17] truncate" title={item.reason}>
                      {item.reason}
                    </p>
                    <span
                      className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === 'Approved'
                          ? 'bg-[#EDF5E5] text-[#245C35] border-[#D1E8BC]'
                          : item.status === 'Rejected'
                          ? 'bg-[#FDF2F4] text-rose-700 border-rose-200'
                          : 'bg-[#F5F7F3] text-[#777E77] border-[#E7EBE3]'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="flex items-start gap-2 text-[#171A17] bg-[#EDF5E5]/60 p-2.5 rounded-2xl border border-[#D1E8BC]/80">
                      <Sparkles className="w-3.5 h-3.5 text-[#245C35] shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed line-clamp-2" title={item.aiRecommendation}>
                        {item.aiRecommendation}
                      </p>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#777E77]">
                    {item.createdAt}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.priority === 'Critical'
                          ? 'bg-[#FDF2F4] text-rose-700 border-rose-200'
                          : item.priority === 'High'
                          ? 'bg-[#FEF7EA] text-[#B45309] border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-[#777E77] font-medium">
                    {item.assignedTo}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedEscalation(item)}
                        className="px-3 py-1 rounded-full bg-[#245C35] hover:bg-[#1B4728] text-white font-semibold text-[11px] cursor-pointer shadow-2xs transition-colors"
                      >
                        Review
                      </button>

                      {item.status === 'Open' && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id, item.customerName)}
                            className="p-1.5 text-[#245C35] hover:bg-[#EDF5E5] rounded-full transition-colors"
                            title="Quick Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(item.id, item.customerName)}
                            className="p-1.5 text-rose-600 hover:bg-[#FDF2F4] rounded-full transition-colors"
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
          <div className="p-4 bg-[#F5F7F3] rounded-2xl border border-[#E7EBE3] space-y-2">
            <div>
              <span className="text-[10px] text-[#777E77] font-bold uppercase">Customer Reason / Hardship:</span>
              <p className="font-semibold text-[#171A17] mt-0.5">{selectedEscalation?.reason}</p>
            </div>

            <div className="pt-2 border-t border-[#E7EBE3]">
              <span className="text-[10px] text-[#245C35] font-bold uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#245C35]" />
                AI Policy Grounded Recommendation:
              </span>
              <p className="text-[#171A17] mt-1 leading-relaxed">{selectedEscalation?.aiRecommendation}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                onOpenConversation();
                setSelectedEscalation(null);
              }}
              className="text-xs text-[#245C35] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect Full Chat History</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  selectedEscalation && handleReject(selectedEscalation.id, selectedEscalation.customerName)
                }
                className="px-4 py-2 rounded-full border border-rose-200 text-rose-700 hover:bg-[#FDF2F4] font-semibold transition-colors"
              >
                Reject Request
              </button>
              <button
                onClick={() =>
                  selectedEscalation && handleApprove(selectedEscalation.id, selectedEscalation.customerName)
                }
                className="px-4 py-2 rounded-full bg-[#245C35] hover:bg-[#1B4728] text-white font-semibold transition-colors shadow-xs"
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
