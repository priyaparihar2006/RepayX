import React, { useState } from 'react';
import {
  Search,
  Bell,
  Copy,
  Check,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  ChevronDown,
  ShoppingBag,
  CircleDollarSign,
  Receipt,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
  Layers,
  ChevronRight,
  ShieldAlert,
  Users,
  Clock,
  Gauge,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import type { AnalyticsResponse } from '../../types/api';
import managerPriyaImg from '../../assets/images/avatar_manager_priya_1790666241592.jpg';
import { formatAmount, formatNumber, formatPercent, formatScore } from '../../lib/format';
import { RISK_COLORS } from '../../lib/chartTheme';
import { MetricCard } from '../analytics/MetricCard';
import { RiskScoreHistogram } from '../analytics/RiskScoreHistogram';
import { RiskDistributionBar } from '../analytics/RiskDistributionBar';
import { LateRateChart } from '../analytics/LateRateChart';
import { TopCustomersTable } from '../analytics/TopCustomersTable';

interface NeoFintechDashboardProps {
  analyticsData?: AnalyticsResponse;
  onNavigateTab?: (tab: string) => void;
}

export const NeoFintechDashboard: React.FC<NeoFintechDashboardProps> = ({
  analyticsData,
  onNavigateTab,
}) => {
  const navigate = useNavigate();

  // State management
  const [activeNavTab, setActiveNavTab] = useState<'Overview' | 'Wealth' | 'Cards' | 'Tools'>('Overview');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'IDR' | 'MYR' | 'INR'>('USD');
  const [showBalance, setShowBalance] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showVouchers, setShowVouchers] = useState(true);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [confirmedPayment, setConfirmedPayment] = useState<boolean | null>(null);
  const [showDeepAnalytics, setShowDeepAnalytics] = useState(false);
  const [spendingMonth, setSpendingMonth] = useState('April');
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount, setNotificationCount] = useState(24);
  const [showNotifications, setShowNotifications] = useState(false);

  const accountNumber = '90340222748';

  // Currency multiplier conversions
  const currencyRates = {
    USD: { symbol: '$', rate: 1, balance: '92,142.10', rewards: '12,172.07', spending: '916.10', earning: '7,110.12' },
    IDR: { symbol: 'Rp', rate: 15800, balance: '1,455,845,180', rewards: '192,318,700', spending: '14,474,380', earning: '112,340,000' },
    MYR: { symbol: 'RM', rate: 4.45, balance: '410,032.35', rewards: '54,165.71', spending: '4,076.65', earning: '31,640.03' },
    INR: { symbol: '₹', rate: 86.5, balance: '7,970,291.65', rewards: '1,052,884.05', spending: '79,242.65', earning: '615,025.38' },
  };

  const currentCur = currencyRates[selectedCurrency];

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleTabClick = (tab: 'Overview' | 'Wealth' | 'Cards' | 'Tools') => {
    setActiveNavTab(tab);
    if (tab === 'Wealth') {
      navigate('/customers');
    } else if (tab === 'Cards') {
      navigate('/loans');
    } else if (tab === 'Tools') {
      navigate('/whatsapp');
    }
  };

  const notificationsList = [
    { id: 1, title: 'EMI Payment Received', desc: 'Rahul Sharma settled ₹8,500 via UPI', time: '10m ago' },
    { id: 2, title: 'AI Risk Alert', desc: 'Vikram Singh risk score escalated to 82', time: '45m ago' },
    { id: 3, title: 'WhatsApp Bot Sync', desc: '18 reminders scheduled for 10:00 AM', time: '2h ago' },
  ];

  return (
    <div className="w-full min-h-screen bg-[#E5E8ED] py-4 sm:py-8 px-2 sm:px-6 lg:px-8 font-sans antialiased text-[#1A1F26]">
      {/* Outer Floating Neo-Fintech Canvas */}
      <div className="max-w-[1240px] mx-auto bg-white rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 lg:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] border border-slate-100">
        
        {/* ============================================================ */}
        {/* 1. TOP HEADER BAR                                            */}
        {/* ============================================================ */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 sm:pb-8 border-b border-slate-100">
          {/* Left: Avatar + Greeting */}
          <div className="flex items-center gap-3.5 self-start md:self-auto">
            <div className="relative group cursor-pointer" onClick={() => navigate('/settings')}>
              <img
                src={managerPriyaImg}
                alt="Siburian Profile"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-[#B4F04D] ring-offset-2 ring-offset-white shadow-xs"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#161B22] flex items-center gap-1.5">
                Hello, Siburian
              </h1>
              <p className="text-[11px] font-medium text-slate-400">RepayX Portfolio Command</p>
            </div>
          </div>

          {/* Center: Neo-Fintech Pill Tabs */}
          <nav className="flex items-center bg-slate-50/90 border border-slate-100 p-1 rounded-full shadow-inner">
            {(['Overview', 'Wealth', 'Cards', 'Tools'] as const).map((tab) => {
              const isActive = activeNavTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#B4F04D] text-[#0F1C07] shadow-sm scale-100'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>

          {/* Right: Search + Notification Icons */}
          <div className="flex items-center gap-2.5 self-end md:self-auto relative">
            {/* Search Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-600 transition cursor-pointer"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              {searchOpen && (
                <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search customers, loans, UTR..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          navigate(`/customers?q=${encodeURIComponent(searchQuery)}`);
                          setSearchOpen(false);
                        }
                      }}
                      className="w-full text-xs bg-slate-50 rounded-xl pl-8 pr-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B4F04D]"
                      autoFocus
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              )}
            </div>

            {/* Notification Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-600 transition cursor-pointer relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {notificationCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-900">Notifications ({notificationCount})</span>
                    <button
                      type="button"
                      onClick={() => setNotificationCount(0)}
                      className="text-[10px] text-[#2F6B12] font-semibold hover:underline cursor-pointer"
                    >
                      Mark read
                    </button>
                  </div>
                  <div className="space-y-2">
                    {notificationsList.map((n) => (
                      <div key={n.id} className="p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100/70 text-xs transition cursor-pointer">
                        <div className="font-semibold text-slate-800">{n.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{n.desc}</div>
                        <div className="text-[9px] text-slate-400 mt-1">{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* 2. TOP SECTION: TWO BENTO HERO CARDS                         */}
        {/* ============================================================ */}
        <section className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          
          {/* ---------------- CARD 1: ACTIVE BALANCE (7 cols) ---------------- */}
          <div className="lg:col-span-7 bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between relative group">
            {/* Top Row: Currency Pills & Account Number */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Currency Selector Capsule */}
              <div className="flex items-center bg-slate-50/90 border border-slate-100 p-1 rounded-full text-xs font-semibold">
                {(['USD', 'IDR', 'MYR', 'INR'] as const).map((curr) => {
                  const isCur = selectedCurrency === curr;
                  const flags = { USD: '🇺🇸', IDR: '🇮🇩', MYR: '🇲🇾', INR: '🇮🇳' };
                  return (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setSelectedCurrency(curr)}
                      className={`px-3 py-1.5 rounded-full transition cursor-pointer flex items-center gap-1.5 ${
                        isCur
                          ? 'bg-white text-slate-900 shadow-xs font-bold'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <span>{flags[curr]}</span>
                      <span>{curr}</span>
                    </button>
                  );
                })}
              </div>

              {/* Account Number with Copy */}
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 font-medium tracking-wide">Account Number</span>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-slate-800 hover:text-black transition cursor-pointer"
                  title="Click to copy"
                >
                  <span>{accountNumber}</span>
                  {copiedAccount ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Middle Section: Active Balance */}
            <div className="my-6 sm:my-8">
              <span className="text-xs font-medium text-slate-400 block mb-1">Active Balance</span>
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#111827]">
                  {showBalance ? `${currentCur.symbol}${currentCur.balance}` : '•••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowBalance(!showBalance)}
                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title={showBalance ? 'Hide balance' : 'Show balance'}
                >
                  {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bottom Row: Actions + Floating Arrow Button */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/automation')}
                  className="bg-[#0D2415] hover:bg-[#163a23] text-white px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-[#B4F04D]" />
                  <span>Transfer Balance</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/whatsapp')}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-800 px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>Request Balance</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeepAnalytics(!showDeepAnalytics)}
                  className="w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition cursor-pointer"
                  title="Toggle Analytics View"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Floating Diagonal Arrow Button */}
              <button
                type="button"
                onClick={() => navigate('/whatsapp')}
                className="w-12 h-12 rounded-full bg-[#B4F04D] hover:bg-[#a2e339] text-[#0E1A08] shadow-sm flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                title="Launch Recovery Dispatcher"
              >
                <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* ---------------- CARD 2: REWARDS / PRIORITY (5 cols - LIME GREEN) ---------------- */}
          <div className="lg:col-span-5 bg-[#B4F04D] rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_10px_30px_rgba(180,240,77,0.35)]">
            {/* Background 4-point star watermark */}
            <div className="absolute -top-12 -right-12 w-48 h-48 pointer-events-none opacity-20">
              <svg viewBox="0 0 200 200" fill="currentColor" className="text-black w-full h-full">
                <path d="M100 0 C100 55 145 100 200 100 C145 100 100 145 100 200 C100 145 55 100 0 100 C55 100 100 55 100 0 Z" />
              </svg>
            </div>

            {/* Top Row: PRIORITY + Badge & More Button */}
            <div className="flex items-center justify-between relative z-10">
              <span className="inline-flex items-center gap-1.5 bg-[#0F1C07] text-[#B4F04D] text-[11px] font-black tracking-wider uppercase px-3.5 py-1.5 rounded-full shadow-xs">
                <span>PRIORITY</span>
                <span className="w-4 h-4 rounded-full border border-[#B4F04D] flex items-center justify-center text-[10px]">+</span>
              </span>

              <button
                type="button"
                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/15 flex items-center justify-center text-slate-900 transition cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Middle: Headline Reward Amount */}
            <div className="my-6 relative z-10">
              <span className="text-xs font-medium text-slate-900/80 block mb-1">Your Rewards</span>
              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0A1604]">
                  {currentCur.symbol}{currentCur.rewards}
                </span>
                <span className="bg-white text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                  +40% this month
                </span>
              </div>
            </div>

            {/* Bottom Row: Dual White Translucent Sub-Cards */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
              {/* Delibix Points Card */}
              <div className="bg-white/40 hover:bg-white/50 backdrop-blur-xs rounded-2xl p-3.5 transition flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-800/80 mb-2">
                  <span className="text-[11px] font-medium">Delibix Points</span>
                  <button
                    type="button"
                    onClick={() => setShowPoints(!showPoints)}
                    className="text-slate-700/60 hover:text-slate-900 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-base sm:text-lg font-bold text-slate-950 font-mono">
                  <span className="text-amber-600">☆</span>
                  <span>{showPoints ? '4,780' : '••••'}</span>
                </div>
              </div>

              {/* Voucher Card */}
              <div className="bg-white/40 hover:bg-white/50 backdrop-blur-xs rounded-2xl p-3.5 transition flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-800/80 mb-2">
                  <span className="text-[11px] font-medium">Voucher</span>
                  <button
                    type="button"
                    onClick={() => setShowVouchers(!showVouchers)}
                    className="text-slate-700/60 hover:text-slate-900 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-base sm:text-lg font-bold text-slate-950 font-mono">
                  <span>🏷</span>
                  <span>{showVouchers ? '124' : '••'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. BOTTOM SECTION: THREE EQUAL BENTO CARDS                  */}
        {/* ============================================================ */}
        <section className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          
          {/* ---------------- CARD 1: SPENDING DONUT GAUGE ---------------- */}
          <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">Spending</h3>
              </div>

              {/* Month Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200/60 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-1 transition cursor-pointer"
                >
                  <span>{spendingMonth}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {showMonthDropdown && (
                  <div className="absolute right-0 top-8 z-30 bg-white rounded-xl shadow-lg border border-slate-100 p-1 w-28 text-xs">
                    {['March', 'April', 'May'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSpendingMonth(m);
                          setShowMonthDropdown(false);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-700 cursor-pointer"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Circular Donut Gauge Graphic */}
            <div className="my-5 flex flex-col items-center justify-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#E5E8ED"
                    strokeWidth="9"
                    fill="none"
                  />
                  {/* Foreground Accent Arc (Lime Green) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#B4F04D"
                    strokeWidth="9"
                    fill="none"
                    strokeDasharray="251.2"
                    strokeDashoffset="75"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Inner Amount */}
                <div className="absolute text-center">
                  <div className="text-xl sm:text-2xl font-black text-slate-900">
                    {currentCur.symbol}{currentCur.spending}
                  </div>
                  <div className="text-[11px] font-bold text-rose-500">+12%</div>
                </div>
              </div>

              {/* Subtitle Badge */}
              <div className="mt-3 bg-slate-50 border border-slate-100 px-3.5 py-1.5 rounded-full text-[11px] text-slate-600 flex items-center gap-1.5 shadow-2xs">
                <span className="text-slate-400">✦</span>
                <span>Rent spending is up <strong className="text-rose-600 font-bold">8.4%</strong></span>
              </div>
            </div>

            {/* Legend / Breakdown */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#B4F04D]" />
                <span>Rent: <strong className="text-slate-800 font-semibold">{currentCur.symbol}500.02</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Transport: <strong className="text-slate-800 font-semibold">{currentCur.symbol}217.00</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span>Food: <strong className="text-slate-800 font-semibold">{currentCur.symbol}100.00</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-200" />
                <span>Entertainment: <strong className="text-slate-800 font-semibold">{currentCur.symbol}100.00</strong></span>
              </div>
            </div>
          </div>

          {/* ---------------- CARD 2: EARNING & PROGRESS BARS ---------------- */}
          <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600">
                  <CircleDollarSign className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">Earning</h3>
              </div>

              {/* Tag with indicator */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-xs font-bold font-mono text-slate-800">
                  <span>@</span>
                  <span>{currentCur.symbol}8400</span>
                </div>
                <div className="w-7 h-0.5 bg-orange-500 rounded-full mt-0.5" />
              </div>
            </div>

            {/* Big Stat */}
            <div className="my-4">
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {currentCur.symbol}{currentCur.earning}
              </div>
              <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
                +18% vs last month
              </div>
            </div>

            {/* Stacked Progress Bars Breakdown */}
            <div className="space-y-3.5 pt-1">
              {/* Item 1: Investment */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                  <span>Investment</span>
                  <span className="font-mono text-slate-800">{currentCur.symbol}2,000.00</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-[30%] h-full bg-slate-300 rounded-full" />
                </div>
              </div>

              {/* Item 2: Salary (with green highlight & dark pill) */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Salary</span>
                  <span className="font-mono text-slate-900">{currentCur.symbol}4,000.00</span>
                </div>
                <div className="relative w-full h-2.5 bg-slate-100 rounded-full flex items-center">
                  <div className="w-[60%] h-full bg-[#B4F04D] rounded-full" />
                  <span className="absolute left-[54%] bg-[#0F1C07] text-[#B4F04D] text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                    51%
                  </span>
                </div>
              </div>

              {/* Item 3: Freelance */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                  <span>Freelance</span>
                  <span className="font-mono text-slate-800">{currentCur.symbol}1,335.01</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-[22%] h-full bg-slate-300 rounded-full" />
                </div>
              </div>

              {/* Item 4: Others */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                  <span>Others</span>
                  <span className="font-mono text-slate-800">{currentCur.symbol}486.00</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-[12%] h-full bg-slate-300 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- CARD 3: TRANSACTIONS & CONFIRMATION ---------------- */}
          <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">Transactions</h3>
              </div>

              <button
                type="button"
                className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Transactions List */}
            <div className="space-y-3 my-3">
              {/* Item 1: Asivest Subscriptions (Interactive Confirmation Card) */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3 flex items-center justify-between transition hover:border-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-800 shadow-2xs shrink-0">
                    <span className="text-orange-500 font-bold text-sm">▲</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      Asivest Subscriptions <span className="font-mono text-slate-600">{currentCur.symbol}300</span>
                    </div>
                    <div className="text-[10px] font-semibold text-orange-500 mt-0.5">
                      {confirmedPayment === true ? '✓ Payment Confirmed' : confirmedPayment === false ? '✕ Rejected' : 'Payment confirmation'}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                {confirmedPayment === null ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmedPayment(true)}
                      className="w-7 h-7 rounded-full bg-[#B4F04D] hover:bg-[#a2e339] text-[#0F1C07] flex items-center justify-center shadow-xs transition cursor-pointer"
                      title="Confirm Payment"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmedPayment(false)}
                      className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
                      title="Decline"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmedPayment(null)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Item 2: Salary Payment (Meta/Infinity icon) */}
              <div className="flex items-center justify-between py-1 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                    <span>∞</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Salary Payment</div>
                    <div className="text-[10px] text-slate-400 font-medium">Today, 09:00 AM</div>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-600">
                  +{currentCur.symbol}5,000.00
                </span>
              </div>

              {/* Item 3: Buy - Macbook Pro (Apple icon) */}
              <div className="flex items-center justify-between py-1 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs shrink-0">
                    <span></span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Buy - Macbook Pro</div>
                    <div className="text-[10px] text-slate-400 font-medium">Yesterday, 2:30 PM</div>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-rose-600">
                  -{currentCur.symbol}4,000.00
                </span>
              </div>

              {/* Item 4: Refund - Google Pay */}
              <div className="flex items-center justify-between py-1 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-xs font-black text-slate-700 shrink-0">
                    <span className="text-[#4285F4]">G</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Refund - Google Pay</div>
                    <div className="text-[10px] text-slate-400 font-medium">Apr 1, 2026</div>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-600">
                  +{currentCur.symbol}120.00
                </span>
              </div>
            </div>

            {/* Bottom View All Link */}
            <button
              type="button"
              onClick={() => navigate('/payments')}
              className="w-full text-center py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition flex items-center justify-center gap-1 cursor-pointer pt-2 border-t border-slate-100"
            >
              <span>View full ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. EXPANDABLE SECTION: REPAYX CORE MACHINE LEARNING ANALYTICS */}
        {/* ============================================================ */}
        <section className="mt-8 pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>RepayX Live Portfolio Risk Intelligence</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Connected to backend Logistic Regression ML model & 61,503 loan records
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDeepAnalytics(!showDeepAnalytics)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>{showDeepAnalytics ? 'Hide Advanced ML Data' : 'Explore Portfolio ML Charts'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDeepAnalytics ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showDeepAnalytics && analyticsData && (
            <div className="space-y-6 pt-2 animate-in fade-in duration-300">
              {/* Metric Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Customers"
                  value={formatNumber(analyticsData.portfolio.total_customers)}
                  icon={Users}
                  detail={`Average risk score ${formatScore(analyticsData.portfolio.average_risk_score)}`}
                />
                {(['High Risk', 'Medium Risk', 'Low Risk'] as const).map((c) => {
                  const cat = analyticsData.portfolio.risk_categories.find((x) => x.risk_category === c);
                  return (
                    <MetricCard
                      key={c}
                      label={c}
                      keyColor={RISK_COLORS[c]}
                      value={formatNumber(cat?.customers ?? 0)}
                      detail={`${formatPercent(cat?.share ?? 0)} of total portfolio`}
                    />
                  );
                })}
              </div>

              {/* Histogram & Distribution */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <RiskScoreHistogram
                    bins={analyticsData.risk_score_histogram}
                    mediumFrom={analyticsData.model?.risk_band_medium_from}
                    highFrom={analyticsData.model?.risk_band_high_from}
                  />
                </div>
                <div className="space-y-6">
                  <RiskDistributionBar
                    categories={analyticsData.portfolio.risk_categories}
                    total={analyticsData.portfolio.total_customers}
                  />
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Model Precision Metrics</h3>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">ROC-AUC</span>
                        <span className="text-lg font-bold text-slate-900">{analyticsData.model?.evaluation.roc_auc}%</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Accuracy</span>
                        <span className="text-lg font-bold text-slate-900">{analyticsData.model?.evaluation.accuracy}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top High Risk Customers */}
              <div className="pt-2">
                <TopCustomersTable title="Top Scored Defaulter Risks" subtitle="Ranked by logistic regression output" sortBy="risk_score" />
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
