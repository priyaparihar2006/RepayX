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
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">
          Recovery Reports & Ledgers
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Audited reporting on delinquency migrations, settlement fulfillment, and collection executive performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((rep) => (
          <div
            key={rep.title}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#516072]/15 text-[#516072]">
                  {rep.type}
                </span>
                <span className="text-xs font-mono text-slate-400">{rep.period}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{rep.title}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {rep.records} · File size: {rep.size}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">Format: .xlsx / .csv</span>
              <button
                onClick={() => handleExport(rep.title)}
                className="px-3 py-1.5 rounded-xl bg-[#516072] hover:bg-[#43505F] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
