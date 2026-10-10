import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Shield,
  Phone,
  Paperclip,
  CheckCheck,
  Edit3,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  X,
  CreditCard,
  Building,
  Plus,
  Mail,
  MessageCircle,
  Bot,
  Play,
  Pause,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Ban,
  AtSign,
} from 'lucide-react';
import { Conversation, Customer, Loan, ChatMessage } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

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

const API_BASE = 'http://127.0.0.1:8000';

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
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<'all' | 'WhatsApp' | 'Email' | 'SMS'>('all');
  const [filterIntent, setFilterIntent] = useState<string>('all');
  const [searchInbox, setSearchInbox] = useState('');
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  // Composer reply state
  const [chatInputText, setChatInputText] = useState('');
  const [replyChannel, setReplyChannel] = useState<'WhatsApp' | 'Email' | 'SMS'>('WhatsApp');
  const [emailSubject, setEmailSubject] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Outbound New Message Modal state
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [newMsgCustomerId, setNewMsgCustomerId] = useState(customers[0]?.id || 'CUS001');
  const [newMsgChannel, setNewMsgChannel] = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp');
  const [newMsgTemplate, setNewMsgTemplate] = useState('reminder');
  const [newMsgSubject, setNewMsgSubject] = useState('Payment Reminder');
  const [newMsgCustomText, setNewMsgCustomText] = useState('');

  // Selected conversation
  const currentConv =
    conversationList.find((c) => c.id === activeConversationId) || conversationList[0];
  const currentCustomer = customers.find((c) => c.id === currentConv?.customerId);
  const currentLoan = loans.find((l) => l.id === currentConv?.loanId);

  // Suggested response edit state
  const [isEditingAiResponse, setIsEditingAiResponse] = useState(false);
  const [editedResponseText, setEditedResponseText] = useState(
    currentConv?.aiAnalysis?.aiSuggestedResponse || ''
  );

  // Follow-up scheduling form state
  const [scheduleDate, setScheduleDate] = useState(
    currentConv?.aiAnalysis?.suggestedFollowupDate || '2026-09-30'
  );
  const [scheduleTime, setScheduleTime] = useState(
    currentConv?.aiAnalysis?.suggestedFollowupTime || '10:00 AM'
  );
  const [scheduleReason, setScheduleReason] = useState(
    currentConv?.aiAnalysis?.reason || 'Payment Delay Follow-up'
  );
  const [scheduleAttempt, setScheduleAttempt] = useState(
    currentConv?.aiAnalysis?.attemptCount || 2
  );
  const [isFollowupScheduled, setIsFollowupScheduled] = useState(false);

  // RAG Source modal state
  const [isRagModalOpen, setIsRagModalOpen] = useState(false);

  // Fetch live conversations from FastAPI backend on mount
  useEffect(() => {
    let isMounted = true;
    const fetchLiveConversations = async () => {
      setIsLoadingApi(true);
      try {
        const res = await fetch(`${API_BASE}/api/conversations`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.conversations && data.conversations.length > 0) {
            setConversationList(data.conversations);
          }
        }
      } catch (err) {
        // Backend offline or local dev, fallback gracefully to props
      } finally {
        if (isMounted) setIsLoadingApi(false);
      }
    };
    fetchLiveConversations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync state when active conversation changes
  useEffect(() => {
    if (currentConv) {
      setEditedResponseText(currentConv.aiAnalysis?.aiSuggestedResponse || '');
      setScheduleDate(currentConv.aiAnalysis?.suggestedFollowupDate || '2026-09-30');
      setScheduleTime(currentConv.aiAnalysis?.suggestedFollowupTime || '10:00 AM');
      setScheduleReason(currentConv.aiAnalysis?.reason || 'Payment Follow-up');
      setScheduleAttempt(currentConv.aiAnalysis?.attemptCount || 1);
      setIsFollowupScheduled(false);
      setReplyChannel((currentConv.channel as 'WhatsApp' | 'Email' | 'SMS') || 'WhatsApp');
      setEmailSubject(`Re: RepayX Loan Recovery Notice #${currentConv.loanId}`);
    }
  }, [currentConv?.id]);

  // AI Copilot Toggle Handler
  const handleToggleAiCopilot = async () => {
    if (!currentConv) return;
    const newAiState = !currentConv.aiEnabled;
    try {
      await fetch(`${API_BASE}/api/conversations/${currentConv.id}/ai-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_enabled: newAiState }),
      });
    } catch {}

    setConversationList((prev) =>
      prev.map((c) => (c.id === currentConv.id ? { ...c, aiEnabled: newAiState } : c))
    );

    addToast({
      type: newAiState ? 'success' : 'info',
      title: newAiState ? 'AI Copilot Activated' : 'AI Copilot Paused',
      message: newAiState
        ? `Autonomous AI recovery responses enabled for ${currentConv.customerName}.`
        : `AI responses paused. Manual manager intervention required.`,
    });
  };

  // Human Handoff Toggle Handler
  const handleToggleHumanHandoff = async () => {
    if (!currentConv) return;
    const newHandoffState = !currentConv.humanHandoff;
    try {
      await fetch(`${API_BASE}/api/conversations/${currentConv.id}/ai-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_enabled: !newHandoffState,
          human_handoff: newHandoffState,
          reason: newHandoffState ? 'manager_intervention' : null,
        }),
      });
    } catch {}

    setConversationList((prev) =>
      prev.map((c) =>
        c.id === currentConv.id
          ? {
              ...c,
              humanHandoff: newHandoffState,
              aiEnabled: !newHandoffState,
              handoffReason: newHandoffState ? 'manager_intervention' : undefined,
            }
          : c
      )
    );

    addToast({
      type: newHandoffState ? 'warning' : 'success',
      title: newHandoffState ? 'Assigned to Human Counselor' : 'Handoff Resolved',
      message: newHandoffState
        ? `Conversation flagged for manual collection manager handling.`
        : `Account cleared. AI copilot resumed.`,
    });
  };

  // Manual chat send through selected channel
  const handleSendManualMessage = async () => {
    if (!chatInputText.trim() || !currentConv) return;
    setIsSendingReply(true);

    const textToSend = chatInputText.trim();
    const targetChannel = replyChannel;
    const targetSubject = targetChannel === 'Email' ? emailSubject : undefined;

    const newMsg: ChatMessage = {
      id: `M-${Date.now()}`,
      sender: 'manager',
      text: textToSend,
      timestamp: 'Today, Just now',
      isApprovedByManager: true,
      status: 'sent',
      channel: targetChannel,
      subject: targetSubject,
    };

    // Update UI immediately (optimistic UI)
    setConversationList((prev) =>
      prev.map((c) => {
        if (c.id === currentConv.id) {
          return {
            ...c,
            lastMessageTime: 'Just now',
            channel: targetChannel,
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );
    setChatInputText('');

    // Dispatch via backend API
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${currentConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: targetChannel,
          content: textToSend,
          subject: targetSubject,
          manager_name: 'Priya Parihar (Manager)',
        }),
      });
      const data = await res.json();
      if (!data.success && data.opted_out) {
        addToast({
          type: 'error',
          title: 'Recipient Opted Out',
          message: data.error || `Recipient opted out of ${targetChannel}.`,
        });
        setIsSendingReply(false);
        return;
      }
    } catch {
      // Backend offline fallback
    }

    setIsSendingReply(false);
    addToast({
      type: 'success',
      title: `Message Dispatched via ${targetChannel}`,
      message: `Sent to ${currentConv.customerName} (${
        targetChannel === 'Email' ? currentConv.customerEmail : currentConv.customerPhone
      })`,
    });
  };

  // Approve & send AI suggested response
  const handleApproveAiResponse = async () => {
    if (!currentConv) return;
    const textToSend = editedResponseText.trim();
    const targetChannel = (currentConv.channel as 'WhatsApp' | 'Email' | 'SMS') || 'WhatsApp';

    const newMessage: ChatMessage = {
      id: `M-${Date.now()}`,
      sender: 'ai',
      text: textToSend,
      timestamp: 'Today, Just now',
      isApprovedByManager: true,
      status: 'sent',
      channel: targetChannel,
    };

    setConversationList((prev) =>
      prev.map((c) => {
        if (c.id === currentConv.id) {
          return {
            ...c,
            lastMessageTime: 'Just now',
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      })
    );

    // Call API
    try {
      await fetch(`${API_BASE}/api/conversations/${currentConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: targetChannel,
          content: textToSend,
          manager_name: 'Priya Parihar (Manager Approved)',
        }),
      });
    } catch {}

    setIsEditingAiResponse(false);
    addToast({
      type: 'success',
      title: 'AI Response Approved & Dispatched',
      message: `Message sent to ${currentConv.customerName} via ${targetChannel}.`,
    });
  };

  // Draft dynamic AI response into composer
  const handleGenerateAiResponse = () => {
    const draft = `Hello ${currentConv?.customerName}, this is RepayX Collections. Regarding Loan #${currentConv?.loanId}, your outstanding balance is ₹${
      currentLoan?.emi.toLocaleString('en-IN') || '8,500'
    }. Please click here to settle immediately: https://pay.repayx.ai/inv/${currentConv?.customerId}`;
    setChatInputText(draft);
    addToast({
      type: 'info',
      title: 'Policy Draft Inserted',
      message: 'Grounding text inserted into the composer.',
    });
  };

  // Template helper for Outbound New Message modal
  const getTemplateText = (tpl: string, c: Customer, l?: Loan) => {
    const loanId = l?.id || 'LN1001';
    const outstanding = `₹${(l?.totalLoanAmount ? l.totalLoanAmount - l.emiPaid : 25000).toLocaleString('en-IN')}`;
    const dueDate = l?.nextDueDate || '25-Sep-2026';

    switch (tpl) {
      case 'reminder':
        return `Hello ${c.name}, gentle reminder from RepayX that your scheduled EMI for loan ${loanId} was due on ${dueDate}. Kindly complete payment today using this secure link: https://pay.repayx.ai/inv/${c.id}`;
      case 'overdue':
        return `Urgent Notice: Dear ${c.name}, your loan ${loanId} has an outstanding balance of ${outstanding}. Please clear dues to prevent regulatory credit bureau (CIBIL) score downgrade.`;
      case 'delay_ack':
        return `Hello ${c.name}, this is Priya Parihar from RepayX. We have acknowledged your payment timeline. Here is your direct UPI payment link to clear when ready: https://pay.repayx.ai/upi/${loanId}`;
      case 'link':
        return `Dear ${c.name}, please find your official Bharat QR / UPI quick repayment link for loan ${loanId} (${outstanding}): https://pay.repayx.ai/pay?id=${loanId}`;
      default:
        return '';
    }
  };

  const handleOpenNewMessageModal = () => {
    const cust = currentCustomer || customers[0];
    const loan = loans.find((l) => l.customerId === cust.id);
    setNewMsgCustomerId(cust.id);
    setNewMsgTemplate('reminder');
    setNewMsgCustomText(getTemplateText('reminder', cust, loan));
    setNewMsgSubject(`RepayX Loan Payment Reminder - #${loan?.id || 'LN1001'}`);
    setIsNewMessageModalOpen(true);
  };

  const handleSendOutboundNewMessage = async () => {
    if (!newMsgCustomText.trim()) return;
    const cust = customers.find((c) => c.id === newMsgCustomerId) || customers[0];
    const loan = loans.find((l) => l.customerId === cust.id);

    const newMsg: ChatMessage = {
      id: `M-${Date.now()}`,
      sender: 'manager',
      text: newMsgCustomText.trim(),
      timestamp: 'Today, Just now',
      isApprovedByManager: true,
      status: 'sent',
      channel: newMsgChannel,
      subject: newMsgChannel === 'Email' ? newMsgSubject : undefined,
    };

    const existingConv = conversationList.find((c) => c.customerId === cust.id);
    if (existingConv) {
      setConversationList((prev) =>
        prev.map((c) =>
          c.id === existingConv.id
            ? { ...c, channel: newMsgChannel, lastMessageTime: 'Just now', messages: [...c.messages, newMsg] }
            : c
        )
      );
      onSelectConversation(existingConv.id);
      try {
        await fetch(`${API_BASE}/api/conversations/${existingConv.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: newMsgChannel,
            content: newMsgCustomText.trim(),
            subject: newMsgChannel === 'Email' ? newMsgSubject : undefined,
          }),
        });
      } catch {}
    } else {
      const newConv: Conversation = {
        id: `CONV-${Date.now()}`,
        loanId: loan?.id || 'LN1001',
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerEmail: `${cust.name.toLowerCase().replace(' ', '.')}@example.com`,
        customerAvatar: cust.avatar,
        lastMessageTime: 'Just now',
        unread: false,
        channel: newMsgChannel,
        aiEnabled: true,
        humanHandoff: false,
        messages: [newMsg],
        aiAnalysis: {
          detectedIntent: 'PAYMENT_PROMISE',
          reason: 'Outbound Manager Initiated Contact',
          paymentPromise: false,
          promisedTimeline: 'Awaiting reply',
          recommendedAction: 'Wait for response',
          confidence: 90,
          ragContext: {
            policyTitle: 'Omnichannel Collections SOP',
            relevantSection: 'Manager initiated direct follow-up.',
            sourceFile: 'omnichannel_policy.pdf',
            chunkId: 'CHUNK-SOP-001',
            relevanceScore: 90,
          },
          aiSuggestedResponse: `Follow-up sent to ${cust.name}`,
          requiresManagerApproval: false,
          attemptCount: 1,
        },
      };
      setConversationList([newConv, ...conversationList]);
      onSelectConversation(newConv.id);
      try {
        await fetch(`${API_BASE}/api/conversations/new`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: cust.id,
            channel: newMsgChannel,
            content: newMsgCustomText.trim(),
            subject: newMsgChannel === 'Email' ? newMsgSubject : undefined,
          }),
        });
      } catch {}
    }

    setIsNewMessageModalOpen(false);
    addToast({
      type: 'success',
      title: 'Follow-up Dispatched',
      message: `Message sent to ${cust.name} via ${newMsgChannel}.`,
    });
  };

  // Filter conversations by channel, search, and intent
  const filteredConversations = conversationList.filter((conv) => {
    const matchesChannel =
      selectedChannelFilter === 'all' || conv.channel.toLowerCase() === selectedChannelFilter.toLowerCase();

    const matchesSearch =
      conv.customerName.toLowerCase().includes(searchInbox.toLowerCase()) ||
      conv.loanId.toLowerCase().includes(searchInbox.toLowerCase()) ||
      conv.aiAnalysis.detectedIntent.toLowerCase().includes(searchInbox.toLowerCase());

    const matchesIntent =
      filterIntent === 'all' || conv.aiAnalysis.detectedIntent === filterIntent;

    return matchesChannel && matchesSearch && matchesIntent;
  });

  // Channel message counts
  const channelCounts = {
    all: conversationList.length,
    WhatsApp: conversationList.filter((c) => c.channel.toLowerCase() === 'whatsapp').length,
    Email: conversationList.filter((c) => c.channel.toLowerCase() === 'email').length,
    SMS: conversationList.filter((c) => c.channel.toLowerCase() === 'sms').length,
  };

  // Character counter for SMS
  const smsCharCount = chatInputText.length;
  const smsSegments = smsCharCount <= 160 ? 1 : Math.ceil(smsCharCount / 153);

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto overflow-hidden">
      {/* ============================================================ */}
      {/* LEFT COLUMN: Unified Omnichannel Inbox (w-84)                */}
      {/* ============================================================ */}
      <div className="lg:w-84 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col shrink-0 overflow-hidden">
        {/* Inbox Header & Channel Filter Tabs */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recovery Inbox</h2>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                Omnichannel
              </span>
            </div>

            <button
              onClick={handleOpenNewMessageModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Compose outbound follow-up message"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Omnichannel Channel Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/60 rounded-xl mb-2 text-xs font-semibold">
            <button
              onClick={() => setSelectedChannelFilter('all')}
              className={`py-1 rounded-lg text-center transition-all cursor-pointer ${
                selectedChannelFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({channelCounts.all})
            </button>
            <button
              onClick={() => setSelectedChannelFilter('WhatsApp')}
              className={`flex items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
                selectedChannelFilter === 'WhatsApp'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
              title="WhatsApp Messages"
            >
              <MessageCircle className="w-3 h-3" />
              <span>WA ({channelCounts.WhatsApp})</span>
            </button>
            <button
              onClick={() => setSelectedChannelFilter('Email')}
              className={`flex items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
                selectedChannelFilter === 'Email'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
              title="Email Messages"
            >
              <Mail className="w-3 h-3" />
              <span>Email ({channelCounts.Email})</span>
            </button>
            <button
              onClick={() => setSelectedChannelFilter('SMS')}
              className={`flex items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
                selectedChannelFilter === 'SMS'
                  ? 'bg-purple-600 text-white shadow-2xs font-bold'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
              title="SMS Messages"
            >
              <MessageSquare className="w-3 h-3" />
              <span>SMS ({channelCounts.SMS})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search borrower, loan, or text..."
              value={searchInbox}
              onChange={(e) => setSearchInbox(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Intent Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {[
              { id: 'all', label: 'All Intents' },
              { id: 'PAYMENT_DELAY', label: 'Delay' },
              { id: 'PAYMENT_PROMISE', label: 'Promise' },
              { id: 'FINANCIAL_HARDSHIP', label: 'Hardship' },
              { id: 'DISPUTE_OR_COMPLAINT', label: 'Dispute' },
              { id: 'BALANCE_INQUIRY', label: 'Balance' },
              { id: 'OPT_OUT', label: 'Opt-Out' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterIntent(f.id)}
                className={`px-2 py-0.5 rounded-md whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  filterIntent === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations found for selected filter.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === currentConv?.id;
              const lastMsg = conv.messages[conv.messages.length - 1];
              const intent = conv.aiAnalysis?.detectedIntent || 'GENERAL_QUERY';
              const channelType = conv.channel.toLowerCase();

              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 overflow-hidden">
                        {conv.customerAvatar ? (
                          <img
                            src={conv.customerAvatar}
                            alt={conv.customerName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          conv.customerName.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {conv.customerName}
                          </p>
                          {conv.humanHandoff && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ⚠️ Handoff
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{conv.loanId}</span>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {conv.lastMessageTime}
                    </span>
                  </div>

                  {/* Channel & Intent Badges */}
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        intent === 'PAYMENT_PROMISE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : intent === 'PAYMENT_DELAY'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : intent === 'FINANCIAL_HARDSHIP' || intent === 'FINANCIAL_DIFFICULTY'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : intent === 'DISPUTE_OR_COMPLAINT' || intent === 'PAYMENT_DISPUTE'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : intent === 'OPT_OUT'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {intent.replace(/_/g, ' ')}
                    </span>

                    {/* Channel Indicator Badge */}
                    <span
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        channelType === 'whatsapp'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : channelType === 'email'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {channelType === 'whatsapp' && <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />}
                      {channelType === 'email' && <Mail className="w-2.5 h-2.5 text-blue-600" />}
                      {channelType === 'sms' && <MessageSquare className="w-2.5 h-2.5 text-purple-600" />}
                      <span>{conv.channel}</span>
                    </span>
                  </div>

                  {/* Message Preview Snippet */}
                  <p className="text-[11px] text-slate-600 truncate mt-1.5 font-normal">
                    {lastMsg?.text || 'No message'}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* CENTER COLUMN: Unified Interactive Chat Timeline (flex-1)   */}
      {/* ============================================================ */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col min-w-0 overflow-hidden">
        {/* Chat Header: Customer & Omnichannel Controls */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
              {currentConv?.customerAvatar ? (
                <img
                  src={currentConv.customerAvatar}
                  alt={currentConv.customerName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                currentConv?.customerName.charAt(0)
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{currentConv?.customerName}</h3>
                <span className="text-[11px] font-mono text-slate-500 font-semibold">
                  {currentConv?.loanId}
                </span>

                {/* Active channel badge */}
                <span
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                    currentConv?.channel.toLowerCase() === 'whatsapp'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : currentConv?.channel.toLowerCase() === 'email'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}
                >
                  {currentConv?.channel.toLowerCase() === 'whatsapp' && <MessageCircle className="w-3 h-3 text-emerald-600" />}
                  {currentConv?.channel.toLowerCase() === 'email' && <Mail className="w-3 h-3 text-blue-600" />}
                  {currentConv?.channel.toLowerCase() === 'sms' && <MessageSquare className="w-3 h-3 text-purple-600" />}
                  <span>{currentConv?.channel} Active</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {currentConv?.customerPhone} · {currentConv?.customerEmail || 'email on file'}
              </p>
            </div>
          </div>

          {/* AI Copilot & Handoff Action Controls */}
          <div className="flex items-center gap-2">
            {/* AI Copilot Active / Paused Pill */}
            <button
              onClick={handleToggleAiCopilot}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                currentConv?.aiEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
              }`}
              title="Click to toggle AI copilot auto-reply"
            >
              {currentConv?.aiEnabled ? (
                <>
                  <Bot className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>AI Copilot: Active</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600" />
                  <span>AI Copilot: Paused</span>
                </>
              )}
            </button>

            {/* Human Handoff Button */}
            <button
              onClick={handleToggleHumanHandoff}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                currentConv?.humanHandoff
                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {currentConv?.humanHandoff ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-rose-600" />
                  <span>Resolve Handoff</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                  <span>Take Over</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Human Handoff Banner (if flagged) */}
        {currentConv?.humanHandoff && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Needs Human Intervention:</strong> {currentConv.handoffReason || 'Borrower requested human counselor assistance / reported hardship.'}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full">
              Priya Parihar Assigned
            </span>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
          {currentConv?.messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            const isManager = msg.sender === 'manager';
            const isCustomer = msg.sender === 'customer';
            const msgChannel = (msg.channel || currentConv.channel || 'WhatsApp').toLowerCase();

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isCustomer ? 'items-start' : 'items-end'
                } max-w-[85%] ${isCustomer ? 'mr-auto' : 'ml-auto'}`}
              >
                {/* Sender badge, channel icon & timestamp */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                  {isAI && (
                    <span className="flex items-center gap-1 font-semibold text-purple-600">
                      <Sparkles className="w-3 h-3" /> RepayX AI Copilot
                    </span>
                  )}
                  {isManager && (
                    <span className="flex items-center gap-1 font-semibold text-blue-600">
                      <ShieldCheck className="w-3 h-3" /> Priya Parihar (Manager)
                    </span>
                  )}
                  {isCustomer && (
                    <span className="font-semibold text-slate-700">
                      {currentConv.customerName}
                    </span>
                  )}

                  {/* Message Channel Badge */}
                  <span
                    className={`flex items-center gap-1 px-1.5 py-0.2 rounded-full font-bold text-[9px] border ${
                      msgChannel === 'whatsapp'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : msgChannel === 'email'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                  >
                    {msgChannel === 'whatsapp' && <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />}
                    {msgChannel === 'email' && <Mail className="w-2.5 h-2.5 text-blue-600" />}
                    {msgChannel === 'sms' && <MessageSquare className="w-2.5 h-2.5 text-purple-600" />}
                    <span className="capitalize">{msgChannel}</span>
                  </span>

                  <span>·</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Bubble Container */}
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    isCustomer
                      ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      : isAI
                      ? 'bg-slate-900 text-white rounded-tr-xs'
                      : 'bg-blue-600 text-white rounded-tr-xs'
                  }`}
                >
                  {/* Email Subject line if present */}
                  {msg.subject && (
                    <div className="mb-2 pb-1.5 border-b border-white/20 text-[11px] font-semibold text-blue-100 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>{msg.subject}</span>
                    </div>
                  )}

                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Manager approval stamp if applicable */}
                  {msg.isApprovedByManager && (
                    <div
                      className={`mt-2 pt-1.5 border-t text-[10px] flex items-center justify-between ${
                        isAI ? 'border-slate-800 text-slate-400' : 'border-blue-500 text-blue-100'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span>Manager Reviewed & Authorized</span>
                      </span>
                      <span>Priya Parihar</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ============================================================ */}
        {/* COMPOSER: Omnichannel Outbound Reply Area                    */}
        {/* ============================================================ */}
        <div className="p-3.5 border-t border-slate-100 bg-white">
          {/* Channel Selector for Outbound Reply */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-semibold">Reply via:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setReplyChannel('WhatsApp')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                    replyChannel === 'WhatsApp'
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => setReplyChannel('Email')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                    replyChannel === 'Email'
                      ? 'bg-blue-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3 h-3" />
                  <span>Email</span>
                </button>
                <button
                  onClick={() => setReplyChannel('SMS')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                    replyChannel === 'SMS'
                      ? 'bg-purple-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>SMS</span>
                </button>
              </div>

              {/* SMS Segment counter */}
              {replyChannel === 'SMS' && (
                <span className="text-[10px] text-purple-700 font-mono bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  {smsCharCount} / 160 chars ({smsSegments} SMS)
                </span>
              )}
            </div>

            {/* Quick Draft AI Policy Response */}
            <button
              onClick={handleGenerateAiResponse}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Draft Policy Reply</span>
            </button>
          </div>

          {/* Email Subject line if Email channel is selected */}
          {replyChannel === 'Email' && (
            <div className="mb-2">
              <input
                type="text"
                placeholder="Email Subject..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Quick Reply Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 scrollbar-none text-[11px]">
            <span className="text-slate-400 font-medium shrink-0">Quick reply:</span>
            <button
              onClick={() =>
                setChatInputText(
                  `Hello ${currentConv?.customerName}, gentle reminder that your EMI of ₹${
                    currentLoan?.emi.toLocaleString('en-IN') || '8,500'
                  } is due. Please click here to complete payment: https://pay.repayx.ai/inv/${
                    currentConv?.customerId
                  }`
                )
              }
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              📌 Soft EMI Reminder
            </button>
            <button
              onClick={() =>
                setChatInputText(
                  `Hello ${currentConv?.customerName}, here is your verified UPI payment link for instant loan clearance: https://pay.repayx.ai/inv/${
                    currentConv?.customerId
                  }`
                )
              }
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              🔗 Send Payment Link
            </button>
            <button
              onClick={() =>
                setChatInputText(
                  `Dear ${currentConv?.customerName}, RepayX can offer you a special late fee waiver if you settle your overdue principal today: https://pay.repayx.ai/inv/${currentConv?.customerId}`
                )
              }
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              🎉 Concession Offer
            </button>
          </div>

          {/* Text Input & Send */}
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={chatInputText}
              onChange={(e) => setChatInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendManualMessage();
                }
              }}
              placeholder={`Write authorized reply to ${currentConv?.customerName} via ${replyChannel}...`}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />

            <button
              onClick={handleSendManualMessage}
              disabled={!chatInputText.trim() || isSendingReply}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer h-10"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: Borrower Details, Channel Identities & RAG    */}
      {/* ============================================================ */}
      <div className="lg:w-84 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col shrink-0 overflow-y-auto divide-y divide-slate-100 p-4 space-y-4">
        {/* Borrower Risk Profile Card */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Borrower Profile
            </h4>
            <button
              onClick={() => onNavigateToCustomer(currentConv?.customerId || 'CUS001')}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              <span>View Dossier</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total Loan:</span>
              <span className="font-bold text-slate-900">
                ₹{currentLoan?.totalLoanAmount?.toLocaleString('en-IN') || '1,00,000'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">EMI Repaid:</span>
              <span className="font-semibold text-emerald-600">
                ₹{currentLoan?.emiPaid?.toLocaleString('en-IN') || '36,497'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Overdue Balance:</span>
              <span className="font-bold text-rose-600">
                ₹{((currentLoan?.totalLoanAmount || 100000) - (currentLoan?.emiPaid || 36497)).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Days Past Due:</span>
              <span className="font-semibold text-amber-700 font-mono">
                {currentLoan?.daysPastDue || 25} days
              </span>
            </div>
          </div>
        </div>

        {/* Omnichannel Identities & Opt-Out Status Card */}
        <div className="pt-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            Connected Channels
          </h4>
          <div className="space-y-1.5">
            {/* WhatsApp Identity */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">WhatsApp</p>
                  <p className="text-[10px] text-slate-400 font-mono">{currentConv?.customerPhone}</p>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                Active
              </span>
            </div>

            {/* Email Identity */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">Email</p>
                  <p className="text-[10px] text-slate-400">{currentConv?.customerEmail || 'email on file'}</p>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">
                Active
              </span>
            </div>

            {/* SMS Identity */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">SMS</p>
                  <p className="text-[10px] text-slate-400 font-mono">{currentConv?.customerPhone}</p>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* AI Intent & Commitment Summary */}
        <div className="pt-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            AI Intent & Insights
          </h4>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Detected Intent</span>
              <p className="text-xs font-bold text-slate-900">
                {currentConv?.aiAnalysis?.detectedIntent?.replace(/_/g, ' ') || 'General Query'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Repayment Commitment</span>
              <p className="text-xs font-semibold text-emerald-700">
                {currentConv?.aiAnalysis?.paymentPromise
                  ? `Promised by: ${currentConv.aiAnalysis.promisedTimeline}`
                  : 'No active commitment'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Recommended Action</span>
              <p className="text-xs text-slate-700">
                {currentConv?.aiAnalysis?.recommendedAction || 'Follow-up per standard recovery schedule'}
              </p>
            </div>
          </div>
        </div>

        {/* RAG Policy Grounding & SOP Citation */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              RAG Policy Grounding
            </h4>
            <button
              onClick={() => setIsRagModalOpen(true)}
              className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
            >
              <span>Inspect Chunk</span>
              <BookOpen className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-100 text-xs">
            <div className="flex items-center justify-between text-purple-900 font-bold mb-1">
              <span>{currentConv?.aiAnalysis?.ragContext?.policyTitle || 'Collections Policy'}</span>
              <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.2 rounded-full">
                {currentConv?.aiAnalysis?.ragContext?.relevanceScore || 94}% Match
              </span>
            </div>
            <p className="text-[11px] text-purple-800 line-clamp-3 leading-relaxed">
              "{currentConv?.aiAnalysis?.ragContext?.relevantSection || 'Standard debt collection communication guidelines under RBI Fair Practices Code.'}"
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: Outbound New Message (Compose)                        */}
      {/* ============================================================ */}
      <Modal
        isOpen={isNewMessageModalOpen}
        onClose={() => setIsNewMessageModalOpen(false)}
        title="Compose Outbound Recovery Follow-up"
      >
        <div className="space-y-4">
          {/* Target Customer */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Borrower</label>
            <select
              value={newMsgCustomerId}
              onChange={(e) => {
                const cId = e.target.value;
                setNewMsgCustomerId(cId);
                const cust = customers.find((c) => c.id === cId) || customers[0];
                const loan = loans.find((l) => l.customerId === cId);
                setNewMsgCustomText(getTemplateText(newMsgTemplate, cust, loan));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id} · {c.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Outbound Channel Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Channel</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNewMsgChannel('WhatsApp')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  newMsgChannel === 'WhatsApp'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setNewMsgChannel('Email')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  newMsgChannel === 'Email'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => setNewMsgChannel('SMS')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  newMsgChannel === 'SMS'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>SMS</span>
              </button>
            </div>
          </div>

          {/* Email Subject if Email chosen */}
          {newMsgChannel === 'Email' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                value={newMsgSubject}
                onChange={(e) => setNewMsgSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800"
              />
            </div>
          )}

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Template Preset</label>
            <select
              value={newMsgTemplate}
              onChange={(e) => {
                const tpl = e.target.value;
                setNewMsgTemplate(tpl);
                const cust = customers.find((c) => c.id === newMsgCustomerId) || customers[0];
                const loan = loans.find((l) => l.customerId === cust.id);
                setNewMsgCustomText(getTemplateText(tpl, cust, loan));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800"
            >
              <option value="reminder">Standard Soft EMI Reminder</option>
              <option value="overdue">High-Priority Overdue CIBIL Warning</option>
              <option value="delay_ack">Acknowledged Salary Delay UPI Notice</option>
              <option value="link">Bharat QR / UPI Direct Pay Link</option>
            </select>
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Message Body</label>
            <textarea
              rows={4}
              value={newMsgCustomText}
              onChange={(e) => setNewMsgCustomText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsNewMessageModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSendOutboundNewMessage}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            >
              Authorize & Dispatch
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: RAG Policy Inspector                                  */}
      {/* ============================================================ */}
      <Modal
        isOpen={isRagModalOpen}
        onClose={() => setIsRagModalOpen(false)}
        title="RAG Knowledge Base Policy Citation"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
            <p className="font-bold text-purple-900 mb-1">
              Document: {currentConv?.aiAnalysis?.ragContext?.sourceFile || 'omnichannel_policy.pdf'}
            </p>
            <p className="text-purple-700 font-mono text-[11px]">
              Chunk ID: {currentConv?.aiAnalysis?.ragContext?.chunkId || 'CHUNK-OMNI-001'} (Confidence:{' '}
              {currentConv?.aiAnalysis?.ragContext?.relevanceScore || 95}%)
            </p>
          </div>

          <div>
            <h5 className="font-bold text-slate-800 mb-1">Relevant Policy Section:</h5>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-line font-serif">
              {currentConv?.aiAnalysis?.ragContext?.relevantSection ||
                'All recovery communications over WhatsApp, Email, and SMS must adhere to the Fair Recovery Code, maintaining empathetic tone, avoiding harassment, respecting opt-outs, and offering RBI approved loan restructuring.'}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsRagModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
