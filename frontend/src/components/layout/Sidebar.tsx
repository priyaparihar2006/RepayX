import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  MessageSquare,
  Sparkles,
  BookOpen,
  ShieldAlert,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
  FileSpreadsheet,
  Send,
  PieChart,
  Wallet,
  LineChart,
  BellRing,
} from 'lucide-react';
import { MANAGER_PROFILE } from '../../data/mockData';

export type NavTab =
  | 'overview'
  | 'customers'
  | 'whatsapp'
  | 'automation'
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
  sublabel?: string;
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
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  unreadCount?: number;
  pendingEscalationsCount?: number;
  onOpenSendMessage?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  unreadCount = 2,
  pendingEscalationsCount = 5,
  onOpenSendMessage,
}) => {
  // Keyboard shortcuts: Escape to close mobile, Ctrl+B / Cmd+B / Ctrl+\ to toggle collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === '\\')) {
        e.preventDefault();
        onToggleCollapse();
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileOpen, onCloseMobile, onToggleCollapse]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const navSections: NavSection[] = [
    {
      group: 'RISK INTELLIGENCE',
      items: [
        {
          id: 'overview',
          label: 'Risk Dashboard',
          sublabel: 'Default Risk & Scored',
          icon: LayoutDashboard,
        },
        {
          id: 'customers',
          label: 'Customer Portfolio',
          sublabel: 'Scored Defaulters',
          icon: Users,
        },
        {
          id: 'risk-analytics',
          label: 'Risk Analytics',
          sublabel: 'Segments & Rates',
          icon: PieChart,
        },
        {
          id: 'repayment-analytics',
          label: 'Repayment Analytics',
          sublabel: 'Underpayment & DPD',
          icon: Wallet,
        },
        {
          id: 'ai-insights',
          label: 'AI Insights',
          sublabel: 'Hybrid Natural Query',
          icon: LineChart,
          isAi: true,
        },
      ],
    },
    {
      group: 'AUTONOMOUS OUTREACH',
      items: [
        {
          id: 'automation',
          label: 'EMI Reminder Automation',
          sublabel: 'Imports, Schedules & Delivery',
          icon: BellRing,
          badgeColor: 'bg-[#245C35]',
        },
        {
          id: 'whatsapp',
          label: 'WhatsApp Outreach',
          sublabel: 'NLP, CSV & Schedules',
          icon: MessageSquare,
          badgeColor: 'bg-[#245C35]',
        },
        {
          id: 'conversations',
          label: 'Omnichannel Messages',
          sublabel: 'WA, SMS & Email',
          icon: MessageSquare,
          badge: unreadCount > 0 ? unreadCount : undefined,
          badgeColor: 'bg-[#245C35]',
        },
        {
          id: 'follow-ups',
          label: 'Reminders Queue',
          sublabel: 'Scheduled Execution',
          icon: CalendarClock,
        },
      ],
    },
    {
      group: 'LOAN LEDGER & OPS',
      items: [
        {
          id: 'loans',
          label: 'Loan Accounts',
          sublabel: 'Active Portfolio',
          icon: CreditCard,
        },
        {
          id: 'payments',
          label: 'Payments Ledger',
          sublabel: 'Receipts & Proofs',
          icon: CreditCard,
        },
        {
          id: 'escalations',
          label: 'Escalations',
          sublabel: 'Supervisor Reviews',
          icon: ShieldAlert,
          badge: pendingEscalationsCount > 0 ? pendingEscalationsCount : undefined,
          badgeColor: 'bg-[#D97706]',
        },
        {
          id: 'rag-knowledge',
          label: 'Policy Knowledge Hub',
          sublabel: 'RAG Retrieval Engine',
          icon: BookOpen,
          isAi: true,
        },
        {
          id: 'reports',
          label: 'Audit Reports',
          sublabel: 'Delinquency Ledgers',
          icon: FileSpreadsheet,
        },
        {
          id: 'settings',
          label: 'Configuration',
          sublabel: 'Thresholds & API Keys',
          icon: Settings,
        },
      ],
    },
  ];

  const renderContent = (inMobile = false) => {
    const collapsed = inMobile ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full bg-white text-[#171A17] select-none border-r border-[#E7EBE3]">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E7EBE3] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#245C35] text-[#B5F078] flex items-center justify-center font-bold font-heading shadow-sm shrink-0">
              RX
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#171A17] text-base tracking-tight font-heading">
                    RepayX
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-[#EDF5E5] text-[#245C35] border border-[#D1E8BC]">
                    FINTECH
                  </span>
                </div>
                <p className="text-[10px] text-[#777E77] truncate leading-none mt-0.5 font-medium">
                  Loan Recovery Intelligence
                </p>
              </div>
            )}
          </div>

          {/* Close button inside mobile slideover */}
          {inMobile && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 text-[#777E77] hover:text-[#171A17] rounded-lg hover:bg-[#F5F7F3] cursor-pointer transition-colors"
              title="Close drawer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Desktop collapse/close button in header */}
          {!inMobile && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 text-[#777E77] hover:text-[#171A17] rounded-lg hover:bg-[#F5F7F3] cursor-pointer transition-colors"
              title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Close sidebar (Ctrl+B)'}
              aria-label={collapsed ? 'Expand sidebar' : 'Close sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Quick Outbound Message Action Button in Sidebar */}
        {!collapsed && (
          <div className="p-3 border-b border-[#E7EBE3] shrink-0">
            <button
              onClick={() => {
                if (onOpenSendMessage) onOpenSendMessage();
                else onSelectTab('whatsapp');
                if (inMobile && onCloseMobile) onCloseMobile();
              }}
              className="w-full py-2.5 px-3 bg-[#245C35] hover:bg-[#1B4728] active:bg-[#14351E] text-white rounded-xl text-xs font-bold font-heading shadow-md shadow-[#245C35]/15 flex items-center justify-center gap-2 transition-all cursor-pointer group"
            >
              <Send className="w-3.5 h-3.5 text-[#B5F078] group-hover:scale-110 transition-transform" />
              <span>Send New Reminder</span>
            </button>
          </div>
        )}

        {/* Navigation Links Scroll Container */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {navSections.map((section) => (
            <div key={section.group} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-bold text-[#777E77] uppercase tracking-wider mb-1">
                  {section.group}
                </div>
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <div key={item.id} className="relative group">
                    <button
                      onClick={() => {
                        onSelectTab(item.id);
                        if (inMobile && onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#EDF5E5] text-[#245C35] font-bold shadow-2xs'
                          : 'text-[#777E77] hover:bg-[#F5F7F3] hover:text-[#171A17]'
                      } ${collapsed ? 'justify-center px-2' : ''}`}
                    >
                      <div className="relative shrink-0">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive
                              ? 'text-[#245C35]'
                              : item.isAi
                              ? 'text-[#245C35]'
                              : 'text-[#777E77] group-hover:text-[#171A17]'
                          }`}
                        />
                        {/* Dot indicator if collapsed has badge */}
                        {collapsed && item.badge !== undefined && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#E11D48] ring-2 ring-white" />
                        )}
                      </div>

                      {!collapsed && (
                        <div className="flex-1 text-left min-w-0 flex items-center justify-between">
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-2xs ${
                                item.badgeColor || 'bg-[#245C35]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Floating Tooltip for Collapsed Desktop Mode */}
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-[#171A17] text-white text-xs font-bold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="text-[10px] bg-[#245C35] px-1.5 py-0.2 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Manager Profile & Collapse Footer */}
        <div className="p-3 border-t border-[#E7EBE3] bg-[#F5F7F3]/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={MANAGER_PROFILE.avatar}
                alt={MANAGER_PROFILE.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#245C35]/30"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <div className="w-9 h-9 rounded-full bg-[#245C35] text-[#B5F078] font-bold flex items-center justify-center text-xs -z-10 absolute inset-0">
                PS
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#16A34A] rounded-full ring-2 ring-white" />
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#171A17] font-heading truncate">
                  {MANAGER_PROFILE.name}
                </div>
                <div className="text-[10px] text-[#777E77] truncate leading-none mt-0.5">
                  {MANAGER_PROFILE.role}
                </div>
              </div>
            )}
          </div>

          {!inMobile && !collapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-[#777E77] hover:text-[#171A17] rounded-lg hover:bg-white cursor-pointer transition-colors shadow-2xs"
              title="Collapse sidebar (Ctrl+B)"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside
        className={`hidden md:block fixed top-0 left-0 bottom-0 z-30 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderContent(false)}
      </aside>

      {/* 2. Mobile Responsive Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
