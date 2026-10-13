import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  Paperclip,
  CheckCheck,
  Edit3,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Search,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  X,
  CreditCard,
  Plus,
  HelpCircle,
} from 'lucide-react';
import { Conversation, Customer, Loan } from '../../types';
import { useToast } from '../common/Toast';
import { SendMessageModal } from '../common/SendMessageModal';
import { HowToUseModal } from '../common/HowToUseModal';

interface ConversationViewProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  customers: Customer[];
  loans: Loan[];
  onScheduleFollowup: (followup: {
    customerId: string;
    customerName: string;
    loanId: string;
    scheduledAt: string;
    scheduledTime: string;
    aiReason: string;
  }) => void;
  onNavigateToCustomer: (customerId: string) => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  customers,
  loans,
  onScheduleFollowup,
  onNavigateToCustomer,
}) => {
  const { addToast } = useToast();

  const [conversationList, setConversationList] = useState<Conversation[]>(conversations);
  const [chatInputText, setChatInputText] = useState('');
  const [searchInbox, setSearchInbox] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'overdue' | 'promises'>('all');
  const [activeChannel, setActiveChannel] = useState<'WhatsApp' | 'SMS'>('WhatsApp');
  const [showRightDetails, setShowRightDetails] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Modals
  const [isSendMessageModalOpen, setIsSendMessageModalOpen] = useState(false);
  const [isHowToUseModalOpen, setIsHowToUseModalOpen] = useState(false);

  // Active conversation
  const currentConv =
    conversationList.find((c) => c.id === activeConversationId) || conversationList[0];
  const currentCustomer = customers.find((c) => c.id === currentConv?.customerId);
  const currentLoan = loans.find((l) => l.id === currentConv?.loanId);

  // Suggested response state
  const [suggestedText, setSuggestedText] = useState(
    currentConv?.aiAnalysis?.aiSuggestedResponse || ''
  );

  // Followup scheduling state
  const [scheduleDate, setScheduleDate] = useState(
    currentConv?.aiAnalysis?.suggestedFollowupDate || '2026-09-30'
  );
  const [scheduleTime, setScheduleTime] = useState(
    currentConv?.aiAnalysis?.suggestedFollowupTime || '10:00 AM'
  );
  const [scheduleReason, setScheduleReason] = useState(
    currentConv?.aiAnalysis?.reason || 'Payment Delay Follow-up'
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConv?.messages?.length, activeConversationId]);

  // Sync state when active conversation changes
  useEffect(() => {
    if (currentConv) {
      setSuggestedText(currentConv.aiAnalysis?.aiSuggestedResponse || '');
      setScheduleDate(currentConv.aiAnalysis?.suggestedFollowupDate || '2026-09-30');
      setScheduleTime(currentConv.aiAnalysis?.suggestedFollowupTime || '10:00 AM');
      setScheduleReason(currentConv.aiAnalysis?.reason || 'Payment Delay Follow-up');
    }
  }, [currentConv?.id]);

  // Handle manual message send from bottom composer
  const handleSendManualMessage = () => {
    if (!chatInputText.trim() || !currentConv) return;

    const newMsg = {
      id: `M-${Date.now()}`,
      sender: 'manager' as const,
      text: chatInputText.trim(),
      timestamp: 'Today, Just now',
      isApprovedByManager: true,
      status: 'sent' as const,
    };

    setConversationList((prev) =>
      prev.map((c) => {
        if (c.id === currentConv.id) {
          return {
            ...c,
            channel: activeChannel,
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    setChatInputText('');
    addToast({
      type: 'success',
      title: `Message Sent via ${activeChannel}`,
      message: `Delivered to ${currentConv.customerName} (${currentConv.customerPhone})`,
    });
  };

  // Quick 1-tap chip insertion
  const handleInsertQuickChip = (text: string) => {
    setChatInputText(text);
  };

  // Approve & send AI suggested response directly
  const handleSendAiSuggestedDirectly = () => {
    if (!currentConv || !suggestedText) return;

    const newMsg = {
      id: `M-${Date.now()}`,
      sender: 'ai' as const,
      text: suggestedText,
      timestamp: 'Today, Just now',
      isApprovedByManager: true,
      status: 'sent' as const,
    };

    setConversationList((prev) =>
      prev.map((c) => {
        if (c.id === currentConv.id) {
          return {
            ...c,
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    addToast({
      type: 'success',
      title: 'AI Response Approved & Sent',
      message: `Dispatched to ${currentConv.customerName} via ${currentConv.channel}`,
    });
  };

  // Schedule follow-up
  const handleConfirmFollowup = () => {
    if (!currentConv) return;
    onScheduleFollowup({
      customerId: currentConv.customerId,
      customerName: currentConv.customerName,
      loanId: currentConv.loanId,
      scheduledAt: scheduleDate,
      scheduledTime: scheduleTime,
      aiReason: scheduleReason,
    });

    addToast({
      type: 'success',
      title: 'Follow-up Scheduled',
      message: `Reminder set for ${currentConv.customerName} on ${scheduleDate} at ${scheduleTime}.`,
    });
  };

  // Handle outbound message sent from modal
  const handleOutboundMessageCreated = (data: {
    customerId: string;
    customerName: string;
    channel: 'WhatsApp' | 'SMS';
    messageText: string;
  }) => {
    const existing = conversationList.find((c) => c.customerId === data.customerId);
    const newMsg = {
      id: `M-${Date.now()}`,
      sender: 'manager' as const,
      text: data.messageText,
      timestamp: 'Today, Just now',
      isApprovedByManager: true,
      status: 'sent' as const,
    };

    if (existing) {
      setConversationList((prev) =>
        prev.map((c) => (c.id === existing.id ? { ...c, messages: [...c.messages, newMsg] } : c))
      );
      onSelectConversation(existing.id);
      setMobileView('chat');
    } else {
      const custLoan = loans.find((l) => l.customerId === data.customerId);
      const newConv: Conversation = {
        id: `CONV-${Date.now()}`,
        loanId: custLoan?.id || 'LN1001',
        customerId: data.customerId,
        customerName: data.customerName,
        customerPhone: customers.find((c) => c.id === data.customerId)?.phone || '+91 98765 00000',
        customerAvatar: customers.find((c) => c.id === data.customerId)?.avatar || '',
        lastMessageTime: 'Just now',
        unread: false,
        channel: data.channel,
        messages: [newMsg],
        aiAnalysis: {
          detectedIntent: 'PAYMENT_PROMISE',
          reason: 'Manager Outreach',
          paymentPromise: false,
          promisedTimeline: 'Awaiting response',
          recommendedAction: 'Wait for customer reply',
          confidence: 90,
          ragContext: {
            policyTitle: 'Outreach SOP',
            relevantSection: 'Manager sent outbound reminder.',
            sourceFile: 'recovery_sop.pdf',
            chunkId: 'CHUNK-NEW',
            relevanceScore: 90,
          },
          aiSuggestedResponse: `Follow up tomorrow with ${data.customerName}`,
          requiresManagerApproval: false,
          attemptCount: 1,
        },
      };
      setConversationList([newConv, ...conversationList]);
      onSelectConversation(newConv.id);
      setMobileView('chat');
    }
  };

  // Filter conversations
  const filteredConversations = conversationList.filter((conv) => {
    const matchSearch =
      conv.customerName.toLowerCase().includes(searchInbox.toLowerCase()) ||
      conv.customerPhone.includes(searchInbox) ||
      conv.loanId.toLowerCase().includes(searchInbox.toLowerCase());

    if (!matchSearch) return false;

    if (filterType === 'unread') return conv.unread;
    if (filterType === 'overdue') {
      const l = loans.find((item) => item.id === conv.loanId);
      return l && l.daysOverdue > 0;
    }
    if (filterType === 'promises') {
      return (
        conv.aiAnalysis?.detectedIntent === 'PAYMENT_PROMISE' ||
        conv.aiAnalysis?.detectedIntent === 'PAYMENT_DELAY'
      );
    }
    return true;
  });

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top Action Ribbon */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#516072] text-white flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Customer Messaging & WhatsApp Hub
            </h2>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Send messages directly from your end, view replies, and approve AI suggested answers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHowToUseModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#516072]" />
            <span className="hidden sm:inline">How to use</span>
          </button>

          <button
            onClick={() => setIsSendMessageModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#516072] hover:bg-[#43505F] rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Send New Message</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Work Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUMN 1: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-84 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0 ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search & Filters */}
          <div className="p-3 border-b border-slate-200 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search borrower by name, phone..."
                value={searchInbox}
                onChange={(e) => setSearchInbox(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#516072]"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg text-[11px] font-medium text-slate-600">
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 py-1 text-center rounded-md transition-colors cursor-pointer ${
                  filterType === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('overdue')}
                className={`flex-1 py-1 text-center rounded-md transition-colors cursor-pointer ${
                  filterType === 'overdue' ? 'bg-white text-rose-700 font-bold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Overdue
              </button>
              <button
                onClick={() => setFilterType('promises')}
                className={`flex-1 py-1 text-center rounded-md transition-colors cursor-pointer ${
                  filterType === 'promises' ? 'bg-white text-amber-700 font-bold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Promises
              </button>
              <button
                onClick={() => setFilterType('unread')}
                className={`flex-1 py-1 text-center rounded-md transition-colors cursor-pointer ${
                  filterType === 'unread' ? 'bg-white text-[#516072] font-bold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          {/* Conversation Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.map((conv) => {
              const isSelected = conv.id === currentConv?.id;
              const lastMsg = conv.messages[conv.messages.length - 1];
              const matchLoan = loans.find((l) => l.id === conv.loanId);

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    setMobileView('chat');
                  }}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? 'bg-[#516072]/10 border-l-4 border-[#516072]'
                      : 'hover:bg-slate-100/70 bg-white'
                  }`}
                >
                  <div className="relative shrink-0">
                    {conv.customerAvatar ? (
                      <img
                        src={conv.customerAvatar}
                        alt={conv.customerName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {conv.customerName.charAt(0)}
                      </div>
                    )}
                    {conv.unread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#516072] rounded-full border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {conv.customerName}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {conv.lastMessageTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-semibold text-slate-500">
                        ₹{matchLoan ? matchLoan.outstanding.toLocaleString('en-IN') : '8,500'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          matchLoan && matchLoan.daysOverdue > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {matchLoan && matchLoan.daysOverdue > 0
                          ? `${matchLoan.daysOverdue}D Late`
                          : 'Due Today'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 truncate mt-1">
                      {lastMsg ? lastMsg.text : 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: Chat Transcript & Composer */}
        <div
          className={`flex-1 flex flex-col bg-white min-w-0 ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                {currentConv?.customerAvatar ? (
                  <img
                    src={currentConv.customerAvatar}
                    alt={currentConv.customerName}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                    {currentConv?.customerName?.charAt(0) || 'C'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {currentConv?.customerName}
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    WhatsApp Connected
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>{currentConv?.customerPhone}</span>
                  <span>·</span>
                  <span>Loan {currentConv?.loanId}</span>
                  <span>·</span>
                  <span className="font-semibold text-rose-600">
                    ₹{currentLoan?.outstanding.toLocaleString('en-IN')} Due
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRightDetails(!showRightDetails)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-semibold border border-slate-200 hidden lg:flex items-center gap-1.5 cursor-pointer"
                title="Toggle Borrower Details"
              >
                <User className="w-3.5 h-3.5" />
                <span>{showRightDetails ? 'Hide Info' : 'Show Info'}</span>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
            {currentConv?.messages.map((msg) => {
              const isMe = msg.sender === 'manager' || msg.sender === 'ai';
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {currentConv.customerName.charAt(0)}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-2.5 shadow-xs text-xs sm:text-sm ${
                      isMe
                        ? 'bg-[#516072] text-white rounded-br-xs'
                        : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] mb-1 opacity-80">
                      <span className="font-semibold">
                        {isMe ? (msg.sender === 'ai' ? 'LoanFlow AI' : 'Priya (Manager)') : currentConv.customerName}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                    {isMe && (
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-200">
                        <span>Delivered via {currentConv.channel}</span>
                        <CheckCheck className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* AI Suggested Response Banner (If available) */}
          {suggestedText && (
            <div className="px-4 py-3 bg-purple-50/80 border-t border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                    <span>AI Suggested Reply</span>
                    <span className="text-[10px] bg-purple-200/70 text-purple-800 px-1.5 py-0.2 rounded font-semibold">
                      Policy Approved
                    </span>
                  </div>
                  <p className="text-xs text-purple-800 truncate mt-0.5">{suggestedText}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setChatInputText(suggestedText)}
                  className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold text-purple-800 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer transition-colors"
                >
                  Edit in Box
                </button>
                <button
                  type="button"
                  onClick={handleSendAiSuggestedDirectly}
                  className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  Send Now
                </button>
              </div>
            </div>
          )}

          {/* Message Composer Area */}
          <div className="p-3 sm:p-4 border-t border-slate-200 bg-white space-y-2.5">
            {/* Quick 1-tap chip templates */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">1-Tap:</span>
              <button
                type="button"
                onClick={() =>
                  handleInsertQuickChip(
                    `Dear ${currentConv?.customerName}, here is your verified UPI repayment link: https://pay.loanflow.internal/upi/${currentConv?.loanId}. Pay with Google Pay/PhonePe.`
                  )
                }
                className="px-2.5 py-1 bg-slate-100 hover:bg-[#516072]/15 hover:text-[#252E38] text-slate-700 rounded-lg border border-slate-200 text-xs shrink-0 cursor-pointer transition-colors font-medium"
              >
                💳 UPI Pay Link
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertQuickChip(
                    `Hello ${currentConv?.customerName}, could you please let us know when your salary will be credited so we can update your loan repayment date?`
                  )
                }
                className="px-2.5 py-1 bg-slate-100 hover:bg-[#516072]/15 hover:text-[#252E38] text-slate-700 rounded-lg border border-slate-200 text-xs shrink-0 cursor-pointer transition-colors font-medium"
              >
                📅 Ask Salary Date
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertQuickChip(
                    `Hello ${currentConv?.customerName}, we have noted your delay request and approved a 5-day extension until 30 September without penalty.`
                  )
                }
                className="px-2.5 py-1 bg-slate-100 hover:bg-[#516072]/15 hover:text-[#252E38] text-slate-700 rounded-lg border border-slate-200 text-xs shrink-0 cursor-pointer transition-colors font-medium"
              >
                ⏳ 5-Day Extension
              </button>
            </div>

            {/* Input bar + Send button */}
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-slate-50 border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-[#516072] focus-within:bg-white transition-all">
                <textarea
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendManualMessage();
                    }
                  }}
                  rows={2}
                  placeholder={`Type your message to ${currentConv?.customerName}... (Press Enter to send)`}
                  className="w-full px-3.5 py-2.5 bg-transparent border-0 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
                />

                <div className="px-3 py-1.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-600">Send via:</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="channel"
                        checked={activeChannel === 'WhatsApp'}
                        onChange={() => setActiveChannel('WhatsApp')}
                        className="accent-[#516072]"
                      />
                      <span className="text-[11px] font-medium text-emerald-700">WhatsApp</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="channel"
                        checked={activeChannel === 'SMS'}
                        onChange={() => setActiveChannel('SMS')}
                        className="accent-[#516072]"
                      />
                      <span className="text-[11px] font-medium text-slate-600">SMS</span>
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    Enter ↵ to send
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendManualMessage}
                disabled={!chatInputText.trim()}
                className="h-11 px-4 sm:px-5 bg-[#516072] hover:bg-[#414E5E] disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN 3: Right Context Drawer */}
        {showRightDetails && currentCustomer && currentLoan && (
          <div className="hidden lg:flex w-76 xl:w-80 border-l border-slate-200 bg-slate-50/40 p-4 flex-col overflow-y-auto space-y-4 shrink-0">
            {/* Customer Summary Card */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Borrower Card
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    currentLoan.daysOverdue > 0
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {currentLoan.daysOverdue > 0
                    ? `${currentLoan.daysOverdue} Days Overdue`
                    : 'Due Today'}
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">{currentCustomer.name}</h4>
                <p className="text-xs text-slate-500">Phone: {currentCustomer.phone}</p>
                <p className="text-xs text-slate-500">Loan ID: {currentLoan.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Loan</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    ₹{currentLoan.principal.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-2 bg-rose-50/70 rounded-lg border border-rose-100">
                  <div className="text-[10px] text-rose-700 font-semibold uppercase">Outstanding</div>
                  <div className="text-xs font-bold text-rose-700 mt-0.5">
                    ₹{currentLoan.outstanding.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateToCustomer(currentCustomer.id)}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>View Full Ledger</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* AI Intent & Reason */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#516072]">
                <Sparkles className="w-3.5 h-3.5 text-[#516072]" />
                <span>AI Intent Analysis</span>
              </div>
              <div className="p-2.5 bg-[#516072]/10 rounded-lg border border-[#516072]/20">
                <div className="text-[11px] font-bold text-[#2A3440]">
                  {currentConv?.aiAnalysis?.detectedIntent || 'PAYMENT_DELAY'}
                </div>
                <p className="text-[11px] text-[#3F4D5C] mt-1 leading-relaxed">
                  {currentConv?.aiAnalysis?.reason || 'Customer stated delay in salary credit.'}
                </p>
              </div>
            </div>

            {/* 1-Click Follow-up Scheduler */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Calendar className="w-3.5 h-3.5 text-[#516072]" />
                <span>Set Follow-up Reminder</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#516072]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Time</label>
                  <input
                    type="text"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#516072]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmFollowup}
                className="w-full py-2 bg-[#516072] hover:bg-[#414E5E] text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Schedule Reminder
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Outbound Send Message Modal */}
      <SendMessageModal
        isOpen={isSendMessageModalOpen}
        onClose={() => setIsSendMessageModalOpen(false)}
        customers={customers}
        loans={loans}
        preselectedCustomerId={currentCustomer?.id}
        onSendMessageSuccess={handleOutboundMessageCreated}
      />

      {/* How to use quick guide modal */}
      <HowToUseModal
        isOpen={isHowToUseModalOpen}
        onClose={() => setIsHowToUseModalOpen(false)}
        onOpenSendMessage={() => setIsSendMessageModalOpen(true)}
        onNavigateToMessages={() => {}}
      />
    </div>
  );
};
