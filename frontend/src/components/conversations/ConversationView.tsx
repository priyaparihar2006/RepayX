import React, { useState } from 'react';
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
} from 'lucide-react';
import { Conversation, Customer, Loan } from '../../types';
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
  const [filterIntent, setFilterIntent] = useState<string>('all');
  const [searchInbox, setSearchInbox] = useState('');

  // Outbound New Message Modal state
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [newMsgCustomerId, setNewMsgCustomerId] = useState(customers[0]?.id || 'CUS001');
  const [newMsgChannel, setNewMsgChannel] = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp');
  const [newMsgTemplate, setNewMsgTemplate] = useState('reminder');
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

  // Sync state when active conversation changes
  React.useEffect(() => {
    if (currentConv) {
      setEditedResponseText(currentConv.aiAnalysis.aiSuggestedResponse);
      setScheduleDate(currentConv.aiAnalysis.suggestedFollowupDate || '2026-09-30');
      setScheduleTime(currentConv.aiAnalysis.suggestedFollowupTime || '10:00 AM');
      setScheduleReason(currentConv.aiAnalysis.reason || 'Payment Follow-up');
      setScheduleAttempt(currentConv.aiAnalysis.attemptCount || 1);
      setIsFollowupScheduled(false);
      setIsEditingAiResponse(false);
    }
  }, [currentConv?.id]);

  // Approve & send AI response
  const handleApproveAndSendAiResponse = () => {
    if (!currentConv) return;
    const newMessage = {
      id: `M-${Date.now()}`,
      sender: 'ai' as const,
      text: editedResponseText,
      timestamp: 'Today, Just now',
      isApprovedByManager: true,
      status: 'sent' as const,
    };

    setConversationList((prev) =>
      prev.map((c) => {
        if (c.id === currentConv.id) {
          return {
            ...c,
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      })
    );

    addToast({
      type: 'success',
      title: 'AI Response Approved & Sent',
      message: `Message dispatched to ${currentConv.customerName} via ${currentConv.channel} with manager signature.`,
    });
  };

  // Manual chat send
  const handleSendManualMessage = () => {
    if (!chatInputText.trim() || !currentConv) return;

    const newMessage = {
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
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      })
    );

    setChatInputText('');
    addToast({
      type: 'info',
      title: 'Manager Message Sent',
      message: `Sent to ${currentConv.customerName}`,
    });
  };

  // Generate dynamic AI draft from current input or context
  const handleGenerateAiResponse = () => {
    if (!currentConv) return;
    const intent = currentConv.aiAnalysis.detectedIntent;
    let draft = '';

    switch (intent) {
      case 'PAYMENT_DELAY':
        draft = `Hello ${currentConv.customerName}, we have noted your salary delay. Your grace window has been extended until ${scheduleDate}. Kindly use this link to complete payment once credited: https://pay.repayx.internal/${currentConv.loanId}`;
        break;
      case 'PAYMENT_PROMISE':
        draft = `Hi ${currentConv.customerName}, your promise to pay ₹${currentLoan?.outstanding.toLocaleString(
          'en-IN'
        )} by ${scheduleDate} has been confirmed. No further reminder calls will be made before this timeline.`;
        break;
      case 'FINANCIAL_DIFFICULTY':
        draft = `Dear ${currentConv.customerName}, our credit department has received your financial hardship relief request. We can offer a 6-month loan tenure extension to reduce your EMI by 35%. Our representative will reach out today.`;
        break;
      case 'PAYMENT_DISPUTE':
        draft = `Hello ${currentConv.customerName}, dispute ticket #DISP-${Math.floor(
          1000 + Math.random() * 9000
        )} is under branch investigation. Outbound collection calls on loan ${currentConv.loanId} have been paused.`;
        break;
      case 'PAYMENT_CLAIMED':
        draft = `Thank you ${currentConv.customerName}. We are verifying your payment against bank clearing records. Please allow up to 2 hours for automated clearance confirmation.`;
        break;
      case 'EXTENSION_REQUEST':
        draft = `Dear ${currentConv.customerName}, your 10-day extension request has been noted under our emergency relief policy. We will notify you once approved by the collection supervisor.`;
        break;
      case 'WRONG_NUMBER':
        draft = `We apologize for reaching out to this number. Our records have been immediately updated to mark this contact as incorrect. No further messages will be sent.`;
        break;
      default:
        draft = currentConv.aiAnalysis.aiSuggestedResponse;
    }

    setChatInputText(draft);
    addToast({
      type: 'info',
      title: 'AI Draft Generated',
      message: 'Generated policy-compliant response tailored to detected customer intent.',
    });
  };

  // Handle schedule follow-up
  const handleScheduleSubmit = () => {
    if (!currentConv || !currentLoan) return;

    onScheduleFollowup({
      customerId: currentConv.customerId,
      customerName: currentConv.customerName,
      loanId: currentConv.loanId,
      scheduledAt: scheduleDate,
      scheduledTime: scheduleTime,
      aiReason: scheduleReason,
    });

    setIsFollowupScheduled(true);

    addToast({
      type: 'success',
      title: 'Follow-up Scheduled',
      message: `Automated follow-up #${scheduleAttempt} set for ${scheduleDate} at ${scheduleTime}.`,
    });
  };

  // Pre-fill outbound text when modal opens or customer/template changes
  const getTemplateText = (tpl: string, c: Customer, l?: Loan) => {
    const outstanding = l ? `₹${l.outstanding.toLocaleString('en-IN')}` : '₹8,500';
    const loanId = l ? l.id : 'LN1001';
    const dueDate = l ? l.dueDate : '25 Sep 2026';

    switch (tpl) {
      case 'reminder':
        return `Hello ${c.name}, gentle reminder from RepayX that your scheduled EMI for loan ${loanId} was due on ${dueDate}. Kindly complete payment today using this secure link: https://pay.repayx.internal/${loanId}`;
      case 'overdue':
        return `Urgent Notice: Dear ${c.name}, your loan ${loanId} has an outstanding balance of ${outstanding}. Please clear dues to prevent regulatory credit bureau (CIBIL) score downgrade.`;
      case 'delay_ack':
        return `Hello ${c.name}, this is Priya Parihar from RepayX. We have acknowledged your payment delay. Here is your direct UPI payment link to clear when salary credits: https://pay.repayx.internal/upi/${loanId}`;
      case 'link':
        return `Dear ${c.name}, please find your official Bharat QR / UPI quick repayment link for loan ${loanId} (${outstanding}): https://pay.repayx.internal/pay?id=${loanId}`;
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
    setIsNewMessageModalOpen(true);
  };

  const handleSendOutboundNewMessage = () => {
    if (!newMsgCustomText.trim()) return;
    const cust = customers.find((c) => c.id === newMsgCustomerId) || customers[0];
    const loan = loans.find((l) => l.customerId === cust.id);

    const existingConv = conversationList.find((c) => c.customerId === cust.id);

    const newMsg = {
      id: `M-${Date.now()}`,
      sender: 'manager' as const,
      text: newMsgCustomText.trim(),
      timestamp: 'Today, Just now',
      isApprovedByManager: true,
      status: 'sent' as const,
    };

    if (existingConv) {
      setConversationList((prev) =>
        prev.map((c) => (c.id === existingConv.id ? { ...c, messages: [...c.messages, newMsg] } : c))
      );
      onSelectConversation(existingConv.id);
    } else {
      const newConv: Conversation = {
        id: `CONV-${Date.now()}`,
        loanId: loan?.id || 'LN1001',
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerAvatar: cust.avatar,
        lastMessageTime: 'Just now',
        unread: false,
        channel: newMsgChannel,
        messages: [newMsg],
        aiAnalysis: {
          detectedIntent: 'PAYMENT_PROMISE',
          reason: 'Outbound Manager Initiated Contact',
          paymentPromise: false,
          promisedTimeline: 'Awaiting reply',
          recommendedAction: 'Wait for response',
          confidence: 90,
          ragContext: {
            policyTitle: 'Follow-up SOP & Call Scripts',
            relevantSection: 'Manager initiated direct follow-up.',
            sourceFile: 'follow_up_sop.pdf',
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
    }

    setIsNewMessageModalOpen(false);
    addToast({
      type: 'success',
      title: 'Follow-up Dispatched',
      message: `Message sent to ${cust.name} via ${newMsgChannel} with manager authorization.`,
    });
  };

  // Filtered inbox list
  const filteredConversations = conversationList.filter((conv) => {
    const matchesSearch =
      conv.customerName.toLowerCase().includes(searchInbox.toLowerCase()) ||
      conv.loanId.toLowerCase().includes(searchInbox.toLowerCase()) ||
      conv.aiAnalysis.detectedIntent.toLowerCase().includes(searchInbox.toLowerCase());

    const matchesIntent =
      filterIntent === 'all' || conv.aiAnalysis.detectedIntent === filterIntent;

    return matchesSearch && matchesIntent;
  });

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto overflow-hidden">
      {/* LEFT COLUMN: Conversation Inbox & Filter (w-80 or w-1/4) */}
      <div className="lg:w-80 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col shrink-0 overflow-hidden">
        {/* Inbox Header & Search */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recovery Inbox</h2>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                AI Tagged
              </span>
            </div>

            {/* Compose New Outbound Message Button */}
            <button
              onClick={handleOpenNewMessageModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Compose outbound follow-up message"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Message</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter customer or intent..."
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
              { id: 'FINANCIAL_DIFFICULTY', label: 'Hardship' },
              { id: 'PAYMENT_DISPUTE', label: 'Dispute' },
              { id: 'PAYMENT_CLAIMED', label: 'Claimed' },
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
          {filteredConversations.map((conv) => {
            const isSelected = conv.id === currentConv?.id;
            const lastMsg = conv.messages[conv.messages.length - 1];
            const intent = conv.aiAnalysis.detectedIntent;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 overflow-hidden">
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
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {conv.customerName}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">{conv.loanId}</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                    {conv.lastMessageTime}
                  </span>
                </div>

                {/* Intent Badge */}
                <div className="flex items-center justify-between mt-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                      intent === 'PAYMENT_PROMISE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : intent === 'PAYMENT_DELAY'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : intent === 'FINANCIAL_DIFFICULTY'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : intent === 'PAYMENT_DISPUTE'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : intent === 'PAYMENT_CLAIMED'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {intent.replace('_', ' ')}
                  </span>

                  <span className="text-[10px] text-slate-500 font-medium">{conv.channel}</span>
                </div>

                {/* Snippet */}
                <p className="text-[11px] text-slate-600 truncate mt-1.5 font-normal">
                  {lastMsg?.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER COLUMN: Interactive Chat Window (flex-1) */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col min-w-0 overflow-hidden">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
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
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentConv?.channel} Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">{currentConv?.customerPhone}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToCustomer(currentConv.customerId)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Customer Dossier</span>
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/30">
          {/* Delinquency Alert Banner inside chat */}
          {currentLoan && currentLoan.daysOverdue > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Loan Overdue:</strong> ₹{currentLoan.outstanding.toLocaleString('en-IN')}{' '}
                  due since {currentLoan.dueDate} ({currentLoan.daysOverdue} days overdue)
                </span>
              </div>
              <span className="font-semibold font-mono text-[11px]">EMI: ₹{currentLoan.emi}</span>
            </div>
          )}

          {currentConv?.messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            const isManager = msg.sender === 'manager';
            const isCustomer = msg.sender === 'customer';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isCustomer ? 'items-start' : 'items-end'
                } max-w-[85%] ${isCustomer ? 'mr-auto' : 'ml-auto'}`}
              >
                {/* Sender badge & timestamp */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                  {isAI && (
                    <span className="flex items-center gap-1 font-semibold text-purple-600">
                      <Sparkles className="w-3 h-3" /> RepayX Agent
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
                  <span>·</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    isCustomer
                      ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      : isAI
                      ? 'bg-purple-900 text-white rounded-tr-xs'
                      : 'bg-blue-600 text-white rounded-tr-xs'
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Manager approval stamp if applicable */}
                  {msg.isApprovedByManager && (
                    <div
                      className={`mt-2 pt-1.5 border-t text-[10px] flex items-center justify-between ${
                        isAI
                          ? 'border-purple-800 text-purple-200'
                          : 'border-blue-500 text-blue-100'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span>Manager Reviewed & Approved</span>
                      </span>
                      <span>Priya Parihar</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Input Area */}
        <div className="p-3.5 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 font-medium">
              Channel: <strong>{currentConv?.channel}</strong> · Sending as <strong>Priya Parihar (Manager)</strong>
            </span>

            {/* Quick Generate AI Response Button */}
            <button
              onClick={handleGenerateAiResponse}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Draft Policy Response</span>
            </button>
          </div>

          {/* Quick Reply Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 scrollbar-none text-[11px]">
            <span className="text-slate-400 font-medium shrink-0">Quick reply:</span>
            <button
              onClick={() =>
                setChatInputText(
                  `Hello ${currentConv?.customerName}, gentle reminder that your EMI of ₹${
                    currentLoan?.emi.toLocaleString('en-IN') || '8,500'
                  } is due. Please click here to complete payment: https://pay.repayx.internal/${
                    currentLoan?.id || 'LN1001'
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
                  `Hello ${currentConv?.customerName}, here is your verified UPI payment link for instant loan clearance: https://pay.repayx.internal/upi/${
                    currentLoan?.id || 'LN1001'
                  }`
                )
              }
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              🔗 Send UPI Link
            </button>
            <button
              onClick={() =>
                setChatInputText(
                  `Dear ${currentConv?.customerName}, we have noted your delay request and accommodated a 5-day grace window until 30 September 2026. Please ensure clearance by then.`
                )
              }
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              ⏳ Grant 5-Day Window
            </button>
            <button
              onClick={() =>
                setChatInputText(
                  `Could you please share your 12-digit bank UTR reference or payment screenshot so we can verify and reconcile with our branch ledger?`
                )
              }
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              🧾 Request UTR Proof
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                addToast({
                  type: 'info',
                  title: 'Attachment Upload',
                  message: 'Attach payment receipt or formal notice PDF.',
                })
              }
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Attach document or receipt"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder="Type custom response or click a Quick reply above..."
              value={chatInputText}
              onChange={(e) => setChatInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendManualMessage();
              }}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />

            <button
              onClick={handleSendManualMessage}
              disabled={!chatInputText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Message</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: AI Analysis & RAG Context Panel (w-88 or w-1/3) */}
      <div className="lg:w-92 flex flex-col gap-4 overflow-y-auto shrink-0 pr-1">
        {/* 1. AI Analysis Panel */}
        <div className="bg-white rounded-2xl p-4 border border-purple-200/80 shadow-xs relative overflow-hidden bg-gradient-to-b from-purple-50/30 to-white">
          <div className="flex items-center justify-between mb-3 border-b border-purple-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">AI Analysis</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {currentConv?.aiAnalysis?.confidence}% Confidence
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Detected Intent */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Detected Intent</span>
              <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {currentConv?.aiAnalysis?.detectedIntent}
              </span>
            </div>

            {/* Reason */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Reason</span>
              <span className="font-semibold text-slate-800">{currentConv?.aiAnalysis?.reason}</span>
            </div>

            {/* Payment Promise */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Payment Promise</span>
              <span
                className={`font-bold ${
                  currentConv?.aiAnalysis?.paymentPromise ? 'text-emerald-600' : 'text-slate-500'
                }`}
              >
                {currentConv?.aiAnalysis?.paymentPromise ? 'Yes' : 'No'}
              </span>
            </div>

            {/* Promised Timeline */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Promised Timeline</span>
              <span className="font-semibold font-mono text-slate-800">
                {currentConv?.aiAnalysis?.promisedTimeline}
              </span>
            </div>

            {/* Recommended Action */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-900">
              <span className="font-medium text-blue-700">Recommended Action</span>
              <span className="font-bold">{currentConv?.aiAnalysis?.recommendedAction}</span>
            </div>
          </div>
        </div>

        {/* 2. RAG Context (Retrieved Policy) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900">Retrieved Policy (RAG)</h4>
            </div>
            <button
              onClick={() => setIsRagModalOpen(true)}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View Source</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-bold text-slate-900">
                {currentConv?.aiAnalysis?.ragContext?.policyTitle}
              </p>
              <span className="text-[10px] font-mono text-slate-500">
                Score: {currentConv?.aiAnalysis?.ragContext?.relevanceScore}%
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed italic text-[11px]">
              "{currentConv?.aiAnalysis?.ragContext?.relevantSection}"
            </p>
            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Source: {currentConv?.aiAnalysis?.ragContext?.sourceFile}</span>
              <span>{currentConv?.aiAnalysis?.ragContext?.chunkId}</span>
            </div>
          </div>
        </div>

        {/* 3. AI Generated Response Card */}
        <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-xs bg-gradient-to-b from-indigo-50/20 to-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold text-slate-900">AI Suggested Response</h4>
            </div>
            <button
              onClick={() => setIsEditingAiResponse(!isEditingAiResponse)}
              className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditingAiResponse ? 'Lock' : 'Edit'}</span>
            </button>
          </div>

          {isEditingAiResponse ? (
            <textarea
              rows={3}
              value={editedResponseText}
              onChange={(e) => setEditedResponseText(e.target.value)}
              className="w-full text-xs p-2.5 border border-blue-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          ) : (
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-slate-700 leading-relaxed">
              "{editedResponseText}"
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleApproveAndSendAiResponse}
              className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve & Send</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 text-center">
            Requires Manager Digital Authorization
          </p>
        </div>

        {/* 4. Follow-up Scheduling Card */}
        {(currentConv?.aiAnalysis?.detectedIntent === 'PAYMENT_PROMISE' ||
          currentConv?.aiAnalysis?.detectedIntent === 'PAYMENT_DELAY' ||
          currentConv?.aiAnalysis?.suggestedFollowupDate) && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900">Schedule Next Follow-up</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Attempt #{scheduleAttempt}</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  Follow-up Time
                </label>
                <select
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                >
                  <option value="09:00 AM">09:00 AM (Early Window)</option>
                  <option value="10:00 AM">10:00 AM (Standard)</option>
                  <option value="11:30 AM">11:30 AM (Mid-Morning)</option>
                  <option value="02:30 PM">02:30 PM (Afternoon Window)</option>
                  <option value="05:00 PM">05:00 PM (Closing Window)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Reason</label>
                <input
                  type="text"
                  value={scheduleReason}
                  onChange={(e) => setScheduleReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>

              <button
                onClick={handleScheduleSubmit}
                className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isFollowupScheduled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                }`}
              >
                {isFollowupScheduled ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Follow-up Scheduled ✓</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Schedule Follow-up</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compose Outbound Message Modal */}
      <Modal
        isOpen={isNewMessageModalOpen}
        onClose={() => setIsNewMessageModalOpen(false)}
        title="Compose Outbound Follow-up Message"
        subtitle="Send an authorized omnichannel message directly to any customer ledger account."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Customer Selection */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Select Customer</label>
            <select
              value={newMsgCustomerId}
              onChange={(e) => {
                const cId = e.target.value;
                setNewMsgCustomerId(cId);
                const c = customers.find((cust) => cust.id === cId) || customers[0];
                const l = loans.find((loan) => loan.customerId === cId);
                setNewMsgCustomText(getTemplateText(newMsgTemplate, c, l));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
            >
              {customers.map((c) => {
                const l = loans.find((loan) => loan.customerId === c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id}) · {l ? `${l.id} - ₹${l.outstanding.toLocaleString('en-IN')}` : 'No Loan'} · {c.phone}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Delivery Channel */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Delivery Channel</label>
            <div className="grid grid-cols-3 gap-2">
              {(['WhatsApp', 'SMS', 'Email'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setNewMsgChannel(ch)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    newMsgChannel === ch
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{ch === 'WhatsApp' ? '💬 WhatsApp' : ch === 'SMS' ? '📱 SMS' : '✉️ Email'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preset Template Selector */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Message Template</label>
            <select
              value={newMsgTemplate}
              onChange={(e) => {
                const tpl = e.target.value;
                setNewMsgTemplate(tpl);
                const c = customers.find((cust) => cust.id === newMsgCustomerId) || customers[0];
                const l = loans.find((loan) => loan.customerId === newMsgCustomerId);
                setNewMsgCustomText(getTemplateText(tpl, c, l));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            >
              <option value="reminder">📌 Pre-due / Due Courtesy Reminder</option>
              <option value="overdue">⚠️ Urgent Overdue Notice (DPD Default Alert)</option>
              <option value="delay_ack">⏳ Salary Delay Acknowledgment & Moratorium Link</option>
              <option value="link">🔗 Direct Bharat QR / UPI Instant Payment Link</option>
              <option value="custom">✍️ Blank Custom Message</option>
            </select>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-800">Message Content</label>
              <span className="text-[10px] text-slate-400 font-mono">
                {newMsgCustomText.length} characters
              </span>
            </div>
            <textarea
              rows={4}
              value={newMsgCustomText}
              onChange={(e) => setNewMsgCustomText(e.target.value)}
              placeholder="Type your message to the borrower..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
            />
          </div>

          {/* Compliance & Authorization Note */}
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-purple-900 text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Signed by <strong>Priya Parihar (Collection Manager)</strong></span>
            </span>
            <span className="text-[10px] font-mono text-purple-700">Audit Logged</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewMessageModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendOutboundNewMessage}
              disabled={!newMsgCustomText.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Message</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* RAG Source Full Document Modal */}
      <Modal
        isOpen={isRagModalOpen}
        onClose={() => setIsRagModalOpen(false)}
        title={currentConv?.aiAnalysis?.ragContext?.policyTitle || 'Policy Document'}
        subtitle={`Source File: ${currentConv?.aiAnalysis?.ragContext?.sourceFile} · Chunk ID: ${currentConv?.aiAnalysis?.ragContext?.chunkId}`}
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center justify-between">
            <div>
              <span className="font-bold">Retrieved Chunk Relevance Score:</span>{' '}
              <span className="font-mono text-sm font-bold">
                {currentConv?.aiAnalysis?.ragContext?.relevanceScore}%
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-purple-800 border border-purple-200">
              Vector Cosine: 0.894
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">Official SOP Text</h4>
            <p className="text-slate-700 leading-relaxed">
              {currentConv?.aiAnalysis?.ragContext?.relevantSection}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-slate-500 text-[11px]">
            <span>Indexed on: 29 Sep 2026 · AI Embeddings Model: text-embedding-004</span>
            <button
              onClick={() => setIsRagModalOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
