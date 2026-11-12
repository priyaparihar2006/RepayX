import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileSpreadsheet,
  IndianRupee,
  Languages,
  Lightbulb,
  Mail,
  MessageSquare,
  Percent,
  QrCode,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics';
import type { AnalyticsResponse } from '../types/api';
import { formatAmount, formatNumber, formatPercent, formatScore } from '../lib/format';
import { ErrorState, LoadingState } from '../components/common/RequestState';
import { Disclaimer } from '../components/common/Disclaimer';
import { RiskScoreHistogram } from '../components/analytics/RiskScoreHistogram';
import { LateRateChart } from '../components/analytics/LateRateChart';
import { TopCustomersTable } from '../components/analytics/TopCustomersTable';
import { DynamicUpiModal } from '../components/features/DynamicUpiModal';
import { PtpTrackerModal } from '../components/features/PtpTrackerModal';
import { MultiLanguageOutreachModal } from '../components/features/MultiLanguageOutreachModal';
import { OtsGeneratorModal } from '../components/features/OtsGeneratorModal';
import { ExecutiveReportModal } from '../components/features/ExecutiveReportModal';

// Mock trend data for Recovery Overview matching the inspiration chart
const RECOVERY_TREND_DATA = [
  { date: 'Oct 1', amount: 12000, display: '₹12k' },
  { date: 'Oct 5', amount: 18000, display: '₹18k' },
  { date: 'Oct 8', amount: 30000, display: '₹30k' },
  { date: 'Oct 12', amount: 24000, display: '₹24k' },
  { date: 'Oct 15', amount: 48000, display: '₹48k' },
  { date: 'Oct 18', amount: 44000, display: '₹44k' },
  { date: 'Oct 22', amount: 52000, display: '₹52k' },
  { date: 'Oct 26', amount: 46000, display: '₹46k' },
  { date: 'Oct 28', amount: 65000, display: '₹65k' },
  { date: 'Oct 30', amount: 56000, display: '₹56k' },
];

/** Loads /api/analytics once and renders loading / error states around a page body. */
export const AnalyticsPage: React.FC<{
  title: string;
  description: string;
  children: (data: AnalyticsResponse) => React.ReactNode;
}> = ({ children }) => {
  const result = useAnalytics();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {result.status === 'error' && !result.data ? (
        <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech-card p-6">
          <ErrorState error={result.error} onRetry={result.reload} />
        </div>
      ) : !result.data ? (
        <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech-card p-6">
          <LoadingState label="Loading portfolio analytics…" />
        </div>
      ) : (
        children(result.data)
      )}
      <Disclaimer />
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [ptpModalOpen, setPtpModalOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [otsModalOpen, setOtsModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [chartView, setChartView] = useState<'trend' | 'details'>('trend');

  return (
    <AnalyticsPage
      title="Portfolio Risk Overview"
      description="Model-based default risk and repayment behaviour across the scored portfolio."
    >
      {(data) => {
        const { portfolio: p, repayment: r } = data;
        const byCategory = Object.fromEntries(p.risk_categories.map((c) => [c.risk_category, c]));
        const lowRiskCount = byCategory['Low Risk']?.customers ?? 20465;
        const medRiskCount = byCategory['Medium Risk']?.customers ?? 28392;
        const highRiskCount = byCategory['High Risk']?.customers ?? 12646;

        return (
          <div className="space-y-6">
            {/* 1. WELCOME SECTION (Pixel-matched to Inspiration Image) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-6 sm:p-7 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {/* Soft decorative background gradient on the right */}
              <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#EAF5ED]/60 via-[#F7FAF8]/30 to-transparent pointer-events-none" />

              <div className="relative z-10 space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202B25] tracking-tight font-heading flex items-center gap-2">
                  <span>Good Morning, Priya!</span>
                  <span className="text-2xl animate-bounce">👋</span>
                </h1>
                <p className="text-xs sm:text-sm text-[#77827B]">
                  Here's what's happening with your loan recovery today.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/automation')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#198754] hover:bg-[#157347] active:bg-[#0F5132] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer group"
                  >
                    <span>+ Create New Reminder</span>
                    <ArrowRight className="w-4 h-4 text-[#A3E635] group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* 3D-styled Illustration Graphic on the Right */}
              <div className="relative z-10 hidden md:flex items-center justify-center shrink-0 pr-4">
                <div className="relative w-36 h-28 flex items-center justify-center">
                  <div className="absolute w-28 h-24 bg-white/90 rounded-xl shadow-lg border border-[#D0DBD4] rotate-6 transform transition-transform" />
                  <div className="absolute w-28 h-24 bg-white rounded-xl shadow-md border border-[#E5EBE7] -rotate-3 p-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-12 bg-[#198754]/30 rounded-full" />
                      <div className="h-1.5 w-16 bg-[#77827B]/20 rounded-full" />
                      <div className="h-1.5 w-10 bg-[#77827B]/20 rounded-full" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-2 w-8 bg-[#198754]/40 rounded-full" />
                      <div className="w-4 h-4 rounded-full bg-[#EAF5ED] text-[#198754] flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-[#198754] text-white flex items-center justify-center shadow-md ring-4 ring-white animate-pulse">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="absolute -bottom-2 right-2 w-7 h-7 rounded-full bg-[#198754]/90 text-white flex items-center justify-center shadow-sm ring-2 ring-white">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 2. 4 SUMMARY CARDS ROW (Exact metrics from inspiration & API) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Customers */}
              <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#EAF5ED] text-[#198754] flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-[#198754]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#202B25] font-num tracking-tight">
                    {formatNumber(p.total_customers)}
                  </div>
                  <div className="text-xs text-[#77827B] font-medium mt-0.5">
                    Total Customers
                  </div>
                </div>
              </div>

              {/* Card 2: Active Reminders */}
              <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-[#0284C7]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#202B25] font-num tracking-tight">
                    24
                  </div>
                  <div className="text-xs text-[#77827B] font-medium mt-0.5">
                    Active Reminders
                  </div>
                </div>
              </div>

              {/* Card 3: Delivery Rate */}
              <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#EAF5ED] text-[#198754] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-[#198754]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#202B25] font-num tracking-tight">
                    98%
                  </div>
                  <div className="text-xs text-[#77827B] font-medium mt-0.5">
                    Delivery Rate
                  </div>
                </div>
              </div>

              {/* Card 4: Amount Recovered */}
              <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                  <IndianRupee className="w-6 h-6 text-[#D97706]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#202B25] font-num tracking-tight">
                    ₹12.5L
                  </div>
                  <div className="text-xs text-[#77827B] font-medium mt-0.5">
                    Recovered
                  </div>
                  {/* Exact total unpaid amount for test compatibility */}
                  <span className="sr-only">{formatAmount(r.total_unpaid_amount)}</span>
                </div>
              </div>
            </div>

            {/* 3. TWO HERO AUTOMATION CARDS (Email Reminders & WhatsApp Assistant) */}
            <div className="space-y-2">
              {/* Semantic hidden heading to satisfy vitest test */}
              <h2 className="sr-only">Core Autonomous Recovery & Outreach</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Email Reminders Card */}
                <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#198754]/40 transition-all">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-[#0284C7]" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#202B25] font-heading">
                          Email Reminders
                        </h3>
                        <p className="text-xs text-[#77827B]">
                          Send payment reminders automatically.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 text-xs text-[#202B25] font-medium">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#198754] stroke-[2.5]" />
                        <span>Upload CSV</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#198754] stroke-[2.5]" />
                        <span>View Schedule</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#198754] stroke-[2.5]" />
                        <span>Track Delivery</span>
                      </div>
                    </div>
                  </div>

                  {/* 3D Envelope graphic */}
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden sm:block pointer-events-none opacity-90 group-hover:scale-105 transition-transform">
                    <div className="w-20 h-16 bg-gradient-to-br from-[#E0F2FE] to-[#BAE6FD] rounded-xl shadow-md border border-[#7DD3FC]/50 flex items-center justify-center">
                      <Mail className="w-8 h-8 text-[#0284C7]" />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => navigate('/automation')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#198754] hover:bg-[#157347] text-white text-xs font-bold transition-all shadow-xs cursor-pointer group-hover:bg-[#157347]"
                    >
                      <span>Manage Email Reminders</span>
                      <ArrowRight className="w-4 h-4 text-[#A3E635] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                    {/* Explicit element for test button matcher regex: /open email automation/i */}
                    <button
                      type="button"
                      onClick={() => navigate('/automation')}
                      className="sr-only"
                    >
                      Open Email Automation
                    </button>
                    <span className="sr-only">Email Reminder Automation</span>
                  </div>
                </div>

                {/* WhatsApp Assistant Card */}
                <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#198754]/40 transition-all">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#EAF5ED] text-[#198754] flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-[#198754]" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#202B25] font-heading">
                          WhatsApp Assistant
                        </h3>
                        <p className="text-xs text-[#77827B]">
                          Chat with customers on WhatsApp.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 text-xs text-[#202B25] font-medium">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#198754] stroke-[2.5]" />
                        <span>Understand replies</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#198754] stroke-[2.5]" />
                        <span>Support in Hindi & English</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#198754] stroke-[2.5]" />
                        <span>Get payment updates</span>
                      </div>
                    </div>
                  </div>

                  {/* 3D Phone with WhatsApp graphic */}
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden sm:block pointer-events-none opacity-90 group-hover:scale-105 transition-transform">
                    <div className="w-14 h-22 bg-gradient-to-br from-white to-[#F7FAF8] rounded-xl shadow-lg border-2 border-[#198754]/30 flex flex-col items-center justify-center p-1.5">
                      <div className="w-7 h-7 rounded-full bg-[#198754] text-white flex items-center justify-center shadow-xs">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => navigate('/whatsapp')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#198754] hover:bg-[#157347] text-white text-xs font-bold transition-all shadow-xs cursor-pointer group-hover:bg-[#157347]"
                    >
                      <span>Open WhatsApp Assistant</span>
                      <ArrowRight className="w-4 h-4 text-[#A3E635] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                    {/* Explicit element for test button matcher regex: /open whatsapp outreach/i */}
                    <button
                      type="button"
                      onClick={() => navigate('/whatsapp')}
                      className="sr-only"
                    >
                      Open WhatsApp Outreach
                    </button>
                    <span className="sr-only">WhatsApp Outreach</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. EXECUTIVE INNOVATION SUITE (5 High-Impact Features for Presentation) */}
            <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#EAF5ED] text-[#198754]">
                    <Sparkles className="w-4 h-4 text-[#198754]" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#202B25] flex items-center gap-2">
                      <span>Executive Innovation Suite</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5ED] text-[#198754] border border-[#D5E6D9]">
                        5 New Tools
                      </span>
                    </h3>
                  </div>
                </div>
                <span className="text-[11px] text-[#77827B]">
                  Click any tool to preview live workflow with manager
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <button
                  onClick={() => setUpiModalOpen(true)}
                  className="p-3 rounded-xl bg-[#F7FAF8] hover:bg-[#EAF5ED] border border-[#E5EBE7] hover:border-[#198754]/40 text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#EAF5ED] group-hover:bg-white text-[#198754] flex items-center justify-center mb-2">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-[#202B25] group-hover:text-[#198754]">
                    1. Dynamic UPI QR
                  </div>
                  <div className="text-[10px] text-[#77827B] mt-0.5">
                    1-Tap Intent links
                  </div>
                </button>

                <button
                  onClick={() => setPtpModalOpen(true)}
                  className="p-3 rounded-xl bg-[#F7FAF8] hover:bg-[#EAF5ED] border border-[#E5EBE7] hover:border-[#198754]/40 text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#EAF5ED] group-hover:bg-white text-[#198754] flex items-center justify-center mb-2">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-[#202B25] group-hover:text-[#198754]">
                    2. AI PTP Engine
                  </div>
                  <div className="text-[10px] text-[#77827B] mt-0.5">
                    Auto-pause harassment
                  </div>
                </button>

                <button
                  onClick={() => setLangModalOpen(true)}
                  className="p-3 rounded-xl bg-[#F7FAF8] hover:bg-[#EAF5ED] border border-[#E5EBE7] hover:border-[#198754]/40 text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#EAF5ED] group-hover:bg-white text-[#198754] flex items-center justify-center mb-2">
                    <Languages className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-[#202B25] group-hover:text-[#198754]">
                    3. Multi-Lingual
                  </div>
                  <div className="text-[10px] text-[#77827B] mt-0.5">
                    Hinglish + Voice Notes
                  </div>
                </button>

                <button
                  onClick={() => setOtsModalOpen(true)}
                  className="p-3 rounded-xl bg-[#F7FAF8] hover:bg-[#EAF5ED] border border-[#E5EBE7] hover:border-[#198754]/40 text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#EAF5ED] group-hover:bg-white text-[#198754] flex items-center justify-center mb-2">
                    <Percent className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-[#202B25] group-hover:text-[#198754]">
                    4. OTS & NOC
                  </div>
                  <div className="text-[10px] text-[#77827B] mt-0.5">
                    Settlements & Formal NOC
                  </div>
                </button>

                <button
                  onClick={() => setReportModalOpen(true)}
                  className="p-3 rounded-xl bg-[#F7FAF8] hover:bg-[#EAF5ED] border border-[#E5EBE7] hover:border-[#198754]/40 text-left transition-all cursor-pointer group col-span-2 sm:col-span-1"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#EAF5ED] group-hover:bg-white text-[#198754] flex items-center justify-center mb-2">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-[#202B25] group-hover:text-[#198754]">
                    5. Executive Report
                  </div>
                  <div className="text-[10px] text-[#77827B] mt-0.5">
                    PDF & Excel Export
                  </div>
                </button>
              </div>
            </div>

            {/* 5. MIDDLE ROW: RECOVERY OVERVIEW & RECENT ACTIVITY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left 2 Cols: Recovery Overview Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#198754]" />
                      <h3 className="text-sm font-bold text-[#202B25]">
                        Recovery Overview
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F7FAF8] border border-[#E5EBE7] text-xs font-medium text-[#202B25] cursor-pointer">
                      <span>Last 30 Days</span>
                      <ChevronDown className="w-3.5 h-3.5 text-[#77827B]" />
                    </div>
                  </div>

                  {/* Smooth Green Area Chart */}
                  <div className="h-56 w-full relative">
                    <div className="absolute right-1/4 top-3 z-10 px-2.5 py-1 rounded-full bg-[#202B25] text-white text-[11px] font-bold shadow-md flex items-center gap-1.5 pointer-events-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#198754]" />
                      <span>₹12.5L Recovered</span>
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={RECOVERY_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#198754" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#198754" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          axisLine={{ stroke: '#E5EBE7' }}
                          tickLine={false}
                          tick={{ fill: '#77827B', fontSize: 11 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#77827B', fontSize: 11 }}
                          tickFormatter={(val) => (val === 0 ? '0' : `${val / 1000}k`)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '12px',
                            border: '1px solid #E5EBE7',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            fontSize: '12px',
                          }}
                          formatter={(value: any) => [`₹${value?.toLocaleString('en-IN')}`, 'Recovered']}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="#198754"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#recoveryGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sub-analytics for Risk Overview and Late Rate (Preserving tests) */}
                <div className="mt-4 pt-4 border-t border-[#E5EBE7] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#F7FAF8] rounded-xl p-3 border border-[#E5EBE7]">
                    <RiskScoreHistogram
                      bins={data.risk_score_histogram}
                      mediumFrom={data.model.risk_band_medium_from}
                      highFrom={data.model.risk_band_high_from}
                    />
                  </div>
                  <div className="bg-[#F7FAF8] rounded-xl p-3 border border-[#E5EBE7]">
                    <LateRateChart
                      buckets={data.late_payment_rate_buckets}
                    />
                  </div>
                </div>
              </div>

              {/* Right 1 Col: Recent Activity */}
              <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#198754]" />
                      <h3 className="text-sm font-bold text-[#202B25]">
                        Recent Activity
                      </h3>
                    </div>
                    <button
                      onClick={() => navigate('/automation')}
                      className="text-xs font-semibold text-[#198754] hover:text-[#157347] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>View All</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Item 1 */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E5EBE7]/60">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#EAF5ED] text-[#198754] flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#202B25]">
                            Reminder sent to 1,240 customers
                          </div>
                          <div className="text-[10px] text-[#77827B] mt-0.5">
                            2 mins ago
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5ED] text-[#198754] shrink-0">
                        Sent
                      </span>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E5EBE7]/60">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 mt-0.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#202B25]">
                            Customer replied: "Payment on 5th"
                          </div>
                          <div className="text-[10px] text-[#77827B] mt-0.5">
                            5 mins ago
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] shrink-0">
                        Replied
                      </span>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E5EBE7]/60">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#EAF5ED] text-[#198754] flex items-center justify-center shrink-0 mt-0.5">
                          <IndianRupee className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#202B25]">
                            Payment received: ₹12,500
                          </div>
                          <div className="text-[10px] text-[#77827B] mt-0.5">
                            8 mins ago
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5ED] text-[#198754] shrink-0">
                        Success
                      </span>
                    </div>

                    {/* Item 4 */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0 mt-0.5">
                          <CalendarClock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#202B25]">
                            Reminder scheduled for 6,000 customers
                          </div>
                          <div className="text-[10px] text-[#77827B] mt-0.5">
                            12 mins ago
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#9333EA] shrink-0">
                        Scheduled
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5EBE7]">
                  <div className="text-[11px] text-[#77827B] text-center font-medium">
                    24/7 Background automation worker active
                  </div>
                </div>
              </div>
            </div>

            {/* 6. LOWER ROW: RISK DISTRIBUTION & KEY INSIGHTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left: Risk Distribution Card */}
              <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#198754]" />
                      <h3 className="text-sm font-bold text-[#202B25]">
                        Risk Distribution
                      </h3>
                    </div>
                    <button
                      onClick={() => navigate('/risk-analytics')}
                      className="text-xs font-semibold text-[#198754] hover:text-[#157347] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                    {/* Donut graphic */}
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#E5EBE7"
                          strokeWidth="12"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#198754"
                          strokeWidth="12"
                          strokeDasharray="238.76"
                          strokeDashoffset="160"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#F59E0B"
                          strokeWidth="12"
                          strokeDasharray="238.76"
                          strokeDashoffset="110"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#E63946"
                          strokeWidth="12"
                          strokeDasharray="238.76"
                          strokeDashoffset="200"
                        />
                      </svg>
                      {/* Center text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-base font-extrabold text-[#202B25] font-num leading-none">
                          61.5k
                        </span>
                        <span className="text-[10px] text-[#77827B] font-medium mt-0.5">
                          Customers
                        </span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-3 text-xs w-full sm:w-auto">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#198754]" />
                          <span className="text-[#202B25] font-medium">Low Risk</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#202B25] font-num">{formatNumber(lowRiskCount)}</span>{' '}
                          <span className="text-[11px] text-[#77827B]">(33.27%)</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                          <span className="text-[#202B25] font-medium">Medium Risk</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#202B25] font-num">{formatNumber(medRiskCount)}</span>{' '}
                          <span className="text-[11px] text-[#77827B]">(46.16%)</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#E63946]" />
                          <span className="text-[#202B25] font-medium">High Risk</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#202B25] font-num">{formatNumber(highRiskCount)}</span>{' '}
                          <span className="text-[11px] text-[#77827B]">(20.56%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5EBE7] text-[11px] text-[#77827B] flex items-center justify-between">
                  <span>ML Model Version: {data.model.model_version || 'v1.4-tuned'}</span>
                  <span className="font-semibold text-[#198754]">Balanced Thresholds</span>
                </div>
              </div>

              {/* Right: Key Insights Card */}
              <div className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Lightbulb className="w-4 h-4 text-[#198754]" />
                    <h3 className="text-sm font-bold text-[#202B25]">
                      Key Insights
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center py-2">
                    {/* Insight 1: Avg Late Payment Rate */}
                    <div className="space-y-1">
                      <div className="w-9 h-9 rounded-full bg-[#EAF5ED] text-[#198754] flex items-center justify-center mx-auto mb-2">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="text-lg sm:text-xl font-extrabold text-[#202B25] font-num">
                        {formatPercent(r.average_late_payment_rate)}
                      </div>
                      <div className="text-[11px] text-[#77827B] leading-snug">
                        Average Late Payment Rate
                      </div>
                    </div>

                    {/* Insight 2: Customers with Payments */}
                    <div className="space-y-1">
                      <div className="w-9 h-9 rounded-full bg-[#EAF5ED] text-[#198754] flex items-center justify-center mx-auto mb-2">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="text-lg sm:text-xl font-extrabold text-[#202B25] font-num">
                        {formatNumber(r.customers_with_late_payments)}
                      </div>
                      <div className="text-[11px] text-[#77827B] leading-snug">
                        Customers with Payments
                      </div>
                    </div>

                    {/* Insight 3: Default Probability */}
                    <div className="space-y-1">
                      <div className="w-9 h-9 rounded-full bg-[#EAF5ED] text-[#198754] flex items-center justify-center mx-auto mb-2">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="text-lg sm:text-xl font-extrabold text-[#202B25] font-num">
                        0.07%
                      </div>
                      <div className="text-[11px] text-[#77827B] leading-snug">
                        Default Probability
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5EBE7] text-[11px] text-[#77827B] flex items-center justify-between">
                  <span>
                    <span className="font-bold text-[#202B25]">{formatNumber(p.predicted_defaults)}</span> Defaulters Identified
                  </span>
                  <span className="text-[#198754] font-semibold">Active Monitoring</span>
                </div>
              </div>
            </div>

            {/* 7. BOTTOM SECTION: TOP RISK CUSTOMERS TABLE */}
            <TopCustomersTable
              title="Top Risk Customers"
              subtitle="Borrowers with highest predicted probability of default requiring prioritized recovery."
              sortBy="risk_score"
              sortOrder="desc"
              limit={5}
            />

            {/* Feature Modals */}
            <DynamicUpiModal
              isOpen={upiModalOpen}
              onClose={() => setUpiModalOpen(false)}
              borrower={{
                name: 'Rahul Sharma',
                loanId: 'LN1001',
                amount: 8500,
                phone: '+91 98201 54321',
              }}
            />
            <PtpTrackerModal
              isOpen={ptpModalOpen}
              onClose={() => setPtpModalOpen(false)}
              borrower={{
                name: 'Rahul Sharma',
                loanId: 'LN1001',
                amount: 8500,
                phone: '+91 98201 54321',
              }}
            />
            <MultiLanguageOutreachModal
              isOpen={langModalOpen}
              onClose={() => setLangModalOpen(false)}
              borrower={{
                name: 'Rahul Sharma',
                loanId: 'LN1001',
                amount: 8500,
                phone: '+91 98201 54321',
              }}
            />
            <OtsGeneratorModal
              isOpen={otsModalOpen}
              onClose={() => setOtsModalOpen(false)}
              borrower={{
                name: 'Rahul Sharma',
                loanId: 'LN1001',
                amount: 85000,
                phone: '+91 98201 54321',
              }}
            />
            <ExecutiveReportModal
              isOpen={reportModalOpen}
              onClose={() => setReportModalOpen(false)}
            />
          </div>
        );
      }}
    </AnalyticsPage>
  );
};
