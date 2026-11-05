import React, { useState } from 'react';
import {
  BarChart2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  PieChart,
  Printer,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'Loan ID,Borrower Name,Phone,Risk Tier,Principal,Overdue EMI,DPD,PTP Status,Recovery Channel,Settlement Mode,Audit Status',
        'LN1001,Rahul Sharma,+91 98201 54321,High,150000,8500,4,Due Today,WhatsApp,UPI Intent,Verified',
        'LN1002,Ananya Verma,+91 98112 87654,Medium,250000,14200,1,Promised,Email Dispatch,Auto-Debit NACH,Verified',
        'LN1003,Arjun Mehta,+91 98330 19283,High,450000,45600,14,Active Restructure,WhatsApp Multi-Lingual,Tier 1 OTS Approved,In Review',
        'LN1004,Karan Singh,+91 98450 77123,Medium,180000,11400,7,Broken (Re-dunned),SMS & Bot,UPI QR,Pending Check-in',
        'LN1005,Sneha Rao,+91 98860 33412,Low,150000,9200,0,Kept & Paid,WhatsApp,Instant UPI UTR,Settled in Full',
        'LN1006,Vikram Malhotra,+91 97110 44521,Medium,320000,28400,22,PTP Awaiting,Email + Voice Call,3-Split EMI Restructure,Active',
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RepayX_Executive_Recovery_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess('Audit Ledger exported as CSV (.xlsx compatible)');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handlePrintPdf = () => {
    window.print();
    setDownloadSuccess('Print / PDF generation launched');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-[#E7EBE3] animate-scaleUp">
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
              Audit & Compliance
            </span>
            <span className="text-xs text-white/80">Management Briefing</span>
          </div>
          <h2 className="text-xl font-bold font-heading flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#B5F078]" />
            1-Click Executive Recovery Report & Audit Export
          </h2>
          <p className="text-xs text-white/70 mt-1">
            Comprehensive audit-ready management dossier summarizing collection velocity, PTP realization, channel attribution, and NPA reduction.
          </p>
        </div>

        {/* Download notification */}
        {downloadSuccess && (
          <div className="bg-[#EDF5E5] border-b border-[#D1E8BC] px-6 py-2.5 text-xs text-[#245C35] font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-[#245C35]" />
            {downloadSuccess}
          </div>
        )}

        {/* Report Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-[#171A17]">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-[#E7EBE3]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#777E77]">Total Portfolio</div>
              <div className="text-xl font-bold font-heading text-[#171A17] mt-1">₹14.82 Cr</div>
              <div className="text-[10px] text-[#777E77] mt-0.5">61,503 Accounts</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#166534]">Recovered MTD</div>
              <div className="text-xl font-bold font-heading text-[#166534] mt-1">₹3.42 Cr</div>
              <div className="text-[10px] text-[#16A34A] mt-0.5">72.8% Realization</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-[#E7EBE3]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#777E77]">PTP Kept Rate</div>
              <div className="text-xl font-bold font-heading text-[#245C35] mt-1">78.4%</div>
              <div className="text-[10px] text-[#777E77] mt-0.5">Commitment Success</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#1E40AF]">NPA Prevention</div>
              <div className="text-xl font-bold font-heading text-[#1E40AF] mt-1">₹48.2 Lakhs</div>
              <div className="text-[10px] text-[#3B82F6] mt-0.5">Saved via OTS Offers</div>
            </div>
          </div>

          {/* Channel Attribution & Digital Recovery Table */}
          <div className="p-5 rounded-2xl bg-white border border-[#E7EBE3] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#171A17] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#245C35]" />
                Recovery Performance by Outreach Channel
              </h4>
              <span className="text-[10px] text-[#777E77] font-mono">Month-to-Date (September 2026)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E7EBE3] text-left text-[10px] uppercase font-bold text-[#777E77]">
                    <th className="pb-2">Channel</th>
                    <th className="pb-2">Dispatched</th>
                    <th className="pb-2">Click / Read Rate</th>
                    <th className="pb-2">Payments Reconciled</th>
                    <th className="pb-2 text-right">Amount Recovered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4EE]">
                  <tr>
                    <td className="py-2.5 font-bold text-[#171A17] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      WhatsApp Two-Way AI Bot
                    </td>
                    <td className="py-2.5 text-[#555]">4,820</td>
                    <td className="py-2.5 font-semibold text-[#171A17]">91.4%</td>
                    <td className="py-2.5 font-bold text-[#245C35]">3,095 (64.2%)</td>
                    <td className="py-2.5 font-mono font-bold text-right text-[#245C35]">₹2,19,56,000</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-[#171A17] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Dynamic Email Dispatcher
                    </td>
                    <td className="py-2.5 text-[#555]">3,410</td>
                    <td className="py-2.5 font-semibold text-[#171A17]">68.2%</td>
                    <td className="py-2.5 font-bold text-[#245C35]">835 (24.5%)</td>
                    <td className="py-2.5 font-mono font-bold text-right text-[#245C35]">₹83,79,000</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-[#171A17] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Interactive SMS & Voice Reminders
                    </td>
                    <td className="py-2.5 text-[#555]">1,240</td>
                    <td className="py-2.5 font-semibold text-[#171A17]">48.0%</td>
                    <td className="py-2.5 font-bold text-[#245C35]">140 (11.3%)</td>
                    <td className="py-2.5 font-mono font-bold text-right text-[#245C35]">₹38,65,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Verification Block */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAF6] border border-[#E7EBE3] text-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#245C35] shrink-0" />
              <div>
                <div className="font-bold text-[#171A17]">Audit & Regulatory Compliance Status</div>
                <div className="text-[11px] text-[#777E77]">
                  All communications adhere strictly to RBI Fair Practices Code for Digital Debt Collection.
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-[#245C35]">AUDIT VERIFIED</div>
              <div className="text-[10px] text-[#777E77]">Cert ID: RX-AUDIT-2026-Q3</div>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handlePrintPdf}
              className="py-3 px-4 rounded-xl bg-[#245C35] hover:bg-[#1E4D2C] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4 text-[#B5F078]" />
              Print / Save Executive PDF Briefing
            </button>
            <button
              onClick={handleExportCsv}
              className="py-3 px-4 rounded-xl bg-white hover:bg-[#F8FAF6] border border-[#245C35] text-[#245C35] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4 text-[#245C35]" />
              Export Full Audit Ledger (.CSV / Excel)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
