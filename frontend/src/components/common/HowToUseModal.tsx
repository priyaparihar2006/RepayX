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
      badgeColor: 'bg-[#EDF5E5] text-[#245C35] border-[#D1E8BC]',
    },
    {
      step: '2',
      title: 'Click "Send Message"',
      desc: 'Click the "+ New Message" button anywhere on the screen, or click the "💬 Message" button directly next to any borrower.',
      icon: MessageSquare,
      badge: 'Start Message',
      badgeColor: 'bg-[#EDF5E5] text-[#245C35] border-[#D1E8BC]',
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
      badgeColor: 'bg-[#EDF5E5] text-[#245C35] border-[#D1E8BC]',
    },
    {
      step: '5',
      title: 'AI reads their reply & helps you follow up',
      desc: 'When the borrower replies (e.g., "Salary delayed by 5 days"), the AI automatically detects the intent, recommends a follow-up date, and drafts an approval reply.',
      icon: Calendar,
      badge: 'Automated Recovery',
      badgeColor: 'bg-[#FEF7EA] text-[#B45309] border-amber-200',
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
        <div className="p-4 bg-[#EDF5E5] border border-[#D1E8BC] rounded-2xl flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#245C35] text-white flex items-center justify-center shrink-0 shadow-xs">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-[#171A17] text-sm font-heading">
              Your Goal as a Collection Manager:
            </h4>
            <p className="text-xs text-[#245C35] mt-1 leading-relaxed font-medium">
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
                className="flex items-start gap-4 p-3.5 bg-[#F5F7F3] hover:bg-[#EDF5E5]/50 border border-[#E7EBE3] rounded-2xl transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-white border border-[#E7EBE3] text-[#245C35] font-bold flex items-center justify-center shrink-0 shadow-xs text-sm">
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="text-sm font-bold text-[#171A17]">{item.title}</h5>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#777E77] mt-1 leading-relaxed">{item.desc}</p>
                </div>
                <Icon className="w-4 h-4 text-[#777E77] shrink-0 mt-1 hidden sm:block" />
              </div>
            );
          })}
        </div>

        {/* Quick Tips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 bg-[#EDF5E5]/70 border border-[#D1E8BC] rounded-2xl">
            <div className="flex items-center gap-2 text-[#245C35] font-bold text-xs mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              WhatsApp Link Verified
            </div>
            <p className="text-[11px] text-[#245C35] leading-relaxed">
              Every message includes a secure UPI link so borrowers can pay with PhonePe, Google Pay, or Paytm in 1 click.
            </p>
          </div>
          <div className="p-3.5 bg-[#EDF5E5]/40 border border-[#D1E8BC]/60 rounded-2xl">
            <div className="flex items-center gap-2 text-[#245C35] font-bold text-xs mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#245C35]" />
              You Are Always in Control
            </div>
            <p className="text-[11px] text-[#777E77] leading-relaxed">
              AI suggests responses, but you can always edit or approve before sending to ensure 100% policy compliance.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E7EBE3]">
          <button
            onClick={() => {
              onClose();
              onNavigateToMessages();
            }}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-[#171A17] hover:bg-[#F5F7F3] bg-white border border-[#E7EBE3] rounded-full transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-[#245C35]" />
            Open Live Messages
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenSendMessage();
            }}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-[#245C35] hover:bg-[#1B4728] rounded-full transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4 text-[#B5F078]" />
            Try Sending a Message Now
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
