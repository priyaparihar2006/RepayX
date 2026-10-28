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
    <div className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E7EBE3] shadow-fintech-card flex flex-col justify-between transition-all duration-200">
      <div>
        {/* Simple Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#171A17] font-heading">
              Follow-Up Performance
            </h3>
            <span className="text-[10px] font-bold text-[#245C35] bg-[#EDF5E5] px-2.5 py-0.5 rounded-full border border-[#D1E8BC]">
              +14.2%
            </span>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex items-center p-0.5 bg-[#F5F7F3] rounded-full text-xs font-semibold border border-[#E7EBE3]">
            {(['7D', '30D', '90D'] as Period[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setPeriod(tab);
                  setActiveHoverIndex(null);
                }}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer text-xs ${
                  period === tab
                    ? 'bg-[#245C35] text-white shadow-xs font-bold'
                    : 'text-[#777E77] hover:text-[#171A17]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Clean, Simple 4-Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE3] min-w-0">
            <span className="text-[10px] font-semibold text-[#777E77] uppercase tracking-wider block truncate">
              Sent
            </span>
            <div className="text-lg font-bold text-[#171A17] font-heading mt-0.5 truncate">
              {totalSent.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#EDF5E5]/70 border border-[#D1E8BC] min-w-0">
            <span className="text-[10px] font-semibold text-[#245C35] uppercase tracking-wider block truncate">
              Replies
            </span>
            <div className="text-lg font-bold text-[#245C35] font-heading mt-0.5 truncate">
              {avgResponseRate}%
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#EDF5E5]/40 border border-[#D1E8BC]/60 min-w-0">
            <span className="text-[10px] font-semibold text-[#245C35] uppercase tracking-wider block truncate">
              PTP Rate
            </span>
            <div className="text-lg font-bold text-[#171A17] font-heading mt-0.5 truncate">
              {avgPtpRate}%
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FEF7EA] border border-[#FDE68A] min-w-0">
            <span className="text-[10px] font-semibold text-[#B45309] uppercase tracking-wider block truncate">
              Response Time
            </span>
            <div className="text-lg font-bold text-[#B45309] font-heading mt-0.5 truncate">
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
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  channel === c.id
                    ? 'bg-[#245C35] text-white shadow-2xs font-semibold'
                    : 'bg-[#F5F7F3] text-[#777E77] hover:text-[#171A17]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#777E77]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#245C35]" />
              <span>Sent</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span>Replies</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              <span>PTP</span>
            </span>
          </div>
        </div>

        {/* Chart Visuals */}
        <div className="h-40 sm:h-44 flex items-end justify-between gap-2 sm:gap-3 pt-3 pb-2 border-b border-[#E7EBE3]">
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
                  <div className="absolute bottom-full mb-2 bg-[#171A17] text-white px-2.5 py-1.5 rounded-xl shadow-lg text-[10px] whitespace-nowrap z-20 pointer-events-none">
                    <span className="font-bold">{item.day}:</span> {item.sent} sent · {item.replies} replies · {item.recovered}
                  </div>
                )}

                {/* Bars Trio */}
                <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-full">
                  <div
                    style={{ height: `${hSent}%` }}
                    className="w-1/3 bg-[#245C35] rounded-t-sm group-hover:bg-[#1B4728] transition-all"
                  />
                  <div
                    style={{ height: `${hReplies}%` }}
                    className="w-1/3 bg-[#16A34A] rounded-t-sm group-hover:bg-[#15803D] transition-all"
                  />
                  <div
                    style={{ height: `${hPtp}%` }}
                    className="w-1/3 bg-[#D97706] rounded-t-sm group-hover:bg-[#B45309] transition-all"
                  />
                </div>

                <span className="text-[10px] font-semibold text-[#777E77] group-hover:text-[#171A17] transition-colors">
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clean Footer Buttons */}
      <div className="pt-3.5 flex items-center justify-end gap-2 text-xs">
        {onOpenMessages && (
          <button
            onClick={onOpenMessages}
            className="px-3 py-1.5 text-[#777E77] hover:text-[#171A17] hover:bg-[#F5F7F3] rounded-full font-semibold transition-colors cursor-pointer"
          >
            History
          </button>
        )}
        {onComposeMessage && (
          <button
            onClick={onComposeMessage}
            className="px-4 py-1.5 bg-[#245C35] hover:bg-[#1B4728] active:bg-[#14351E] text-white rounded-full font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3 h-3 text-[#B5F078]" />
            <span>Follow-Up</span>
          </button>
        )}
      </div>
    </div>
  );
};
