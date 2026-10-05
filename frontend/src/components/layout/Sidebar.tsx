import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarClock,
  MessageSquare,
  Bot,
  BookOpen,
  LineChart,
  ShieldAlert,
  FileCheck2,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PieChart,
  Wallet,
  Presentation,
} from 'lucide-react';
import { MANAGER_PROFILE } from '../../data/mockData';

export type NavTab =
  | 'overview'
  | 'customers'
  | 'risk-analytics'
  | 'repayment-analytics'
  | 'demo-overview'
  | 'demo-insights'
  | 'loans'
  | 'follow-ups'
  | 'conversations'
  | 'ai-assistant'
  | 'rag-knowledge'
  | 'ai-insights'
  | 'payments'
  | 'escalations'
  | 'reports'
  | 'settings';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isAi?: boolean;
  badge?: number;
  badgeColor?: string;
}

interface NavSection {
  group: string;
  items: NavItem[];
}

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  unreadCount?: number;
  pendingEscalationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  unreadCount = 2,
  pendingEscalationsCount = 5,
}) => {
  const navSections: NavSection[] = [
    {
      group: 'RISK INTELLIGENCE',
      items: [
        { id: 'overview' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'customers' as NavTab, label: 'Customers', icon: Users },
        { id: 'risk-analytics' as NavTab, label: 'Risk Analytics', icon: PieChart },
        { id: 'repayment-analytics' as NavTab, label: 'Repayment Analytics', icon: Wallet },
        { id: 'ai-insights' as NavTab, label: 'AI Insights', icon: LineChart, isAi: true },
      ],
    },
    {
      // Recovery workflow pages that still run on sample data.
      group: 'DEMO WORKFLOW',
      items: [
        { id: 'demo-overview' as NavTab, label: 'Recovery Overview', icon: Presentation },
        { id: 'demo-insights' as NavTab, label: 'Recovery Funnel', icon: TrendingUp },
        { id: 'loans' as NavTab, label: 'Loans', icon: CreditCard },
        { id: 'follow-ups' as NavTab, label: 'Follow-ups', icon: CalendarClock },
        {
          id: 'conversations' as NavTab,
          label: 'Conversations',
          icon: MessageSquare,
          badge: unreadCount > 0 ? unreadCount : undefined,
        },
        { id: 'ai-assistant' as NavTab, label: 'AI Assistant', icon: Bot, isAi: true },
        { id: 'rag-knowledge' as NavTab, label: 'Knowledge Base', icon: BookOpen, isAi: true },
        { id: 'payments' as NavTab, label: 'Payments', icon: FileCheck2 },
        {
          id: 'escalations' as NavTab,
          label: 'Escalations',
          icon: ShieldAlert,
          badge: pendingEscalationsCount > 0 ? pendingEscalationsCount : undefined,
          badgeColor: 'bg-rose-500',
        },
        { id: 'reports' as NavTab, label: 'Reports', icon: TrendingUp },
      ],
    },
    {
      group: 'SYSTEM',
      items: [{ id: 'settings' as NavTab, label: 'Settings', icon: Settings }],
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-30 flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-white tracking-tight">RepayX</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 tracking-wide">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Recovery Management</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.group}>
            {!isCollapsed && (
              <h4 className="px-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                {section.group}
              </h4>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isActive
                            ? 'text-white'
                            : item.isAi
                            ? 'text-purple-400 group-hover:text-purple-300'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />

                      {!isCollapsed && (
                        <span className="flex-1 text-left truncate">{item.label}</span>
                      )}

                      {!isCollapsed && item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white ${
                            item.badgeColor || 'bg-blue-500'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Tooltip in collapsed mode */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-950 text-white text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* User Manager Profile Section */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 shrink-0">
        <div
          className={`flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className="relative shrink-0">
            <img
              src={MANAGER_PROFILE.avatar}
              alt={MANAGER_PROFILE.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/30"
              onError={(e) => {
                // Fallback avatar container if image error
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            {/* Fallback avatar initials */}
            <div className="w-9 h-9 rounded-full bg-blue-700 text-white font-bold flex items-center justify-center text-xs ring-2 ring-blue-500/30 -z-10 absolute inset-0">
              PP
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white truncate">
                  {MANAGER_PROFILE.name}
                </p>
                <span className="text-[10px] text-emerald-400 font-medium">Online</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{MANAGER_PROFILE.role}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
