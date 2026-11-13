import React, { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../common/Toast';
import { ExecutiveReportModal } from '../features/ExecutiveReportModal';

export const ReportsPage: React.FC = () => {
  const { addToast } = useToast();
  const [execReportOpen, setExecReportOpen] = useState(false);

  const handleExport = (reportName: string) => {
    addToast({
      type: 'success',
      title: 'Report Generated',
      message: `${reportName} downloaded as Excel (XLSX).`,
    });
  };

  const reports = [
    {
      title: 'Monthly Recovery & PTP Audit Report',
      period: 'September 2026',
      records: '1,248 Accounts',
      size: '3.4 MB',
      type: 'Recovery Audit',
    },
    {
      title: 'DPD Bucket Migration Analysis (Bucket 0 to 3)',
      period: 'Q3 2026 (July - Sep)',
      records: '4,890 Transitions',
      size: '6.1 MB',
      type: 'Delinquency Flow',
    },
    {
      title: 'AI Intent Parsing Accuracy & Escalation Log',
      period: 'Last 30 Days',
      records: '2,410 Dialogue Turns',
      size: '1.8 MB',
      type: 'NLP Telemetry',
    },
    {
      title: 'UPI & NACH Failure / Bounce Settlement Summary',
      period: '20 Sep - 29 Sep 2026',
      records: '142 Bounces',
      size: '890 KB',
      type: 'Payment Clearing',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202B25] tracking-tight font-heading">
            Recovery Reports & Ledgers
          </h1>
          <p className="text-xs sm:text-sm text-[#77827B] mt-0.5">
            Audited reporting on delinquency migrations, settlement fulfillment, and collection executive performance.
          </p>
        </div>
        <button
          onClick={() => setExecReportOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#198754] hover:bg-[#157347] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-[#A3E635]" />
          1-Click Executive PDF & CSV Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((rep) => (
          <div
            key={rep.title}
            className="bg-white rounded-2xl p-5 border border-[#E5EBE7] shadow-fintech flex flex-col justify-between transition-all duration-200 hover:border-[#198754]/40"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#EAF5ED] text-[#198754] border border-[#D5E6D9]">
                  {rep.type}
                </span>
                <span className="text-xs font-mono text-[#77827B]">{rep.period}</span>
              </div>
              <h3 className="font-bold text-[#202B25] text-sm font-heading">{rep.title}</h3>
              <p className="text-xs text-[#77827B] mt-1">
                {rep.records} · File size: {rep.size}
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-[#E5EBE7] flex items-center justify-between">
              <span className="text-[11px] text-[#77827B] font-mono">Format: .xlsx / .csv</span>
              <button
                onClick={() => handleExport(rep.title)}
                className="px-4 py-2 rounded-xl bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#A3E635]" />
                <span>Download Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      <ExecutiveReportModal
        isOpen={execReportOpen}
        onClose={() => setExecReportOpen(false)}
      />
    </div>
  );
};
