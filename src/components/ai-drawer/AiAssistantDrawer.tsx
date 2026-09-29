import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
} from 'lucide-react';
import { Customer, Loan } from '../../types';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: string, id?: string) => void;
  customers: Customer[];
  loans: Loan[];
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  customers,
  loans,
}) => {
  const [messages, setMessages] = useState<
    Array<{ sender: 'ai' | 'user'; text: string; actionTab?: string; actionLabel?: string }>
  >([
    {
      sender: 'ai',
      text: "Hello Priya! I'm your LoanFlow AI Copilot. I can search borrower histories, synthesize RAG policies, review overdue accounts, or draft WhatsApp follow-ups.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text: query }]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const q = query.toLowerCase();

      let reply = '';
      let actionTab: string | undefined = undefined;
      let actionLabel: string | undefined = undefined;

      if (q.includes('overdue') || q.includes('delinquent')) {
        const overdueLoans = loans.filter((l) => l.status === 'overdue');
        reply = `There are currently ${overdueLoans.length} overdue loans in your portfolio totaling ₹${overdueLoans
          .reduce((sum, l) => sum + l.outstanding, 0)
          .toLocaleString(
            'en-IN'
          )}. Top priority is Arjun Mehta (LN1003, 14 DPD, ₹45,600) and Karan Singh (LN1004, 7 DPD).`;
        actionTab = 'conversations';
        actionLabel = 'Review Overdue Threads';
      } else if (q.includes('rahul') || q.includes('salary')) {
        reply = `Rahul Sharma (LN1001) has an outstanding balance of ₹8,500 due since 25 Sep. He reported a salary delay and promised payment in 5 days (by 30 Sep). Next follow-up is queued for 30 Sep at 10:00 AM.`;
        actionTab = 'conversations';
        actionLabel = 'Open Rahul Sharma Chat';
      } else if (q.includes('policy') || q.includes('extension') || q.includes('medical')) {
        reply = `Per Extension & Hardship Policy (Section 2.5), medical emergency extension requests up to 10 days can be approved by the Collection Manager if past repayment records show ≤1 default in 12 months. Requires your digital authorization.`;
        actionTab = 'rag-knowledge';
        actionLabel = 'View Extension Policy';
      } else if (q.includes('dispute') || q.includes('karan')) {
        reply = `Karan Singh (LN1004) disputes ₹4,000 paid at Mumbai branch counter. Dunning calls have been paused for 24 hours while teller counter vouchers are matched with cash-in-transit records.`;
        actionTab = 'escalations';
        actionLabel = 'View Dispute Ticket';
      } else {
        reply = `Under LoanFlow collection guidelines, active borrowers are monitored through automated WhatsApp and IVR channels with strict compliance to RBI 8 AM - 7 PM contact hours. You can inspect customer dossiers or configure cadence rules anytime.`;
        actionTab = 'overview';
        actionLabel = 'Go to Dashboard';
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: reply,
          actionTab,
          actionLabel,
        },
      ]);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center text-purple-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">LoanFlow AI Copilot</h3>
              <p className="text-[11px] text-purple-200">Policy & Portfolio Intelligence</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                m.sender === 'user' ? 'items-end' : 'items-start'
              } max-w-[90%] ${m.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}
            >
              <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1 px-1">
                {m.sender === 'ai' ? (
                  <span className="font-semibold text-purple-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Copilot
                  </span>
                ) : (
                  <span className="font-semibold text-slate-700">Priya Parihar</span>
                )}
              </div>

              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                }`}
              >
                <p>{m.text}</p>

                {m.actionTab && m.actionLabel && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        onNavigateToTab(m.actionTab!);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-[11px] text-blue-600 hover:text-blue-800"
                    >
                      <span>{m.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 p-2.5 rounded-xl border border-purple-100 w-fit">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing portfolio data & RAG SOPs...</span>
            </div>
          )}
        </div>

        {/* Quick prompt buttons */}
        <div className="p-2 border-t border-slate-100 bg-white flex flex-wrap gap-1.5 text-[11px]">
          {[
            'Summarize overdue loans',
            'What is the status of Rahul Sharma?',
            'What is the policy for medical extensions?',
            'Explain Karan Singh dispute',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors text-left"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask about loans, policies, borrower intent..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
