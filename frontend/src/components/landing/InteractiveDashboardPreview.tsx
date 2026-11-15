import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Smartphone,
  CreditCard,
  FileText,
  Mail,
  Plus,
  Send,
} from 'lucide-react';
import { useNavigate } from 'react-router';

export const InteractiveDashboardPreview: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'outreach'>('overview');

  const sampleRecentActivity = [
    {
      id: 'REC-101',
      borrower: 'Rahul Sharma',
      loanId: 'LN-84920',
      amount: '₹8,500',
      channel: 'WhatsApp',
      time: '2 mins ago',
      status: 'Paid',
      statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'REC-102',
      borrower: 'Ananya Verma',
      loanId: 'LN-10294',
      amount: '₹14,200',
      channel: 'AI Voice',
      time: '12 mins ago',
      status: 'PTP Promised',
      statusColor: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      id: 'REC-103',
      borrower: 'Vikram Joshi',
      loanId: 'LN-39482',
      amount: '₹6,800',
      channel: 'SMS',
      time: '25 mins ago',
      status: 'Delivered',
      statusColor: 'text-slate-700 bg-slate-50 border-slate-200',
    },
    {
      id: 'REC-104',
      borrower: 'Kavita Nair',
      loanId: 'LN-58291',
      amount: '₹22,000',
      channel: 'WhatsApp',
      time: '42 mins ago',
      status: 'Escalated',
      statusColor: 'text-amber-700 bg-amber-50 border-amber-200',
    },
  ];

  return (
    <section id="platform" className="scroll-mt-24 py-20 lg:py-28 bg-[#F5F8F6] text-[#202B25] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#168653]/10 border border-[#168653]/20 text-[#168653] text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Operational Cockpit</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-[#101D25] tracking-tight leading-tight">
            Complete Recovery Visibility.{' '}
            <span className="text-[#168653]">One Intelligent Dashboard.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#718078] leading-relaxed">
            From portfolio-wide delinquency scoring to individual borrower WhatsApp conversations and dynamic payment settlements, experience real-time visibility across every collection touchpoint.
          </p>

          {/* Tab Switcher */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-xl bg-white border border-[#E5EBE7] shadow-sm">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#168653] text-white shadow-sm'
                  : 'text-[#718078] hover:text-[#202B25]'
              }`}
            >
              Overview & KPIs
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'risk'
                  ? 'bg-[#168653] text-white shadow-sm'
                  : 'text-[#718078] hover:text-[#202B25]'
              }`}
            >
              Risk Heatmap
            </button>
            <button
              onClick={() => setActiveTab('outreach')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'outreach'
                  ? 'bg-[#168653] text-white shadow-sm'
                  : 'text-[#718078] hover:text-[#202B25]'
              }`}
            >
              Live Outreach Stream
            </button>
          </div>
        </div>

        {/* Miniature SaaS Dashboard Preview Container */}
        <div className="relative mx-auto max-w-6xl rounded-2xl border border-[#D0DBD4] bg-white shadow-2xl shadow-[#101D25]/10 overflow-hidden">
          {/* Mock Browser / Window Chrome Header */}
          <div className="bg-[#142630] px-4 py-3 border-b border-white/10 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 text-[11px] text-slate-300 font-mono">
                <span>app.repayx.ai/dashboard</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#5DE5A1] bg-[#168653]/30 px-2.5 py-0.5 rounded-full border border-[#5DE5A1]/20">
                Live Preview Sandbox
              </span>
              <button
                onClick={() => navigate('/dashboard')}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-[#5DE5A1] text-[#101D25] hover:brightness-105 transition-all cursor-pointer"
              >
                <span>Open Live Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Mini Dashboard Content */}
          <div className="p-4 sm:p-6 lg:p-8 bg-[#F7FAF8]">
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Operational Dashboard Greeting & Quick Action Banner (from live dashboard) */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5EBE7] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#101D25] font-heading flex items-center gap-2">
                      <span>Good Morning, Priya!</span>
                      <span className="text-2xl">👋</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-[#718078] mt-1">
                      Here&apos;s what&apos;s happening with your loan recovery today.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => navigate('/automation')}
                      className="px-4 py-2.5 rounded-xl bg-[#168653] hover:bg-[#157347] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Reminder</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate('/whatsapp')}
                      className="px-4 py-2.5 rounded-xl bg-[#EAF6EF] hover:bg-[#d8efe2] text-[#168653] border border-[#168653]/30 text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-[#168653]" />
                      <span>WhatsApp Hub</span>
                    </button>
                  </div>
                </div>

                {/* 4 KPI Cards (replicated from live dashboard & clickable) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div
                    onClick={() => navigate('/customers')}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5EBE7] shadow-sm flex items-center gap-3.5 cursor-pointer hover:border-[#168653] hover:shadow-md transition-all group"
                    title="Click to view Customer Risk Portfolio"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-extrabold text-[#101D25] font-heading">61,503</div>
                      <span className="text-[11px] font-semibold text-[#718078] flex items-center gap-1">
                        <span>Total Customers</span>
                        <span className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => navigate('/automation')}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5EBE7] shadow-sm flex items-center gap-3.5 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                    title="Click to view Active Reminders in Automation Hub"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-extrabold text-[#101D25] font-heading">24</div>
                      <span className="text-[11px] font-semibold text-[#718078] flex items-center gap-1">
                        <span>Active Reminders</span>
                        <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => navigate('/whatsapp')}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5EBE7] shadow-sm flex items-center gap-3.5 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group"
                    title="Click to view Delivery Status in WhatsApp Hub"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-extrabold text-[#101D25] font-heading">98%</div>
                      <span className="text-[11px] font-semibold text-[#718078] flex items-center gap-1">
                        <span>Delivery Rate</span>
                        <span className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => navigate('/dashboard')}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5EBE7] shadow-sm flex items-center gap-3.5 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
                    title="Click to view Recovered Ledgers on Dashboard"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-extrabold text-[#168653] font-heading">₹12.5L</div>
                      <span className="text-[11px] font-semibold text-[#718078] flex items-center gap-1">
                        <span>Recovered</span>
                        <span className="text-[#168653] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Two Main Working Operational Cards (from Priya's Live Dashboard) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Card 1: Email Reminders */}
                  <div className="bg-white p-6 rounded-2xl border border-[#E5EBE7] shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-[#101D25] font-heading">Email Reminders</h4>
                            <p className="text-xs text-[#718078]">Send payment reminders automatically.</p>
                          </div>
                        </div>
                        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-sky-50 text-sky-500 items-center justify-center">
                          <Mail className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-[#718078]">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Upload CSV</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>View Schedule</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Track Delivery</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => navigate('/automation')}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#168653] hover:bg-[#157347] text-white text-xs font-bold transition-all flex items-center justify-center sm:justify-start gap-2 shadow-sm cursor-pointer"
                      >
                        <span>Manage Email Reminders</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card 2: WhatsApp Assistant */}
                  <div className="bg-white p-6 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-white to-emerald-50/30 shadow-md flex flex-col justify-between hover:border-emerald-400 transition-all">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#168653] flex items-center justify-center">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-[#101D25] font-heading">WhatsApp Assistant</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-[#168653] font-bold">
                                Live Engine
                              </span>
                            </div>
                            <p className="text-xs text-[#718078]">Chat with customers on WhatsApp.</p>
                          </div>
                        </div>
                        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-emerald-100 text-[#168653] items-center justify-center">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="space-y-2 py-3 border-y border-emerald-100 text-xs text-[#718078]">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Understand replies</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Support in Hindi & English</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Get payment updates</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row items-center gap-2">
                      <button
                        onClick={() => navigate('/whatsapp')}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#168653] hover:bg-[#157347] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-[#168653]/25 cursor-pointer"
                      >
                        <span>Open WhatsApp Assistant</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] text-[#168653] font-semibold hidden sm:inline">
                        Direct Live Access →
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2-Column Analytics & Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Risk Distribution Mini Bar */}
                  <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-[#E5EBE7] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-[#101D25] font-heading">Delinquency Risk Distribution</h4>
                        <p className="text-[11px] text-[#718078]">Machine learning categorization across active loan books</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                        Model v2.4 Active
                      </span>
                    </div>

                    {/* Visual Segment Bars */}
                    <div className="space-y-3 pt-2">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-emerald-700">Low Risk (DPD 0 - 5)</span>
                          <span className="text-slate-600 font-mono">38,120 borrowers (62%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '62%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-amber-700">Moderate Risk (DPD 6 - 30)</span>
                          <span className="text-slate-600 font-mono">16,210 borrowers (26%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '26%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-rose-700">High Risk (DPD 30+)</span>
                          <span className="text-slate-600 font-mono">7,173 borrowers (12%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: '12%' }} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 p-3 rounded-lg bg-[#EAF6EF] border border-[#168653]/20 flex items-center gap-3 text-xs text-[#168653]">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>AI Recommendation: 4,120 borrowers ready for Stage-1 WhatsApp automated nudges today.</span>
                    </div>
                  </div>

                  {/* Right: Recent Communication Log */}
                  <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-[#E5EBE7] shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-[#101D25] font-heading">Recent Outreach Stream</h4>
                      <Clock className="w-3.5 h-3.5 text-[#718078]" />
                    </div>

                    <div className="divide-y divide-slate-100">
                      {sampleRecentActivity.map((item) => (
                        <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-[#101D25]">{item.borrower}</div>
                            <div className="text-[10px] text-[#718078] flex items-center gap-1.5 mt-0.5">
                              <span>{item.channel}</span>
                              <span>•</span>
                              <span>{item.loanId}</span>
                              <span>•</span>
                              <span>{item.amount}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.statusColor}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'risk' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-white p-5 rounded-xl border border-[#E5EBE7] shadow-sm">
                  <h4 className="text-sm font-bold text-[#101D25] mb-2 font-heading">Delinquency Probability & Behavioral Segments</h4>
                  <p className="text-xs text-[#718078] mb-4">
                    RepayX clusters overdue portfolios based on historical repayment consistency, communication intent, and EMI ticket size.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                      <div className="text-xs font-bold text-emerald-800">Tier A: Polite Nudge</div>
                      <div className="text-2xl font-extrabold text-emerald-900 mt-1 font-heading">94.8%</div>
                      <p className="text-[11px] text-emerald-700 mt-1">Resolution on first WhatsApp message with UPI link.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                      <div className="text-xs font-bold text-amber-800">Tier B: Conversational Bot</div>
                      <div className="text-2xl font-extrabold text-amber-900 mt-1 font-heading">78.2%</div>
                      <p className="text-[11px] text-amber-700 mt-1">Handles delay excuses, salary-date rescheduling.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
                      <div className="text-xs font-bold text-rose-800">Tier C: Manager Escalation</div>
                      <div className="text-2xl font-extrabold text-rose-900 mt-1 font-heading">52.4%</div>
                      <p className="text-[11px] text-rose-700 mt-1">OTS settlement proposal requiring executive approval.</p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#E5EBE7] flex justify-end">
                    <button
                      onClick={() => navigate('/analytics/risk')}
                      className="px-4 py-2 rounded-xl bg-[#168653] hover:bg-[#157347] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span>Explore Live Risk Analytics</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'outreach' && (
              <div className="bg-white p-5 rounded-xl border border-[#E5EBE7] shadow-sm animate-fadeIn">
                <h4 className="text-sm font-bold text-[#101D25] mb-1 font-heading">Automated Multi-Channel Execution Queue</h4>
                <p className="text-xs text-[#718078] mb-4">Real-time carrier delivery tokens & webhook receipts</p>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <span className="text-emerald-700">[2026-11-13 11:42:01] WHATSAPP_DELIVERED to +91-98711-XXXXX</span>
                    <span className="text-slate-500 font-sans text-[10px]">ACK_200</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <span className="text-blue-700">[2026-11-13 11:41:45] AI_VOICE_OUTREACH call connected (duration: 38s)</span>
                    <span className="text-slate-500 font-sans text-[10px]">INTENT: PTP_CONFIRMED</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <span className="text-emerald-700">[2026-11-13 11:40:12] UPI_INTENT_PAID: ₹8,500 Ref: UPI/6391204</span>
                    <span className="text-emerald-700 font-sans text-[10px] font-bold">SETTLED</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E5EBE7] flex justify-end">
                  <button
                    onClick={() => navigate('/whatsapp')}
                    className="px-4 py-2 rounded-xl bg-[#168653] hover:bg-[#157347] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>Launch Live WhatsApp & Multi-Channel Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar with Direct Navigation CTAs */}
          <div className="bg-white p-4 sm:p-5 border-t border-[#E5EBE7] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-[#718078] text-center sm:text-left">
              Live Production Operations · Switch between Borrower Cockpit and WhatsApp Automations
            </span>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-end">
              <button
                onClick={() => navigate('/whatsapp')}
                className="px-4 py-2 rounded-xl bg-[#EAF6EF] hover:bg-[#d5eee0] text-[#168653] font-bold border border-[#168653]/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open WhatsApp Hub</span>
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2 rounded-xl bg-[#168653] hover:bg-[#157347] text-white font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#168653]/20 cursor-pointer"
              >
                <span>Access RepayX Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
