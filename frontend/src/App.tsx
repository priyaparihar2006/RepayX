/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router';
import {
  INITIAL_CUSTOMERS,
  INITIAL_LOANS,
  INITIAL_CONVERSATIONS,
  INITIAL_FOLLOWUPS,
} from './data/mockData';
import { Customer, Loan, Conversation, FollowUpItem } from './types';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ToastProvider } from './components/common/Toast';
import { DemoDataNotice } from './components/common/DemoDataNotice';
import { AiAssistantDrawer } from './components/ai-drawer/AiAssistantDrawer';
import { EmptyState, LoadingState } from './components/common/RequestState';

// Pages are loaded on first visit to keep the initial bundle small.
const OverviewDashboard = lazy(() => import('./components/dashboard/OverviewDashboard').then((m) => ({ default: m.OverviewDashboard })));
const ConversationView = lazy(() => import('./components/conversations/ConversationView').then((m) => ({ default: m.ConversationView })));
const DemoCustomersPage = lazy(() => import('./components/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const CustomerDetailView = lazy(() => import('./components/customers/CustomerDetailView').then((m) => ({ default: m.CustomerDetailView })));
const FollowupsPage = lazy(() => import('./components/followups/FollowupsPage').then((m) => ({ default: m.FollowupsPage })));
const RagKnowledgeBasePage = lazy(() => import('./components/rag/RagKnowledgeBasePage').then((m) => ({ default: m.RagKnowledgeBasePage })));
const PaymentsPage = lazy(() => import('./components/payments/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const EscalationsPage = lazy(() => import('./components/escalations/EscalationsPage').then((m) => ({ default: m.EscalationsPage })));
const AiInsightsPage = lazy(() => import('./components/insights/AiInsightsPage').then((m) => ({ default: m.AiInsightsPage })));
const LoansPage = lazy(() => import('./components/loans/LoansPage').then((m) => ({ default: m.LoansPage })));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ReportsPage = lazy(() => import('./components/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const CustomersPage = lazy(() => import('./pages/Customers').then((m) => ({ default: m.CustomersPage })));
const AIInsightsPage = lazy(() => import('./pages/AIInsights').then((m) => ({ default: m.AIInsightsPage })));
const DashboardPage = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage })));
const RiskAnalyticsPage = lazy(() => import('./pages/RiskAnalytics').then((m) => ({ default: m.RiskAnalyticsPage })));
const RepaymentAnalyticsPage = lazy(() => import('./pages/RepaymentAnalytics').then((m) => ({ default: m.RepaymentAnalyticsPage })));
const CustomerDetailsPage = lazy(() => import('./pages/CustomerDetails').then((m) => ({ default: m.CustomerDetailsPage })));
const WhatsAppPage = lazy(() => import('./pages/WhatsApp').then((m) => ({ default: m.WhatsAppPage })));

// URL for each sidebar tab. 'ai-assistant' opens the drawer instead of a page.
const TAB_PATHS: Record<Exclude<NavTab, 'ai-assistant'>, string> = {
  overview: '/',
  customers: '/customers',
  whatsapp: '/whatsapp',
  'risk-analytics': '/analytics/risk',
  'repayment-analytics': '/analytics/repayment',
  'demo-overview': '/demo/overview',
  'demo-insights': '/demo/insights',
  loans: '/loans',
  'follow-ups': '/follow-ups',
  conversations: '/conversations',
  'rag-knowledge': '/knowledge-base',
  'ai-insights': '/insights',
  payments: '/payments',
  escalations: '/escalations',
  reports: '/reports',
  settings: '/settings',
};

function tabForPath(pathname: string): NavTab {
  if (pathname.startsWith('/customers') || pathname.startsWith('/demo-customers')) return 'customers';
  const match = (Object.entries(TAB_PATHS) as [NavTab, string][]).find(([, path]) => path !== '/' && pathname.startsWith(path));
  return match ? match[0] : 'overview';
}

function pageMeta(pathname: string): { title: string; breadcrumb: string } {
  const customer = pathname.match(/^\/customers\/([^/]+)/);
  if (customer) return { title: `Customer ${decodeURIComponent(customer[1])}`, breadcrumb: `Customers / ${decodeURIComponent(customer[1])}` };
  if (pathname.startsWith('/demo-customers')) return { title: 'Demo Customer Workflow', breadcrumb: 'Demo / Customers' };
  switch (tabForPath(pathname)) {
    case 'overview':
      return pathname === '/' ? { title: 'Risk Dashboard', breadcrumb: 'Dashboard' } : { title: 'Page not found', breadcrumb: 'RepayX' };
    case 'customers':
      return { title: 'Customer Risk Portfolio', breadcrumb: 'Customers' };
    case 'whatsapp':
      return { title: 'WhatsApp Messages', breadcrumb: 'Messaging / WhatsApp' };
    case 'risk-analytics':
      return { title: 'Risk Analytics', breadcrumb: 'Analytics / Risk' };
    case 'repayment-analytics':
      return { title: 'Repayment Analytics', breadcrumb: 'Analytics / Repayment' };
    case 'demo-overview':
      return { title: 'Loan Recovery Overview', breadcrumb: 'Demo / Recovery Overview' };
    case 'loans':
      return { title: 'Loan Portfolio Ledger', breadcrumb: 'Loans' };
    case 'follow-ups':
      return { title: 'Follow-up Scheduler & Queue', breadcrumb: 'Follow-ups' };
    case 'conversations':
      return { title: 'AI Conversation & RAG Analysis', breadcrumb: 'Conversations' };
    case 'rag-knowledge':
      return { title: 'RAG Policy Knowledge Base', breadcrumb: 'AI / Knowledge Base' };
    case 'ai-insights':
      return { title: 'AI Insights', breadcrumb: 'AI Insights' };
    case 'demo-insights':
      return { title: 'AI Recovery Analytics & Funnel', breadcrumb: 'Demo / Recovery Funnel' };
    case 'payments':
      return { title: 'Payments & Settlement Verification', breadcrumb: 'Management / Payments' };
    case 'escalations':
      return { title: 'Escalations & Authorization Queue', breadcrumb: 'Management / Escalations' };
    case 'reports':
      return { title: 'Recovery Reports & Audits', breadcrumb: 'Management / Reports' };
    case 'settings':
      return { title: 'Recovery Settings & Policy Rules', breadcrumb: 'System / Settings' };
    default:
      return { title: 'RepayX', breadcrumb: 'Dashboard' };
  }
}

/** Wraps pages that still run on sample data. */
const Demo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <DemoDataNotice />
    {children}
  </>
);

function AppContent() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const currentTab = tabForPath(pathname);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Demo workflow data (sample data; not connected to the RepayX API)
  const [customers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [loans] = useState<Loan[]>(INITIAL_LOANS);
  const [conversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [followups, setFollowups] = useState<FollowUpItem[]>(INITIAL_FOLLOWUPS);
  const [activeConversationId, setActiveConversationId] = useState<string>('CONV001');

  const openDemoCustomer = (customerId: string) => navigate(`/demo-customers/${encodeURIComponent(customerId)}`);

  const openConversation = (conversationId?: string) => {
    if (conversationId) setActiveConversationId(conversationId);
    navigate(TAB_PATHS.conversations);
  };

  // Navigation requests from the navbar, drawer, and demo pages (which use sample IDs).
  const handleNavigate = (tab: string, targetId?: string) => {
    if (tab === 'ai-assistant') {
      setIsAiAssistantOpen(true);
    } else if (tab === 'conversations') {
      openConversation(targetId);
    } else if (tab === 'risk-customer' && targetId) {
      navigate(`/customers/${encodeURIComponent(targetId)}`);
    } else if (tab === 'customers' && targetId) {
      openDemoCustomer(targetId);
    } else {
      navigate(TAB_PATHS[tab as keyof typeof TAB_PATHS] ?? '/');
    }
  };

  const handleScheduleFollowup = (newFollowup: {
    customerId: string;
    customerName: string;
    loanId: string;
    scheduledAt: string;
    scheduledTime: string;
    aiReason: string;
  }) => {
    const item: FollowUpItem = {
      id: `FLW-${Date.now()}`,
      customerId: newFollowup.customerId,
      customerName: newFollowup.customerName,
      loanId: newFollowup.loanId,
      followupType: 'WhatsApp',
      scheduledAt: newFollowup.scheduledAt,
      scheduledTime: newFollowup.scheduledTime,
      aiReason: newFollowup.aiReason,
      status: 'pending',
      priority: 'High',
      attemptNumber: 2,
      outstandingAmount: loans.find((l) => l.id === newFollowup.loanId)?.outstanding || 8500,
    };
    setFollowups([item, ...followups]);
  };

  const handleUpdateFollowupStatus = (id: string, status: FollowUpItem['status']) => {
    setFollowups((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  const { title, breadcrumb } = pageMeta(pathname);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => (tab === 'ai-assistant' ? setIsAiAssistantOpen(true) : navigate(TAB_PATHS[tab]))}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        unreadCount={conversations.filter((c) => c.unread).length}
        pendingEscalationsCount={5}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <Navbar
          isLiveMessaging={pathname === '/whatsapp'}
          pageTitle={title}
          breadcrumb={breadcrumb}
          onOpenAiAssistant={() => navigate(TAB_PATHS['ai-insights'])}
          onNavigate={handleNavigate}
          customers={customers}
          loans={loans}
          conversations={conversations}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Suspense fallback={<LoadingState />}>
          <Routes>
            {/* Connected to the RepayX API */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/analytics/risk" element={<RiskAnalyticsPage />} />
            <Route path="/analytics/repayment" element={<RepaymentAnalyticsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />
            <Route path="/whatsapp" element={<WhatsAppPage />} />

            {/* Demo workflow pages (sample data) */}
            <Route
              path="/demo/overview"
              element={
                <Demo>
                  <OverviewDashboard
                    loans={loans}
                    customers={customers}
                    followups={followups}
                    onSelectCustomer={openDemoCustomer}
                    onOpenConversation={openConversation}
                    onNavigateTab={(tab) => handleNavigate(tab)}
                  />
                </Demo>
              }
            />
            <Route
              path="/demo-customers"
              element={
                <Demo>
                  <DemoCustomersPage
                    customers={customers}
                    loans={loans}
                    onSelectCustomer={openDemoCustomer}
                    onOpenConversation={() => openConversation()}
                  />
                </Demo>
              }
            />
            <Route
              path="/demo-customers/:demoId"
              element={
                <Demo>
                  <DemoCustomerDetail customers={customers} loans={loans} conversations={conversations} onOpenConversation={openConversation} />
                </Demo>
              }
            />
            <Route
              path="/conversations"
              element={
                <Demo>
                  <ConversationView
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onSelectConversation={(id) => setActiveConversationId(id)}
                    customers={customers}
                    loans={loans}
                    onScheduleFollowup={handleScheduleFollowup}
                    onNavigateToCustomer={openDemoCustomer}
                  />
                </Demo>
              }
            />
            <Route
              path="/loans"
              element={
                <Demo>
                  <LoansPage
                    loans={loans}
                    customers={customers}
                    onSelectCustomer={openDemoCustomer}
                    onOpenConversation={(loanId) => openConversation(conversations.find((c) => c.loanId === loanId)?.id)}
                  />
                </Demo>
              }
            />
            <Route
              path="/follow-ups"
              element={
                <Demo>
                  <FollowupsPage
                    followups={followups}
                    onOpenConversation={() => openConversation()}
                    onUpdateFollowupStatus={handleUpdateFollowupStatus}
                  />
                </Demo>
              }
            />
            <Route path="/knowledge-base" element={<Demo><RagKnowledgeBasePage /></Demo>} />
            <Route path="/payments" element={<Demo><PaymentsPage /></Demo>} />
            <Route
              path="/escalations"
              element={
                <Demo>
                  <EscalationsPage
                    onOpenConversation={(cId) =>
                      openConversation(cId ? conversations.find((c) => c.customerId === cId)?.id : undefined)
                    }
                  />
                </Demo>
              }
            />
            <Route path="/insights" element={<AIInsightsPage />} />
            <Route path="/demo/insights" element={<Demo><AiInsightsPage /></Demo>} />
            <Route path="/reports" element={<Demo><ReportsPage /></Demo>} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </main>
      </div>

      <AiAssistantDrawer
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        onNavigateToTab={handleNavigate}
      />
    </div>
  );
}

/** Sample-data customer detail. Unknown IDs show a not-found state instead of another customer's data. */
const DemoCustomerDetail: React.FC<{
  customers: Customer[];
  loans: Loan[];
  conversations: Conversation[];
  onOpenConversation: (conversationId?: string) => void;
}> = ({ customers, loans, conversations, onOpenConversation }) => {
  const { demoId } = useParams();
  const navigate = useNavigate();
  const customer = customers.find((c) => c.id === demoId);
  if (!customer) {
    return (
      <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200/80">
        <EmptyState title={`Demo customer ${demoId ?? ''} not found`} message="Open a customer from the demo workflow pages." />
      </div>
    );
  }
  return (
    <CustomerDetailView
      customer={customer}
      loan={loans.find((l) => l.customerId === customer.id)}
      onBack={() => navigate(-1)}
      onOpenConversation={() => onOpenConversation(conversations.find((c) => c.customerId === customer.id)?.id)}
    />
  );
};

const NotFound: React.FC = () => (
  <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200/80 text-center">
    <EmptyState title="Page not found" message="The page you requested does not exist." />
    <Link to="/" className="inline-block mb-10 text-xs font-semibold text-blue-600 hover:underline">
      Go to the dashboard
    </Link>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}
