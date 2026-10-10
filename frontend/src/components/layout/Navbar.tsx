import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Sparkles,
  ChevronDown,
  Calendar,
  X,
  CreditCard,
  User,
  MessageSquare,
  Menu,
  Plus,
  HelpCircle,
  Send,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { MANAGER_PROFILE, INITIAL_NOTIFICATIONS } from '../../data/mockData';
import { NotificationItem, Customer, Loan, Conversation } from '../../types';
import { SendMessageModal } from '../common/SendMessageModal';
import { HowToUseModal } from '../common/HowToUseModal';

interface NavbarProps {
  pageTitle: string;
  breadcrumb: string;
  onOpenAiAssistant: () => void;
  onNavigate: (tab: string, targetId?: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  onComposeNewMessage?: () => void;
  customers: Customer[];
  loans: Loan[];
  conversations: Conversation[];
  onDirectSendMessage?: (data: {
    customerId: string;
    customerName: string;
    channel: 'WhatsApp' | 'SMS';
    messageText: string;
  }) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  pageTitle,
  breadcrumb,
  onOpenAiAssistant,
  onNavigate,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenMobileMenu,
  onComposeNewMessage,
  customers,
  loans,
  conversations,
  onDirectSendMessage,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Global message & guide modals
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Keyboard shortcut: Cmd+K / Ctrl+K or '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSearchResults(true);
      } else if (e.key === 'Escape') {
        setShowSearchResults(false);
        setShowNotifications(false);
        setShowUserMenu(false);
        setShowMobileSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markItemAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const q = searchQuery.toLowerCase().trim();
  const matchedCustomers = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.phone.includes(q)
      )
    : [];

  const matchedLoans = q
    ? loans.filter(
        (l) =>
          l.id.toLowerCase().includes(q) ||
          l.customerName.toLowerCase().includes(q) ||
          l.loanType.toLowerCase().includes(q)
      )
    : [];

  const hasSearchResults = q.length > 0 && (matchedCustomers.length > 0 || matchedLoans.length > 0);

  return (
    <header className="h-16 px-3.5 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/90 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile hamburger + Desktop sidebar toggle + Page Title & Breadcrumb */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/60 shadow-2xs"
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Desktop Sidebar Toggle / Close button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/60 shadow-2xs items-center justify-center gap-1.5"
            title={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Close sidebar (Ctrl+B)"}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Close sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[#516072]" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-600" />
            )}
          </button>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 font-heading tracking-tight leading-none truncate">
              {pageTitle}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Engine</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
            <span className="font-medium text-slate-400">LoanFlow</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#516072] font-bold truncate">{breadcrumb}</span>
          </div>
        </div>
      </div>

      {/* Right Controls: Search, Quick Actions, Notifications, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Mobile Search Button */}
        <button
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Search loans and borrowers"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Desktop Global Search Bar */}
        <div ref={searchRef} className="relative hidden md:block w-52 lg:w-72">
          <div className="relative group">
            <Search className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-[#516072] absolute left-3 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search borrower or loan ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full pl-9 pr-14 py-1.5 bg-slate-50 hover:bg-slate-100/90 focus:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#516072] focus:border-transparent transition-all shadow-2xs"
            />
            
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200/70 text-[10px] font-bold text-slate-500 font-num">
                <span>⌘</span>
                <span>K</span>
              </div>
            )}
          </div>

          {/* Search Dropdown with Live Filtering */}
          {showSearchResults && (
            <div className="absolute right-0 mt-2 w-88 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="p-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {q ? `Search results for "${q}"` : 'Quick Jump Navigator'}
                </span>
                {q && (
                  <span className="text-[10px] font-semibold text-[#516072]">
                    {matchedCustomers.length + matchedLoans.length} matches
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 p-1">
                {hasSearchResults ? (
                  <>
                    {matchedCustomers.length > 0 && (
                      <div className="p-1">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Borrowers
                        </div>
                        {matchedCustomers.map((cust) => (
                          <div
                            key={cust.id}
                            onClick={() => {
                              onNavigate('customers', cust.id);
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                            className="p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[#516072]/15 text-[#516072] font-bold text-xs flex items-center justify-center shrink-0">
                                {cust.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {cust.name}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {cust.phone} · ID: {cust.id}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[#516072] bg-[#516072]/10 px-2 py-0.5 rounded-full shrink-0">
                              View
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {matchedLoans.length > 0 && (
                      <div className="p-1">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Loans
                        </div>
                        {matchedLoans.map((loan) => (
                          <div
                            key={loan.id}
                            onClick={() => {
                              onNavigate('loans');
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                            className="p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-colors"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {loan.id} · {loan.customerName}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {loan.loanType} · ₹{loan.outstanding.toLocaleString()} outstanding
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                loan.daysOverdue > 0
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {loan.daysOverdue > 0 ? `${loan.daysOverdue} DPD` : 'Current'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : q ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No matching borrower or loan found for &quot;{searchQuery}&quot;.
                  </div>
                ) : (
                  <div className="p-3 text-xs text-slate-500 space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">
                      Suggested Shortcuts
                    </div>
                    <div
                      onClick={() => {
                        onNavigate('follow-ups');
                        setShowSearchResults(false);
                      }}
                      className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between"
                    >
                      <span>Jump to Today&apos;s Follow-ups</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div
                      onClick={() => {
                        onNavigate('escalations');
                        setShowSearchResults(false);
                      }}
                      className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between"
                    >
                      <span>Review Pending Escalations</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* How to use button */}
        <button
          onClick={() => setIsHowToUseOpen(true)}
          className="hidden sm:flex px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/90 rounded-xl transition-all cursor-pointer items-center gap-1.5 shadow-2xs"
          title="Quick guide & workflow instructions"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#516072]" />
          <span>Guide</span>
        </button>

        {/* Primary Outbound "New Message" Action Button */}
        <button
          onClick={() => {
            if (onComposeNewMessage) onComposeNewMessage();
            else setIsSendMessageOpen(true);
          }}
          className="px-3 sm:px-4 py-1.5 text-xs font-bold text-white bg-[#516072] hover:bg-[#414D5C] active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 font-heading"
          title="Compose and send an outbound EMI reminder or payment link"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">New Message</span>
          <span className="xs:hidden">Send</span>
        </button>

        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200/60"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 font-heading">
                    Live Alerts & Escalations
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-[#516072] hover:text-[#354352] cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markItemAsRead(n.id);
                      if (n.linkTab) {
                        onNavigate(n.linkTab, n.targetId);
                        setShowNotifications(false);
                      }
                    }}
                    className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                      !n.read ? 'bg-[#516072]/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {n.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Manager Avatar & Profile Menu */}
        <div ref={userMenuRef} className="relative pl-1 sm:pl-2 border-l border-slate-200/90">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Account profile"
          >
            <div className="relative">
              <img
                src={MANAGER_PROFILE.avatar}
                alt={MANAGER_PROFILE.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-[#516072]/40"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-none">
                {MANAGER_PROFILE.name}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-none">
                Chief Recovery Officer
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden xl:block" />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900 font-heading">
                  {MANAGER_PROFILE.name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {MANAGER_PROFILE.email}
                </div>
                <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#516072]/10 text-[#516072]">
                  Level 3 Supervisor
                </span>
              </div>

              <div className="py-1 text-xs text-slate-700 space-y-0.5">
                <button
                  onClick={() => {
                    onNavigate('settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <span>System Settings</span>
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    onNavigate('rag-knowledge');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <span>Knowledge Base & SOP</span>
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    setIsHowToUseOpen(true);
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <span>Workflow Guide</span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay Drawer */}
      {showMobileSearch && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-white border-b border-slate-200 p-3 shadow-lg z-40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search borrower or loan ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#516072]"
            />
            <button
              onClick={() => {
                setShowMobileSearch(false);
                setSearchQuery('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {searchQuery && (
            <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-slate-100">
              {matchedCustomers.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => {
                    onNavigate('customers', cust.id);
                    setShowMobileSearch(false);
                    setSearchQuery('');
                  }}
                  className="py-2 px-1 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900">{cust.name}</span>
                    <span className="text-[10px] text-slate-500 block">{cust.phone}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#516072]">View</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Global Outbound Send Message Modal */}
      <SendMessageModal
        isOpen={isSendMessageOpen}
        onClose={() => setIsSendMessageOpen(false)}
        customers={customers}
        loans={loans}
        onSendMessageSuccess={(data) => {
          if (onDirectSendMessage) {
            onDirectSendMessage(data);
          } else {
            onNavigate('conversations');
          }
        }}
      />

      {/* Global How to Use Modal */}
      <HowToUseModal
        isOpen={isHowToUseOpen}
        onClose={() => setIsHowToUseOpen(false)}
        onOpenSendMessage={() => setIsSendMessageOpen(true)}
        onNavigateToMessages={() => onNavigate('conversations')}
      />
    </header>
  );
};
