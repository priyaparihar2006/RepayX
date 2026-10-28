import React from 'react';
import { TrendingUp, Download, Calendar, BarChart2, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../common/Toast';

export const ReportsPage: React.FC = () => {
  const { addToast } = useToast();

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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#171A17] tracking-tight font-heading">
          Recovery Reports & Ledgers
        </h1>
        <p className="text-xs sm:text-sm text-[#777E77] mt-0.5">
          Audited reporting on delinquency migrations, settlement fulfillment, and collection executive performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((rep) => (
          <div
            key={rep.title}
            className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card flex flex-col justify-between transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#EDF5E5] text-[#245C35] border border-[#D1E8BC]">
                  {rep.type}
                </span>
                <span className="text-xs font-mono text-[#777E77]">{rep.period}</span>
              </div>
              <h3 className="font-bold text-[#171A17] text-sm font-heading">{rep.title}</h3>
              <p className="text-xs text-[#777E77] mt-1">
                {rep.records} · File size: {rep.size}
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-[#E7EBE3] flex items-center justify-between">
              <span className="text-[11px] text-[#777E77] font-mono">Format: .xlsx / .csv</span>
              <button
                onClick={() => handleExport(rep.title)}
                className="px-4 py-2 rounded-full bg-[#245C35] hover:bg-[#1B4728] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#B5F078]" />
                <span>Download Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
