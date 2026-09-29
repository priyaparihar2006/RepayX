import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Sparkles,
  CheckCheck,
  ExternalLink,
  ChevronDown,
  Building2,
  Calendar,
  X,
  CreditCard,
  User,
  MessageSquare,
} from 'lucide-react';
import { MANAGER_PROFILE, INITIAL_NOTIFICATIONS } from '../../data/mockData';
import { NotificationItem, Customer, Loan, Conversation } from '../../types';

interface NavbarProps {
  pageTitle: string;
  breadcrumb: string;
  onOpenAiAssistant: () => void;
  onNavigate: (tab: string, targetId?: string) => void;
  customers: Customer[];
  loans: Loan[];
  conversations: Conversation[];
}

export const Navbar: React.FC<NavbarProps> = ({
  pageTitle,
  breadcrumb,
  onOpenAiAssistant,
  onNavigate,
  customers,
  loans,
  conversations,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle outside clicks to close dropdowns
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

  // Filter search results
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

  const matchedConversations = q
    ? conversations.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.aiAnalysis.detectedIntent.toLowerCase().includes(q) ||
          c.messages.some((m) => m.text.toLowerCase().includes(q))
      )
    : [];

  const hasSearchResults =
    q.length > 0 &&
    (matchedCustomers.length > 0 || matchedLoans.length > 0 || matchedConversations.length > 0);

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>LoanFlow</span>
          <span>/</span>
          <span className="text-slate-600 font-medium">{breadcrumb}</span>
        </div>
        <h1 className="text-base font-semibold text-slate-900 tracking-tight leading-snug">
          {pageTitle}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Environment Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>DEMO ENVIRONMENT · 29 SEP 2026</span>
        </div>

        {/* Global Search Input */}
        <div className="relative" ref={searchRef}>
          <div className="flex items-center w-56 md:w-64 lg:w-72 bg-slate-100 hover:bg-slate-100/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 border border-transparent rounded-xl px-3 py-1.5 transition-all text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search customer, loan ID, phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 ml-1 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute top-full mt-1.5 right-0 w-80 md:w-96 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 max-h-96 overflow-y-auto">
              {hasSearchResults ? (
                <div className="space-y-3">
                  {matchedCustomers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                        Customers ({matchedCustomers.length})
                      </p>
                      <div className="space-y-1">
                        {matchedCustomers.slice(0, 3).map((cust) => (
                          <button
                            key={cust.id}
                            onClick={() => {
                              onNavigate('customers', cust.id);
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-blue-600" />
                              <span className="font-semibold text-slate-800">{cust.name}</span>
                              <span className="text-slate-500 text-[11px] font-mono">{cust.id}</span>
                            </div>
                            <span className="text-[11px] text-slate-500">{cust.city}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchedLoans.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                        Loans ({matchedLoans.length})
                      </p>
                      <div className="space-y-1">
                        {matchedLoans.slice(0, 3).map((loan) => (
                          <button
                            key={loan.id}
                            onClick={() => {
                              onNavigate('loans', loan.id);
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="font-semibold text-slate-800">{loan.id}</span>
                              <span className="text-slate-500 text-[11px]">{loan.customerName}</span>
                            </div>
                            <span className="font-mono text-[11px] font-semibold text-slate-700">
                              ₹{loan.outstanding.toLocaleString('en-IN')}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchedConversations.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                        Conversations & Intents ({matchedConversations.length})
                      </p>
                      <div className="space-y-1">
                        {matchedConversations.slice(0, 3).map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => {
                              onNavigate('conversations', conv.id);
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                              <span className="font-semibold text-slate-800">{conv.customerName}</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              {conv.aiAnalysis.detectedIntent}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No matching customer, loan, or conversation found for "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Assistant Quick Shortcut Button */}
        <button
          onClick={onOpenAiAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 transition-all text-xs font-semibold shadow-xs cursor-pointer"
          title="Open AI Recovery Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      markItemAsRead(item.id);
                      if (item.linkTab) {
                        onNavigate(item.linkTab, item.targetId);
                        setShowNotifications(false);
                      }
                    }}
                    className={`p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-start gap-3 ${
                      !item.read ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        item.type === 'promise'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.type === 'dispute'
                          ? 'bg-rose-100 text-rose-700'
                          : item.type === 'payment'
                          ? 'bg-blue-100 text-blue-700'
                          : item.type === 'rag'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.type === 'promise' && <CheckCheck className="w-3.5 h-3.5" />}
                      {item.type === 'dispute' && <X className="w-3.5 h-3.5" />}
                      {item.type === 'payment' && <CreditCard className="w-3.5 h-3.5" />}
                      {item.type === 'rag' && <Sparkles className="w-3.5 h-3.5" />}
                      {item.type === 'alert' && <Bell className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs ${!item.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
                <button
                  onClick={() => {
                    onNavigate('conversations');
                    setShowNotifications(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  View All Activity & Logs
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Manager Avatar Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
          >
            <img
              src={MANAGER_PROFILE.avatar}
              alt={MANAGER_PROFILE.name}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover ring-1 ring-blue-500/20"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-xs font-semibold text-slate-800 hidden md:inline">
              Priya Parihar
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50">
              <div className="px-2 py-2 border-b border-slate-100 mb-2">
                <p className="text-xs font-bold text-slate-900">{MANAGER_PROFILE.name}</p>
                <p className="text-[11px] text-slate-500">{MANAGER_PROFILE.role}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{MANAGER_PROFILE.email}</p>
              </div>

              <div className="space-y-1 text-xs">
                <button
                  onClick={() => {
                    onNavigate('settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Recovery Threshold Settings
                </button>
                <button
                  onClick={() => {
                    onNavigate('rag-knowledge');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Manage RAG SOP Documents
                </button>
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between px-2.5 py-1 text-[11px] text-slate-500">
                    <span>Role Level</span>
                    <span className="font-semibold text-slate-800">L3 Manager</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1 text-[11px] text-slate-500">
                    <span>Branch Hub</span>
                    <span className="font-semibold text-slate-800">Mumbai Central</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
