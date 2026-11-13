import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageSquare,
  IndianRupee,
  Smartphone,
  ShieldCheck,
  Send,
  CheckCheck,
  QrCode,
  User,
} from 'lucide-react';

interface BorrowerScenario {
  id: string;
  name: string;
  loanId: string;
  emiAmount: number;
  dpd: number;
  riskTier: 'Low' | 'Moderate' | 'High';
  customerReply: string;
  aiAction: string;
  finalStatus: string;
}

export const AiRecoverySimulator: React.FC = () => {
  const navigate = useNavigate();
  const scenarios: BorrowerScenario[] = [
    {
      id: 'sc-1',
      name: 'Rahul Verma',
      loanId: 'LN-84920',
      emiAmount: 8500,
      dpd: 5,
      riskTier: 'Moderate',
      customerReply: 'Hi, my salary is delayed by 3 days. Can I pay ₹4,000 now and balance on Friday?',
      aiAction: 'AI approved split payment of ₹4,000 today + automated PTP scheduled for Friday.',
      finalStatus: '₹4,000 Recovered Instantly · Status: PTP Active',
    },
    {
      id: 'sc-2',
      name: 'Ananya Deshmukh',
      loanId: 'LN-91823',
      emiAmount: 14200,
      dpd: 12,
      riskTier: 'High',
      customerReply: 'Please send me the UPI link directly. Paying right now.',
      aiAction: 'Generated single-use Dynamic UPI Intent QR. Real-time bank settlement callback received.',
      finalStatus: '100% Full Payment of ₹14,200 Recovered · Loan Current',
    },
    {
      id: 'sc-3',
      name: 'Vikram Mehta',
      loanId: 'LN-43019',
      emiAmount: 6200,
      dpd: 2,
      riskTier: 'Low',
      customerReply: 'I forgot the due date! Paid through Google Pay just now.',
      aiAction: 'Instant webhook verified payment against UTR reference. Issued official payment receipt.',
      finalStatus: '₹6,200 Settled · Late Fee Waived automatically',
    },
  ];

  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const scenario = scenarios[selectedScenarioIndex];

  // Simulation steps:
  // 0: Idle / Not started
  // 1: Analyzing Borrower & Dispatching AI Reminder (0.8s)
  // 2: Customer Received & Replying (1.6s)
  // 3: AI Resolving & Updating Payment (2.4s)
  // 4: Fully Recovered / Completed!
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const startSimulation = () => {
    setIsRunning(true);
    setSimulationStep(1);

    setTimeout(() => {
      setSimulationStep(2);
    }, 1100);

    setTimeout(() => {
      setSimulationStep(3);
    }, 2200);

    setTimeout(() => {
      setSimulationStep(4);
      setIsRunning(false);
    }, 3400);
  };

  const resetSimulation = () => {
    setSimulationStep(0);
    setIsRunning(false);
  };

  return (
    <section id="simulator" className="py-20 lg:py-28 bg-[#101D25] text-white relative overflow-hidden">
      {/* Background glow & subtle grid */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#168653]/15 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#142630] border border-[#5DE5A1]/30 text-[#5DE5A1] text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Live Simulation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading tracking-tight leading-tight">
            Experience Autonomous Recovery{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5DE5A1] to-emerald-400">
              in 60 Seconds
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300">
            Select a borrower profile and run a live interactive test of RepayX&apos;s AI outreach, intent recognition, and instant UPI reconciliation.
          </p>
        </div>

        {/* Simulation Interactive Card */}
        <div className="bg-[#142630] border border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl">
          {/* Top Controls: Choose Scenario */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#5DE5A1] block mb-1">
                Select Test Borrower Persona:
              </span>
              <div className="flex flex-wrap gap-2">
                {scenarios.map((sc, idx) => (
                  <button
                    key={sc.id}
                    disabled={isRunning}
                    onClick={() => {
                      setSelectedScenarioIndex(idx);
                      resetSimulation();
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selectedScenarioIndex === idx
                        ? 'bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] font-bold shadow-md'
                        : 'bg-[#101D25] text-slate-300 hover:text-white border border-white/10'
                    } disabled:opacity-50`}
                  >
                    {sc.name} ({sc.dpd} DPD)
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {simulationStep === 4 ? (
                <button
                  onClick={resetSimulation}
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Simulation</span>
                </button>
              ) : (
                <button
                  onClick={startSimulation}
                  disabled={isRunning}
                  className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] font-extrabold text-xs shadow-lg shadow-[#168653]/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isRunning ? 'Simulating Recovery...' : 'Start AI Recovery Demo'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Simulator Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
            {/* Left: Borrower Profile & Live Timeline */}
            <div className="lg:col-span-5 space-y-6">
              {/* Profile Card */}
              <div className="bg-[#101D25] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#168653]/30 border border-[#5DE5A1]/30 flex items-center justify-center text-[#5DE5A1] font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{scenario.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{scenario.loanId}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      scenario.riskTier === 'High'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {scenario.riskTier} Risk ({scenario.dpd} DPD)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Overdue Amount</span>
                    <span className="text-base font-extrabold text-[#5DE5A1] font-heading">
                      ₹{scenario.emiAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Communication Channel</span>
                    <span className="font-semibold text-white">WhatsApp & AI Voice</span>
                  </div>
                </div>
              </div>

              {/* Progress Milestones */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Simulation Pipeline Status:
                </div>

                <div className="space-y-2">
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      simulationStep >= 1
                        ? 'bg-[#101D25] border-[#5DE5A1] text-white shadow-md'
                        : 'bg-[#101D25]/40 border-white/5 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#168653]/40 border border-[#5DE5A1]/40 flex items-center justify-center text-[10px] font-bold text-[#5DE5A1]">
                        1
                      </span>
                      <span>1. RepayX Generates Contextual Nudge</span>
                    </div>
                    {simulationStep >= 1 && <CheckCircle2 className="w-4 h-4 text-[#5DE5A1]" />}
                  </div>

                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      simulationStep >= 2
                        ? 'bg-[#101D25] border-[#5DE5A1] text-white shadow-md'
                        : 'bg-[#101D25]/40 border-white/5 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#168653]/40 border border-[#5DE5A1]/40 flex items-center justify-center text-[10px] font-bold text-[#5DE5A1]">
                        2
                      </span>
                      <span>2. Borrower Responds with Intent</span>
                    </div>
                    {simulationStep >= 2 && <CheckCircle2 className="w-4 h-4 text-[#5DE5A1]" />}
                  </div>

                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      simulationStep >= 3
                        ? 'bg-[#101D25] border-[#5DE5A1] text-white shadow-md'
                        : 'bg-[#101D25]/40 border-white/5 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#168653]/40 border border-[#5DE5A1]/40 flex items-center justify-center text-[10px] font-bold text-[#5DE5A1]">
                        3
                      </span>
                      <span>3. AI NLU Approves Settlement / PTP</span>
                    </div>
                    {simulationStep >= 3 && <CheckCircle2 className="w-4 h-4 text-[#5DE5A1]" />}
                  </div>

                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      simulationStep >= 4
                        ? 'bg-[#101D25] border-[#5DE5A1] text-[#5DE5A1] font-bold shadow-md shadow-[#168653]/30'
                        : 'bg-[#101D25]/40 border-white/5 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#5DE5A1] text-[#101D25] flex items-center justify-center text-[10px] font-bold">
                        4
                      </span>
                      <span>4. Ledger Reconciled & Status Updated</span>
                    </div>
                    {simulationStep >= 4 && <CheckCircle2 className="w-4 h-4 text-[#5DE5A1]" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Simulated WhatsApp Live Screen */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-[#0b141a] border border-white/10 p-4 sm:p-5 text-xs text-white min-h-[380px] flex flex-col justify-between shadow-2xl relative">
                {/* Simulated Phone Chrome bar */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#168653] flex items-center justify-center font-bold text-[10px]">
                      RX
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <span>RepayX Collections</span>
                        <CheckCheck className="w-3 h-3 text-[#5DE5A1]" />
                      </div>
                      <span className="text-[9px] text-[#5DE5A1]">Automated AI Assistant</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Mock Sandbox</span>
                </div>

                {/* Simulated Conversation Body */}
                <div className="py-4 space-y-3 flex-1 flex flex-col justify-center">
                  {simulationStep === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      <Sparkles className="w-8 h-8 text-[#5DE5A1]/50 mx-auto mb-2 animate-bounce" />
                      <p className="font-medium text-white text-sm">Simulator Ready</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                        Click &quot;Start AI Recovery Demo&quot; to initiate the conversational reminder for {scenario.name}.
                      </p>
                    </div>
                  )}

                  {simulationStep >= 1 && (
                    <div className="max-w-[85%] bg-[#005c4b] text-white p-3 rounded-xl rounded-tl-none space-y-1.5 shadow-sm animate-fadeIn">
                      <p>
                        Dear <strong>{scenario.name}</strong>, reminder from RepayX: Your loan EMI of{' '}
                        <strong>₹{scenario.emiAmount.toLocaleString('en-IN')}</strong> is overdue by{' '}
                        <strong>{scenario.dpd} days</strong>.
                      </p>
                      <div className="p-2 rounded-lg bg-black/30 border border-white/10 flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-[#5DE5A1]" />
                        <span className="text-[10px] text-slate-200">
                          Click here for instant 1-tap Dynamic UPI settlement
                        </span>
                      </div>
                      <div className="text-[8px] text-right text-emerald-200">11:42 AM · Sent</div>
                    </div>
                  )}

                  {simulationStep >= 2 && (
                    <div className="max-w-[80%] ml-auto bg-[#202c33] text-white p-3 rounded-xl rounded-tr-none space-y-1 shadow-sm animate-fadeIn">
                      <p>{scenario.customerReply}</p>
                      <div className="text-[8px] text-right text-slate-400">11:43 AM</div>
                    </div>
                  )}

                  {simulationStep >= 3 && (
                    <div className="max-w-[85%] bg-[#005c4b] text-white p-3 rounded-xl rounded-tl-none space-y-1.5 shadow-sm animate-fadeIn">
                      <div className="text-[10px] font-bold text-[#5DE5A1] flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>RepayX Policy Resolution:</span>
                      </div>
                      <p>{scenario.aiAction}</p>
                      <div className="text-[8px] text-right text-emerald-200">11:43 AM · Approved</div>
                    </div>
                  )}
                </div>

                {/* Final Recovery Result Banner & Refreshed Recovery Summary */}
                {simulationStep === 4 && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#168653] to-[#101D25] border border-[#5DE5A1] text-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[#5DE5A1] uppercase tracking-wider block">
                          Outcome Reconciled & Dashboard Refreshed:
                        </span>
                        <span className="font-bold text-white">{scenario.finalStatus}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#5DE5A1] text-[#101D25] flex items-center justify-center font-bold shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-[#101D25] border border-white/10 text-center text-[10px]">
                      <div>
                        <span className="text-slate-400 block">Ledger Entry</span>
                        <span className="font-bold text-emerald-400">Reconciled</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Delinquency</span>
                        <span className="font-bold text-white">0 Days Past Due</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Channel Verified</span>
                        <span className="font-bold text-[#5DE5A1]">Dynamic UPI Intent</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <span>Illustrative simulation utilizing client-side mock data. Ready to converse with real borrowers?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/whatsapp')}
                className="px-3.5 py-1.5 rounded-lg bg-[#168653] hover:bg-[#157347] text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open Live WhatsApp Hub</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
