import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  PhoneCall,
  Send,
  MessageSquare,
  Filter,
  Eye,
  Info,
} from 'lucide-react';
import { Loan, Customer, FollowUpItem } from '../../types';
import { WorkflowBanner } from '../common/WorkflowBanner';

interface OverviewDashboardProps {
  loans: Loan[];
  customers: Customer[];
  followups: FollowUpItem[];
  onSelectCustomer: (customerId: string) => void;
  onOpenConversation: (conversationId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  loans,
  customers,
  followups,
  onSelectCustomer,
  onOpenConversation,
  onNavigateTab,
}) => {
  const [performanceFilter, setPerformanceFilter] = useState<'7D' | '30D' | '90D'>('30D');
  const [activeChartPoint, setActiveChartPoint] = useState<number | null>(null);
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null);

  // Performance chart data based on filter
  const chartDatasets = {
    '7D': [
      { label: '23 Sep', sent: 48, responses: 34, payments: 18 },
      { label: '24 Sep', sent: 52, responses: 39, payments: 22 },
      { label: '25 Sep', sent: 65, responses: 48, payments: 29 },
      { label: '26 Sep', sent: 58, responses: 42, payments: 26 },
      { label: '27 Sep', sent: 72, responses: 54, payments: 38 },
      { label: '28 Sep', sent: 60, responses: 45, payments: 31 },
      { label: '29 Sep', sent: 64, responses: 49, payments: 35 },
    ],
    '30D': [
      { label: '01 Sep', sent: 42, responses: 28, payments: 16 },
      { label: '05 Sep', sent: 49, responses: 35, payments: 20 },
      { label: '10 Sep', sent: 55, responses: 40, payments: 24 },
      { label: '15 Sep', sent: 68, responses: 51, payments: 32 },
      { label: '20 Sep', sent: 61, responses: 46, payments: 27 },
      { label: '25 Sep', sent: 74, responses: 58, payments: 39 },
      { label: '29 Sep', sent: 64, responses: 49, payments: 35 },
    ],
    '90D': [
      { label: 'July W1', sent: 180, responses: 120, payments: 75 },
      { label: 'July W3', sent: 210, responses: 145, payments: 92 },
      { label: 'Aug W1', sent: 235, responses: 168, payments: 110 },
      { label: 'Aug W3', sent: 250, responses: 182, payments: 124 },
      { label: 'Sep W1', sent: 270, responses: 198, payments: 138 },
      { label: 'Sep W3', sent: 285, responses: 215, payments: 152 },
      { label: 'Sep W4', sent: 290, responses: 224, payments: 160 },
    ],
  };

  const chartData = chartDatasets[performanceFilter];
  const maxSent = Math.max(...chartData.map((d) => d.sent)) * 1.15;

  // Donut chart status segments
  const distributionData = [
    { status: 'Paid', count: 774, percentage: 62, color: '#16A34A', bgClass: 'bg-emerald-500' },
    { status: 'Due Today', count: 187, percentage: 15, color: '#2563EB', bgClass: 'bg-blue-600' },
    { status: 'Overdue', count: 137, percentage: 11, color: '#DC2626', bgClass: 'bg-rose-600' },
    { status: 'Promise to Pay', count: 100, percentage: 8, color: '#D97706', bgClass: 'bg-amber-500' },
    { status: 'Disputed', count: 50, percentage: 4, color: '#9333EA', bgClass: 'bg-purple-600' },
  ];

  // Priority followups preview list
  const priorityFollowups = [
    {
      customer: 'Rahul Sharma',
      customerId: 'CUS001',
      convId: 'CONV001',
      loanId: 'LN1001',
      outstanding: 8500,
      dueDate: '25 Sep',
      lastResponse: '"Salary hasn\'t arrived, will pay in 5 days..."',
      intent: 'PAYMENT_DELAY',
      priority: 'High',
      nextFollowup: '30 Sep',
    },
    {
      customer: 'Ananya Verma',
      customerId: 'CUS002',
      convId: 'CONV002',
      loanId: 'LN1002',
      outstanding: 14200,
      dueDate: '28 Sep',
      lastResponse: '"I will make payment tomorrow 11 AM..."',
      intent: 'PAYMENT_PROMISE',
      priority: 'Medium',
      nextFollowup: '30 Sep',
    },
    {
      customer: 'Arjun Mehta',
      customerId: 'CUS003',
      convId: 'CONV003',
      loanId: 'LN1003',
      outstanding: 45600,
      dueDate: '15 Sep',
      lastResponse: '"Client defaulted, cashflow severe crunch..."',
      intent: 'FINANCIAL_DIFFICULTY',
      priority: 'Critical',
      nextFollowup: 'Today (Call)',
    },
    {
      customer: 'Karan Singh',
      customerId: 'CUS004',
      convId: 'CONV004',
      loanId: 'LN1004',
      outstanding: 11400,
      dueDate: '22 Sep',
      lastResponse: '"Counter payment of ₹4,000 not reflected..."',
      intent: 'PAYMENT_DISPUTE',
      priority: 'High',
      nextFollowup: 'Today 3 PM',
    },
    {
      customer: 'Sneha Rao',
      customerId: 'CUS005',
      convId: 'CONV005',
      loanId: 'LN1005',
      outstanding: 9200,
      dueDate: '24 Sep',
      lastResponse: '"Paid ₹9,200 via GPay yesterday, ref shared..."',
      intent: 'PAYMENT_CLAIMED',
      priority: 'Medium',
      nextFollowup: 'Verify UTR',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Greeting & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Good morning, Priya 👋
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Shift Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Here's what's happening with your loan follow-ups today.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>29 September 2026</span>
          </div>

          <button
            onClick={() => onNavigateTab('conversations')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open AI Inbox</span>
          </button>
        </div>
      </div>

      {/* Visual UX Architecture Banner */}
      <WorkflowBanner />

      {/* 5 Premium KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Active Loans */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Active Loans</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">1,248</span>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +4.8%
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Portfolio value</span>
            <span className="font-mono font-semibold text-slate-700">₹14.2 Cr</span>
          </div>
        </div>

        {/* Card 2: Due Today */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Due Today</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">86</span>
              <span className="text-[11px] font-semibold text-amber-600">Needs attention</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Amount due</span>
            <span className="font-mono font-semibold text-slate-700">₹7.14L</span>
          </div>
        </div>

        {/* Card 3: Overdue */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between bg-gradient-to-b from-white to-rose-50/20">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-700 font-semibold">Overdue Loans</span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-rose-700 tabular-nums">143</span>
              <span className="text-[11px] font-semibold text-rose-600">12 high priority</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Delinquency rate</span>
            <span className="font-mono font-semibold text-rose-600">11.4%</span>
          </div>
        </div>

        {/* Card 4: Follow-ups Today */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Follow-ups Today</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <PhoneCall className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">64</span>
              <span className="text-[11px] font-semibold text-purple-600">18 pending</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Completed</span>
            <span className="font-mono font-semibold text-emerald-600">46 (71.8%)</span>
          </div>
        </div>

        {/* Card 5: Payments Received */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between bg-gradient-to-b from-white to-emerald-50/20">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800 font-semibold">Payments Received</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">₹8.42L</span>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +12.4%
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Transactions</span>
            <span className="font-mono font-semibold text-emerald-700">86 reconciled</span>
          </div>
        </div>
      </div>

      {/* Grid: Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Follow-up Performance Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Follow-Up Performance</h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                  AI Powered
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer follow-up activity over the last {performanceFilter === '7D' ? '7 days' : performanceFilter === '30D' ? '30 days' : '90 days'}.
              </p>
            </div>

            {/* Time Filter Segmented Control */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['7D', '30D', '90D'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPerformanceFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    performanceFilter === filter
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Chart Legend */}
          <div className="flex items-center gap-6 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-blue-600" />
              <span className="text-slate-600 font-medium">Follow-ups Sent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-purple-500" />
              <span className="text-slate-600 font-medium">Customer Responses</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              <span className="text-slate-600 font-medium">Payments Received</span>
            </div>
          </div>

          {/* SVG Custom High-Fidelity Interactive Chart */}
          <div className="relative h-64 w-full">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 50, 100, 150, 200].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="600"
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              ))}

              {/* Grouped Bar Columns */}
              {chartData.map((d, i) => {
                const xBase = (i / (chartData.length - 1 || 1)) * 520 + 40;
                const barWidth = 14;

                const hSent = (d.sent / maxSent) * 160;
                const hResp = (d.responses / maxSent) * 160;
                const hPay = (d.payments / maxSent) * 160;

                const isHovered = activeChartPoint === i;

                return (
                  <g
                    key={d.label}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setActiveChartPoint(i)}
                    onMouseLeave={() => setActiveChartPoint(null)}
                  >
                    {/* Hover highlight background column */}
                    {isHovered && (
                      <rect
                        x={xBase - 25}
                        y="10"
                        width="50"
                        height="180"
                        fill="#f8fafc"
                        rx="6"
                      />
                    )}

                    {/* Followups Sent Bar */}
                    <rect
                      x={xBase - 16}
                      y={180 - hSent}
                      width={barWidth}
                      height={hSent}
                      fill="#2563EB"
                      rx="3"
                    />

                    {/* Customer Responses Bar */}
                    <rect
                      x={xBase - 1}
                      y={180 - hResp}
                      width={barWidth}
                      height={hResp}
                      fill="#A855F7"
                      rx="3"
                    />

                    {/* Payments Received Bar */}
                    <rect
                      x={xBase + 14}
                      y={180 - hPay}
                      width={barWidth}
                      height={hPay}
                      fill="#10B981"
                      rx="3"
                    />

                    {/* X-axis label */}
                    <text
                      x={xBase + 5}
                      y="198"
                      fontSize="9"
                      fill="#64748b"
                      textAnchor="middle"
                      fontFamily="sans-serif"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Active Data Tooltip */}
            {activeChartPoint !== null && (
              <div
                className="absolute top-2 bg-slate-900/95 text-white p-2.5 rounded-xl shadow-xl text-xs z-10 pointer-events-none transition-all"
                style={{
                  left: `${(activeChartPoint / (chartData.length - 1)) * 80 + 10}%`,
                }}
              >
                <p className="font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1.5">
                  {chartData[activeChartPoint].label} 2026
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Sent:</span>
                    <span className="font-mono font-bold text-blue-400">
                      {chartData[activeChartPoint].sent}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Responses:</span>
                    <span className="font-mono font-bold text-purple-400">
                      {chartData[activeChartPoint].responses}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Payments:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {chartData[activeChartPoint].payments}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Status Distribution (Donut Chart) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Payment Status Distribution
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">1,248 Total</span>
            </div>
            <p className="text-xs text-slate-500">Live breakdown across active portfolio</p>
          </div>

          {/* SVG Donut Chart */}
          <div className="relative my-4 flex items-center justify-center">
            <svg width="180" height="180" viewBox="0 0 100 100" className="rotate-[-90deg]">
              {/* Calculate stroke offsets for donut segments */}
              {(() => {
                let accumulatedPercent = 0;
                return distributionData.map((seg) => {
                  const strokeDasharray = `${seg.percentage} ${100 - seg.percentage}`;
                  const strokeDashoffset = -accumulatedPercent;
                  accumulatedPercent += seg.percentage;
                  const isHovered = hoveredDonutSegment === seg.status;

                  return (
                    <circle
                      key={seg.status}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isHovered ? '16' : '13'}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      pathLength="100"
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredDonutSegment(seg.status)}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                    />
                  );
                });
              })()}
            </svg>

            {/* Donut Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {hoveredDonutSegment
                  ? `${distributionData.find((d) => d.status === hoveredDonutSegment)?.percentage}%`
                  : '62%'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {hoveredDonutSegment || 'Paid Healthy'}
              </span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-1.5 text-xs">
            {distributionData.map((seg) => (
              <div
                key={seg.status}
                onMouseEnter={() => setHoveredDonutSegment(seg.status)}
                onMouseLeave={() => setHoveredDonutSegment(null)}
                className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                  hoveredDonutSegment === seg.status ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${seg.bgClass}`} />
                  <span className="text-slate-700 text-xs">{seg.status}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-slate-500">{seg.count}</span>
                  <span className="font-semibold text-slate-900 w-8 text-right">{seg.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority Follow-ups Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Priority Follow-ups</h2>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Action Required
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              High-value and delinquency-risk accounts classified by AI intent engine.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('follow-ups')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>View All Follow-ups (64)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Loan ID</th>
                <th className="py-3 px-4">Outstanding</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Last Response</th>
                <th className="py-3 px-4">AI Intent</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Next Follow-up</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {priorityFollowups.map((item) => (
                <tr
                  key={item.loanId}
                  className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  onClick={() => onOpenConversation(item.convId)}
                >
                  <td className="py-3.5 px-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCustomer(item.customerId);
                      }}
                      className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                    >
                      {item.customer}
                    </button>
                    <p className="text-[11px] text-slate-400 font-mono">{item.customerId}</p>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                    {item.loanId}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                    ₹{item.outstanding.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                    {item.dueDate}
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-[11px] text-slate-600 italic truncate" title={item.lastResponse}>
                      {item.lastResponse}
                    </p>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        item.intent === 'PAYMENT_DELAY'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : item.intent === 'PAYMENT_PROMISE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.intent === 'FINANCIAL_DIFFICULTY'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : item.intent === 'PAYMENT_DISPUTE'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {item.intent.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                        item.priority === 'Critical'
                          ? 'text-rose-600'
                          : item.priority === 'High'
                          ? 'text-amber-600'
                          : 'text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.priority === 'Critical'
                            ? 'bg-rose-600'
                            : item.priority === 'High'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      {item.priority}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] font-medium text-slate-700">
                    {item.nextFollowup}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenConversation(item.convId);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 transition-all font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
