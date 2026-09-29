/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  INITIAL_CUSTOMERS,
  INITIAL_LOANS,
  INITIAL_CONVERSATIONS,
  INITIAL_FOLLOWUPS,
} from './data/mockData';
import { Customer, Loan, Conversation, FollowUpItem } from './types';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ToastProvider, useToast } from './components/common/Toast';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { ConversationView } from './components/conversations/ConversationView';
import { CustomersPage } from './components/customers/CustomersPage';
import { CustomerDetailView } from './components/customers/CustomerDetailView';
import { FollowupsPage } from './components/followups/FollowupsPage';
import { RagKnowledgeBasePage } from './components/rag/RagKnowledgeBasePage';
import { PaymentsPage } from './components/payments/PaymentsPage';
import { EscalationsPage } from './components/escalations/EscalationsPage';
import { AiInsightsPage } from './components/insights/AiInsightsPage';
import { LoansPage } from './components/loans/LoansPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { AiAssistantDrawer } from './components/ai-drawer/AiAssistantDrawer';

function AppContent() {
  const { addToast } = useToast();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Application Data State
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [loans, setLoans] = useState<Loan[]>(INITIAL_LOANS);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [followups, setFollowups] = useState<FollowUpItem[]>(INITIAL_FOLLOWUPS);

  // Selected Detail states
  const [activeConversationId, setActiveConversationId] = useState<string>('CONV001');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Quick navigation handler
  const handleNavigate = (tab: string, targetId?: string) => {
    if (tab === 'conversations') {
      setCurrentTab('conversations');
      if (targetId) setActiveConversationId(targetId);
      setSelectedCustomerId(null);
    } else if (tab === 'customers') {
      setCurrentTab('customers');
      if (targetId) setSelectedCustomerId(targetId);
    } else if (tab === 'loans') {
      setCurrentTab('loans');
      setSelectedCustomerId(null);
    } else if (tab === 'rag-knowledge') {
      setCurrentTab('rag-knowledge');
      setSelectedCustomerId(null);
    } else if (tab === 'payments') {
      setCurrentTab('payments');
      setSelectedCustomerId(null);
    } else if (tab === 'escalations') {
      setCurrentTab('escalations');
      setSelectedCustomerId(null);
    } else if (tab === 'settings') {
      setCurrentTab('settings');
      setSelectedCustomerId(null);
    } else if (tab === 'reports') {
      setCurrentTab('reports');
      setSelectedCustomerId(null);
    } else if (tab === 'ai-insights') {
      setCurrentTab('ai-insights');
      setSelectedCustomerId(null);
    } else if (tab === 'ai-assistant') {
      setIsAiAssistantOpen(true);
    } else {
      setCurrentTab(tab as NavTab);
      setSelectedCustomerId(null);
    }
  };

  // Add scheduled follow-up
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

  // Update followup status
  const handleUpdateFollowupStatus = (id: string, status: any) => {
    setFollowups((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  // Page titles and breadcrumbs
  const getPageMeta = () => {
    if (selectedCustomerId && currentTab === 'customers') {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      return {
        title: cust?.name || 'Customer Details',
        breadcrumb: `Customers / ${cust?.id || 'Details'}`,
      };
    }

    switch (currentTab) {
      case 'overview':
        return { title: 'Loan Recovery Dashboard', breadcrumb: 'Overview' };
      case 'customers':
        return { title: 'Customer Management', breadcrumb: 'Customers' };
      case 'loans':
        return { title: 'Loan Portfolio Ledger', breadcrumb: 'Loans' };
      case 'follow-ups':
        return { title: 'Follow-up Scheduler & Queue', breadcrumb: 'Follow-ups' };
      case 'conversations':
        return { title: 'AI Conversation & RAG Analysis', breadcrumb: 'Conversations' };
      case 'rag-knowledge':
        return { title: 'RAG Policy Knowledge Base', breadcrumb: 'AI / Knowledge Base' };
      case 'ai-insights':
        return { title: 'AI Recovery Analytics & Funnel', breadcrumb: 'AI / Insights' };
      case 'payments':
        return { title: 'Payments & Settlement Verification', breadcrumb: 'Management / Payments' };
      case 'escalations':
        return { title: 'Escalations & Authorization Queue', breadcrumb: 'Management / Escalations' };
      case 'reports':
        return { title: 'Recovery Reports & Audits', breadcrumb: 'Management / Reports' };
      case 'settings':
        return { title: 'Recovery Settings & Policy Rules', breadcrumb: 'System / Settings' };
      default:
        return { title: 'LoanFlow AI', breadcrumb: 'Dashboard' };
    }
  };

  const { title, breadcrumb } = getPageMeta();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Fixed Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'ai-assistant') {
            setIsAiAssistantOpen(true);
          } else {
            setCurrentTab(tab);
            setSelectedCustomerId(null);
          }
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        unreadCount={conversations.filter((c) => c.unread).length}
        pendingEscalationsCount={5}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Top Navbar */}
        <Navbar
          pageTitle={title}
          breadcrumb={breadcrumb}
          onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
          onNavigate={handleNavigate}
          customers={customers}
          loans={loans}
          conversations={conversations}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'overview' && (
            <OverviewDashboard
              loans={loans}
              customers={customers}
              followups={followups}
              onSelectCustomer={(cId) => {
                setSelectedCustomerId(cId);
                setCurrentTab('customers');
              }}
              onOpenConversation={(convId) => {
                setActiveConversationId(convId);
                setCurrentTab('conversations');
              }}
              onNavigateTab={(tab) => handleNavigate(tab)}
            />
          )}

          {currentTab === 'customers' && (
            selectedCustomerId ? (
              <CustomerDetailView
                customer={customers.find((c) => c.id === selectedCustomerId) || customers[0]}
                loan={loans.find((l) => l.customerId === selectedCustomerId)}
                onBack={() => setSelectedCustomerId(null)}
                onOpenConversation={() => {
                  const matchConv = conversations.find((c) => c.customerId === selectedCustomerId);
                  if (matchConv) setActiveConversationId(matchConv.id);
                  setCurrentTab('conversations');
                  setSelectedCustomerId(null);
                }}
              />
            ) : (
              <CustomersPage
                customers={customers}
                loans={loans}
                onSelectCustomer={(cId) => setSelectedCustomerId(cId)}
                onOpenConversation={() => setCurrentTab('conversations')}
              />
            )
          )}

          {currentTab === 'conversations' && (
            <ConversationView
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => setActiveConversationId(id)}
              customers={customers}
              loans={loans}
              onScheduleFollowup={handleScheduleFollowup}
              onNavigateToCustomer={(cId) => {
                setSelectedCustomerId(cId);
                setCurrentTab('customers');
              }}
            />
          )}

          {currentTab === 'loans' && (
            <LoansPage
              loans={loans}
              customers={customers}
              onSelectCustomer={(cId) => {
                setSelectedCustomerId(cId);
                setCurrentTab('customers');
              }}
              onOpenConversation={(loanId) => {
                const matchConv = conversations.find((c) => c.loanId === loanId);
                if (matchConv) setActiveConversationId(matchConv.id);
                setCurrentTab('conversations');
              }}
            />
          )}

          {currentTab === 'follow-ups' && (
            <FollowupsPage
              followups={followups}
              onOpenConversation={() => setCurrentTab('conversations')}
              onUpdateFollowupStatus={handleUpdateFollowupStatus}
            />
          )}

          {currentTab === 'rag-knowledge' && <RagKnowledgeBasePage />}

          {currentTab === 'payments' && <PaymentsPage />}

          {currentTab === 'escalations' && (
            <EscalationsPage
              onOpenConversation={(cId) => {
                if (cId) {
                  const matchConv = conversations.find((c) => c.customerId === cId);
                  if (matchConv) setActiveConversationId(matchConv.id);
                }
                setCurrentTab('conversations');
              }}
            />
          )}

          {currentTab === 'ai-insights' && <AiInsightsPage />}

          {currentTab === 'reports' && <ReportsPage />}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Global AI Copilot Slide-Over Drawer */}
      <AiAssistantDrawer
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        onNavigateToTab={handleNavigate}
        customers={customers}
        loans={loans}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
