import React from 'react';
import {
  MessageSquare,
  Users,
  Send,
  Sparkles,
  CheckCircle2,
  Calendar,
  CreditCard,
  ArrowRight,
  HelpCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from './Modal';

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSendMessage: () => void;
  onNavigateToMessages: () => void;
}

export const HowToUseModal: React.FC<HowToUseModalProps> = ({
  isOpen,
  onClose,
  onOpenSendMessage,
  onNavigateToMessages,
}) => {
  const steps = [
    {
      step: '1',
      title: 'Find who owes a payment',
      desc: 'Look at the Overview dashboard or Borrowers tab. Borrowers are marked as "Overdue" (red), "Due Today" (amber), or "Promise to Pay".',
      icon: Users,
      badge: 'Find Borrower',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      step: '2',
      title: 'Click "Send Message"',
      desc: 'Click the big blue "+ New Message" button anywhere on the screen, or click the "💬 Message" button directly next to any borrower.',
      icon: MessageSquare,
      badge: 'Start Message',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      step: '3',
      title: 'Type or pick an AI template',
      desc: 'You can type your own custom message freely, or tap quick templates like "Send UPI Link", "Salary Follow-up", or "Grace Period Notice".',
      icon: Sparkles,
      badge: 'Write or AI Assist',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      step: '4',
      title: 'Send via WhatsApp or SMS',
      desc: 'Select WhatsApp (recommended) or SMS, preview your text, and click "Send Now". The borrower receives it immediately on their phone.',
      icon: Send,
      badge: 'Instant Delivery',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      step: '5',
      title: 'AI reads their reply & helps you follow up',
      desc: 'When the borrower replies (e.g., "Salary delayed by 5 days"), the AI automatically detects the intent, recommends a follow-up date, and drafts an approval reply.',
      icon: Calendar,
      badge: 'Automated Recovery',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How to Use This Dashboard (Quick Guide)"
      subtitle="Everything you need to know in 30 seconds"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Quick Summary Pill */}
        <div className="p-4 bg-gradient-to-r from-[#516072]/15 via-[#516072]/5 to-slate-50 border border-[#516072]/20 rounded-2xl flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#516072] text-white flex items-center justify-center shrink-0 shadow-sm">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">
              Your Goal as a Collection Manager:
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Help borrowers repay on time by sending polite WhatsApp/SMS reminders, answering their payment delay requests, and scheduling automatic follow-ups.
            </p>
          </div>
        </div>

        {/* 5 Easy Steps */}
        <div className="space-y-3">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="flex items-start gap-4 p-3.5 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/70 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 shadow-xs text-sm">
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="text-sm font-semibold text-slate-900">{item.title}</h5>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                </div>
                <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-1 hidden sm:block" />
              </div>
            );
          })}
        </div>

        {/* Quick Tips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp Link Verified
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Every message includes a secure UPI link so borrowers can pay with PhonePe, Google Pay, or Paytm in 1 click.
            </p>
          </div>
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
            <div className="flex items-center gap-2 text-indigo-800 font-semibold text-xs mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              You Are Always in Control
            </div>
            <p className="text-[11px] text-indigo-700 leading-relaxed">
              AI suggests responses, but you can always edit or approve before sending to ensure 100% policy compliance.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={() => {
              onClose();
              onNavigateToMessages();
            }}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-[#516072]" />
            Open Live Messages
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenSendMessage();
            }}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-[#516072] hover:bg-[#414E5E] rounded-xl transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Try Sending a Message Now
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
