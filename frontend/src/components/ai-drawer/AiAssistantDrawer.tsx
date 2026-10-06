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
              <h3 className="text-sm font-bold tracking-tight">RepayX Copilot</h3>
              <p className="text-[11px] text-purple-200">Portfolio queries - powered by the RepayX API</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Copilot"
            className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div ref={thread} role="log" aria-label="Copilot conversation" aria-live="polite" className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
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
                <p role={m.error ? 'alert' : undefined}>{m.text}</p>

                {m.response && (m.response.customer || m.response.customers?.length) ? (
                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                    {(m.response.customers ?? (m.response.customer ? [m.response.customer] : [])).map((customer) => (
                      <button
                        key={customer.customer_id}
                        onClick={() => {
                          onNavigateToTab('risk-customer', String(customer.customer_id));
                          onClose();
                        }}
                        className="flex items-center gap-1 text-left font-semibold text-[11px] text-blue-600 hover:text-blue-800"
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
            <div className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 p-2.5 rounded-xl border border-purple-100 w-fit">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Querying portfolio data...</span>
            </div>
          )}
        </div>

        {/* Quick prompt buttons */}
        <div className="p-2 border-t border-slate-100 bg-white flex flex-wrap gap-1.5 text-[11px]">
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
            aria-label="Ask RepayX Copilot"
            maxLength={500}
            placeholder="Ask about risk, repayments, or a customer ID..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            onClick={() => handleSend()}
            aria-label="Send question"
            disabled={!input.trim() || isTyping}
            className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
