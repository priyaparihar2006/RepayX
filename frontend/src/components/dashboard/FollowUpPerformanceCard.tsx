import React, { useState } from 'react';
import {
  TrendingUp,
  MessageSquare,
  Send,
} from 'lucide-react';

interface FollowUpPerformanceProps {
  onOpenMessages?: () => void;
  onComposeMessage?: () => void;
}

type Period = '7D' | '30D' | '90D';
type ChannelFilter = 'all' | 'whatsapp' | 'sms' | 'call';

interface DayMetric {
  day: string;
  sent: number;
  replies: number;
  ptp: number;
  recovered: string;
}

const PERFORMANCE_DATA: Record<Period, DayMetric[]> = {
  '7D': [
    { day: 'Mon', sent: 72, replies: 54, ptp: 38, recovered: '₹1.8L' },
    { day: 'Tue', sent: 88, replies: 68, ptp: 49, recovered: '₹2.4L' },
    { day: 'Wed', sent: 94, replies: 76, ptp: 55, recovered: '₹3.1L' },
    { day: 'Thu', sent: 81, replies: 62, ptp: 44, recovered: '₹2.2L' },
    { day: 'Fri', sent: 110, replies: 89, ptp: 68, recovered: '₹4.3L' },
    { day: 'Sat', sent: 65, replies: 48, ptp: 34, recovered: '₹1.6L' },
    { day: 'Sun', sent: 42, replies: 31, ptp: 22, recovered: '₹0.9L' },
  ],
  '30D': [
    { day: 'W1', sent: 480, replies: 372, ptp: 260, recovered: '₹12.4L' },
    { day: 'W2', sent: 530, replies: 418, ptp: 295, recovered: '₹14.8L' },
    { day: 'W3', sent: 590, replies: 472, ptp: 340, recovered: '₹17.2L' },
    { day: 'W4', sent: 615, replies: 498, ptp: 362, recovered: '₹18.6L' },
  ],
  '90D': [
    { day: 'Jul', sent: 2150, replies: 1680, ptp: 1210, recovered: '₹58.5L' },
    { day: 'Aug', sent: 2420, replies: 1910, ptp: 1390, recovered: '₹66.8L' },
    { day: 'Sep', sent: 2680, replies: 2140, ptp: 1580, recovered: '₹74.2L' },
  ],
};

export const FollowUpPerformanceCard: React.FC<FollowUpPerformanceProps> = ({
  onOpenMessages,
  onComposeMessage,
}) => {
  const [period, setPeriod] = useState<Period>('7D');
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);

  const currentDataset = PERFORMANCE_DATA[period];
  const maxSent = Math.max(...currentDataset.map((d) => d.sent));

  const totalSent = currentDataset.reduce((acc, d) => acc + d.sent, 0);
  const totalReplies = currentDataset.reduce((acc, d) => acc + d.replies, 0);
  const totalPtp = currentDataset.reduce((acc, d) => acc + d.ptp, 0);
  const avgResponseRate = Math.round((totalReplies / totalSent) * 100);
  const avgPtpRate = Math.round((totalPtp / totalReplies) * 100);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
      <div>
        {/* Simple Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Follow-Up Performance
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              +14.2%
            </span>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
            {(['7D', '30D', '90D'] as Period[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setPeriod(tab);
                  setActiveHoverIndex(null);
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs ${
                  period === tab
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Clean, Simple 4-Metric Grid (Zero clutter, zero overflow) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-4">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              Sent
            </span>
            <div className="text-lg font-bold text-slate-900 font-heading mt-0.5 truncate">
              {totalSent.toLocaleString()}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/80 min-w-0">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block truncate">
              Replies
            </span>
            <div className="text-lg font-bold text-emerald-700 font-heading mt-0.5 truncate">
              {avgResponseRate}%
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#516072]/10 border border-[#516072]/20 min-w-0">
            <span className="text-[10px] font-semibold text-[#516072] uppercase tracking-wider block truncate">
              PTP Rate
            </span>
            <div className="text-lg font-bold text-[#242C36] font-heading mt-0.5 truncate">
              {avgPtpRate}%
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100/80 min-w-0">
            <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block truncate">
              Response Time
            </span>
            <div className="text-lg font-bold text-amber-700 font-heading mt-0.5 truncate">
              18m
            </div>
          </div>
        </div>

        {/* Minimal Channel Filters & Legend */}
        <div className="flex items-center justify-between mb-3 text-xs flex-wrap gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { id: 'all', label: 'All' },
              { id: 'whatsapp', label: 'WhatsApp' },
              { id: 'sms', label: 'SMS' },
              { id: 'call', label: 'Calls' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setChannel(c.id as ChannelFilter)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  channel === c.id
                    ? 'bg-[#516072] text-white shadow-2xs font-semibold'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#516072]" />
              <span>Sent</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Replies</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>PTP</span>
            </span>
          </div>
        </div>

        {/* Chart Visuals */}
        <div className="h-40 sm:h-44 flex items-end justify-between gap-2 sm:gap-3 pt-3 pb-2 border-b border-slate-100">
          {currentDataset.map((item, idx) => {
            const hSent = Math.round((item.sent / maxSent) * 100);
            const hReplies = Math.round((item.replies / maxSent) * 100);
            const hPtp = Math.round((item.ptp / maxSent) * 100);
            const isHovered = activeHoverIndex === idx;

            return (
              <div
                key={item.day}
                onMouseEnter={() => setActiveHoverIndex(idx)}
                onMouseLeave={() => setActiveHoverIndex(null)}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group relative"
              >
                {/* Minimalist Floating Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 bg-[#252E38] text-white px-2.5 py-1.5 rounded-lg shadow-lg text-[10px] whitespace-nowrap z-20 pointer-events-none">
                    <span className="font-bold">{item.day}:</span> {item.sent} sent · {item.replies} replies · {item.recovered}
                  </div>
                )}

                {/* Bars Trio */}
                <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-full">
                  <div
                    style={{ height: `${hSent}%` }}
                    className="w-1/3 bg-[#516072] rounded-t-sm group-hover:bg-[#414D5C] transition-all"
                  />
                  <div
                    style={{ height: `${hReplies}%` }}
                    className="w-1/3 bg-emerald-500 rounded-t-sm group-hover:bg-emerald-600 transition-all"
                  />
                  <div
                    style={{ height: `${hPtp}%` }}
                    className="w-1/3 bg-amber-500 rounded-t-sm group-hover:bg-amber-600 transition-all"
                  />
                </div>

                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-800 transition-colors">
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clean Footer Buttons */}
      <div className="pt-3 flex items-center justify-end gap-2 text-xs">
        {onOpenMessages && (
          <button
            onClick={onOpenMessages}
            className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            History
          </button>
        )}
        {onComposeMessage && (
          <button
            onClick={onComposeMessage}
            className="px-3 py-1.5 bg-[#516072] hover:bg-[#43505F] text-white rounded-lg font-semibold text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3 h-3" />
            <span>Follow-Up</span>
          </button>
        )}
      </div>
    </div>
  );
};
