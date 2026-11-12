import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  MessageSquare,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
  ChevronDown,
  Mail,
  ShieldAlert,
  CreditCard,
  PieChart,
  Wallet,
  LineChart,
  BookOpen,
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
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeColor?: string;
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
}) => {
  const [showMoreOps, setShowMoreOps] = useState(false);

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

  // Primary 6 navigation tabs matching the inspiration design
  const primaryNavItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
    },
    {
      id: 'automation',
      label: 'Reminders',
      icon: CalendarClock,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeColor: 'bg-[#198754]',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileSpreadsheet,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  // Secondary advanced feature destinations to maintain 100% route functionality
  const secondaryNavItems: NavItem[] = [
    { id: 'risk-analytics', label: 'Risk Analytics', icon: PieChart },
    { id: 'repayment-analytics', label: 'Repayment Analytics', icon: Wallet },
    { id: 'ai-insights', label: 'AI Insights', icon: LineChart },
    {
      id: 'conversations',
      label: 'Omnichannel Messages',
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeColor: 'bg-[#198754]',
    },
    { id: 'follow-ups', label: 'Reminders Queue', icon: CalendarClock },
    { id: 'loans', label: 'Loan Accounts', icon: CreditCard },
    { id: 'payments', label: 'Payments Ledger', icon: CreditCard },
    {
      id: 'escalations',
      label: 'Escalations',
      icon: ShieldAlert,
      badge: pendingEscalationsCount > 0 ? pendingEscalationsCount : undefined,
      badgeColor: 'bg-[#D97706]',
    },
    { id: 'rag-knowledge', label: 'Policy Knowledge Hub', icon: BookOpen },
  ];

  const renderContent = (inMobile = false) => {
    const collapsed = inMobile ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full bg-white text-[#202B25] select-none border-r border-[#E5EBE7]">
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Green 'R' Brand Icon */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#198754] to-[#157347] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0 tracking-tighter">
              R
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#202B25] text-lg tracking-tight font-heading">
                    RepayX
                  </span>
                </div>
                <p className="text-[11px] text-[#77827B] truncate leading-none mt-0.5 font-medium">
                  Loan Recovery AI
                </p>
              </div>
            )}
          </div>

          {/* Close button inside mobile slideover */}
          {inMobile && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 text-[#77827B] hover:text-[#202B25] rounded-xl hover:bg-[#F7FAF8] cursor-pointer transition-colors"
              title="Close drawer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Desktop collapse/expand button */}
          {!inMobile && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 text-[#77827B] hover:text-[#202B25] rounded-xl hover:bg-[#F7FAF8] cursor-pointer transition-colors"
              title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Primary Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => {
                    onSelectTab(item.id);
                    if (inMobile && onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#EAF5ED] text-[#198754] font-bold shadow-2xs'
                      : 'text-[#77827B] hover:bg-[#F7FAF8] hover:text-[#202B25]'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                >
                  <div className="relative shrink-0">
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? 'text-[#198754]' : 'text-[#77827B] group-hover:text-[#202B25]'
                      }`}
                    />
                    {collapsed && item.badge !== undefined && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#198754] ring-2 ring-white" />
                    )}
                  </div>

                  {!collapsed && (
                    <div className="flex-1 text-left min-w-0 flex items-center justify-between">
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-2xs ${
                            item.badgeColor || 'bg-[#198754]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>

                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-[#202B25] text-white text-xs font-bold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
                    <span>{item.label}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Advanced & Operations Dropdown (Preserving all routes) */}
          {!collapsed && (
            <div className="pt-3">
              <button
                onClick={() => setShowMoreOps(!showMoreOps)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-[#77827B] hover:text-[#202B25] uppercase tracking-wider rounded-xl hover:bg-[#F7FAF8] transition-colors cursor-pointer"
              >
                <span>Advanced Ledgers</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showMoreOps ? 'rotate-180 text-[#198754]' : ''
                  }`}
                />
              </button>

              {showMoreOps && (
                <div className="mt-1 space-y-1 pl-1 border-l-2 border-[#E5EBE7] ml-3 animate-in fade-in duration-150">
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectTab(item.id);
                          if (inMobile && onCloseMobile) onCloseMobile();
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#EAF5ED] text-[#198754] font-bold'
                            : 'text-[#77827B] hover:bg-[#F7FAF8] hover:text-[#202B25]'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#198754]' : 'text-[#77827B]'}`} />
                        <span className="truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="ml-auto text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#198754] text-white">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Smarter Recovery Banner Widget (Matching Inspiration Image) */}
        {!collapsed && (
          <div className="p-3 mx-3 mb-2 rounded-2xl bg-gradient-to-br from-[#EAF5ED] via-[#F1F8F3] to-[#E2F0E6] border border-[#D5E6D9] relative overflow-hidden shrink-0">
            {/* Subtle organic wavy background accents */}
            <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-[#198754]/10 blur-sm pointer-events-none" />
            <div className="relative z-10 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#198754] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <TrendingUp className="w-4 h-4 text-[#A3E635]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#202B25] leading-snug">
                  Smarter Recovery.
                </p>
                <p className="text-[11px] font-medium text-[#198754] leading-snug">
                  Stronger Business.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* User Profile Footer (Matching Inspiration Image) */}
        <div className="p-3.5 border-t border-[#E5EBE7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={MANAGER_PROFILE.avatar}
                alt={MANAGER_PROFILE.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#198754]/20"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <div className="w-10 h-10 rounded-full bg-[#198754] text-white font-bold flex items-center justify-center text-xs -z-10 absolute inset-0">
                PP
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#198754] rounded-full ring-2 ring-white" />
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#202B25] font-heading truncate">
                  {MANAGER_PROFILE.name}
                </div>
                <div className="text-[11px] text-[#77827B] truncate leading-none mt-0.5 font-medium">
                  Admin
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <ChevronDown className="w-4 h-4 text-[#77827B] shrink-0" />
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
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
