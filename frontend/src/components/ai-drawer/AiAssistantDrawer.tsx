import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, ArrowRight } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import type { QueryResponse } from '../../types/api';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: string, id?: string) => void;
}

interface Message {
  sender: 'ai' | 'user';
  text: string;
  response?: QueryResponse;
  error?: boolean;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const [messages, setMessages] = useState<Message[]>([{
    sender: 'ai',
    text: 'Ask about portfolio risk, repayment history, or a customer by numeric ID. I use the scored portfolio; demo names and birthdays are not available. Each question is answered independently, so include the customer ID in follow-up questions.',
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const thread = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [messages, isTyping, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || query.length > 500 || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setInput('');
    setIsTyping(true);
    try {
      const response = await api.query(query, controller.signal);
      if (!controller.signal.aborted) {
        setMessages((prev) => [...prev, { sender: 'ai', text: response.result, response }]);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessages((prev) => [...prev, {
          sender: 'ai', error: true,
          text: error instanceof ApiError ? error.message : 'The answer could not be loaded. Please try again.',
        }]);
      }
    } finally {
      if (!controller.signal.aborted) setIsTyping(false);
      pending.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#171A17]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col border-l border-[#E7EBE3]">
        {/* Header */}
        <div className="p-4 border-b border-[#E7EBE3] flex items-center justify-between bg-[#245C35] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[#B5F078]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight font-heading">RepayX Copilot</h3>
              <p className="text-[11px] text-white/80">Portfolio queries · powered by the RepayX API</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Copilot"
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div ref={thread} role="log" aria-label="Copilot conversation" aria-live="polite" className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#F5F7F3]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                m.sender === 'user' ? 'items-end' : 'items-start'
              } max-w-[90%] ${m.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}
            >
              <div className="flex items-center gap-1 text-[10px] text-[#777E77] mb-1 px-1">
                {m.sender === 'ai' ? (
                  <span className="font-semibold text-[#245C35] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#245C35]" /> AI Copilot
                  </span>
                ) : (
                  <span className="font-semibold text-[#171A17]">Priya Parihar</span>
                )}
              </div>

              <div
                className={`p-3.5 rounded-[18px] text-xs leading-relaxed shadow-2xs ${
                  m.sender === 'user'
                    ? 'bg-[#245C35] text-white rounded-tr-xs'
                    : 'bg-white border border-[#E7EBE3] text-[#171A17] rounded-tl-xs'
                }`}
              >
                <p role={m.error ? 'alert' : undefined}>{m.text}</p>

                {m.response && (m.response.customer || m.response.customers?.length) ? (
                  <div className="mt-2.5 pt-2.5 border-t border-[#E7EBE3] space-y-2">
                    {(m.response.customers ?? (m.response.customer ? [m.response.customer] : [])).map((customer) => (
                      <button
                        key={customer.customer_id}
                        onClick={() => {
                          onNavigateToTab('risk-customer', String(customer.customer_id));
                          onClose();
                        }}
                        className="flex items-center gap-1 text-left font-semibold text-[11px] text-[#245C35] hover:underline"
                      >
                        Customer {customer.customer_id} - {customer.risk_category} - {customer.risk_score.toFixed(2)}/100
                        <ArrowRight className="w-3 h-3 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-[#245C35] bg-[#EDF5E5] p-3 rounded-full border border-[#D1E8BC] w-fit">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-[#245C35]" />
              <span className="font-medium">Querying portfolio data...</span>
            </div>
          )}
        </div>

        {/* Quick prompt buttons */}
        <div className="p-3 border-t border-[#E7EBE3] bg-white flex flex-wrap gap-1.5 text-[11px]">
          {[
            'How many high-risk customers are there?',
            'What is the average late payment rate?',
            'Which customers frequently pay late?',
            'Show customers with unpaid amounts.',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => void handleSend(prompt)}
              disabled={isTyping}
              className="px-3 py-1 rounded-full bg-[#F5F7F3] hover:bg-[#EDF5E5] text-[#171A17] border border-[#E7EBE3] font-medium transition-colors text-left cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3.5 border-t border-[#E7EBE3] bg-white flex items-center gap-2">
          <input
            type="text"
            aria-label="Ask RepayX Copilot"
            maxLength={500}
            placeholder="Ask about risk, repayments, or a customer ID..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 bg-[#F5F7F3] border border-[#E7EBE3] rounded-full px-4 py-2 text-xs text-[#171A17] placeholder-[#777E77] focus:outline-none focus:ring-2 focus:ring-[#245C35]/20 focus:border-[#245C35] transition-all"
          />
          <button
            onClick={() => handleSend()}
            aria-label="Send question"
            disabled={!input.trim() || isTyping}
            className="p-2.5 rounded-full bg-[#245C35] hover:bg-[#1B4728] disabled:opacity-40 text-white transition-colors cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4 text-[#B5F078]" />
          </button>
        </div>
      </div>
    </div>
  );
};
