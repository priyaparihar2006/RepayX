import React, { useState } from 'react';
import {
  MessageSquare,
  Mic,
  Volume2,
  GitBranch,
  Radio,
  Layers,
  ArrowRight,
  CheckCircle2,
  CheckCheck,
  QrCode,
  ShieldAlert,
  Sparkles,
  PhoneCall,
  Clock,
  Send,
  AlertTriangle,
  Play,
  Pause,
  Repeat,
} from 'lucide-react';

export const FeatureShowcase: React.FC = () => {
  // Feature 1: WhatsApp state (Language toggle)
  const [waLanguage, setWaLanguage] = useState<'english' | 'hindi'>('english');

  // Feature 2: Voice state (Playback simulation)
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<'hindi' | 'english'>('hindi');

  // Feature 3: Escalation stage selection
  const [activeEscalationStage, setActiveEscalationStage] = useState<1 | 2 | 3>(1);

  return (
    <section id="features" className="py-20 lg:py-32 bg-white text-[#202B25] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-28 lg:space-y-36">
        {/* Section Master Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#168653]/10 border border-[#168653]/20 text-[#168653] text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Intelligence Suite</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-[#101D25] tracking-tight leading-tight">
            Engineered for Maximum Recovery Rate.{' '}
            <span className="text-[#168653]">Zero Compliance Friction.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#718078]">
            Explore deep-dive technical modules powering RepayX — from conversational WhatsApp AI bots to voice synthesis and rule-governed escalation ladders.
          </p>
        </div>

        {/* ========================================================
            FEATURE 1: AI WHATSAPP ASSISTANT
           ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Text */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#168653] uppercase tracking-wider">
              <MessageSquare className="w-4 h-4" />
              <span>Feature 01 · WhatsApp Business Automation</span>
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-[#101D25] leading-snug">
              Conversational WhatsApp Assistant with Instant Dynamic UPI
            </h3>
            <p className="text-sm sm:text-base text-[#718078] leading-relaxed">
              Borrowers ignore automated robotic SMS blasts. RepayX initiates polite, context-aware WhatsApp conversations that listen, answer repayment questions, recognize salary delays, and provide instant zero-friction payment links.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#168653] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#101D25]">Bilingual English & Hindi NLU</h4>
                  <p className="text-xs text-[#718078]">Understands Hinglish, informal slang, and intent like &quot;Paise 10 tareekh ko dunga&quot;.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#168653] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#101D25]">Dynamic QR Code & Intent URL</h4>
                  <p className="text-xs text-[#718078]">Pre-fills loan account number and exact overdue amount in GPay, PhonePe, and Paytm.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#168653] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#101D25]">Automatic Promise-to-Pay (PTP) Logging</h4>
                  <p className="text-xs text-[#718078]">Schedules automatic reminders on the borrower&apos;s promised salary date without human caller manual data entry.</p>
                </div>
              </div>
            </div>

            {/* Language Switcher Buttons */}
            <div className="pt-2 flex items-center gap-3 text-xs">
              <span className="font-semibold text-[#101D25]">Interactive Preview Language:</span>
              <button
                onClick={() => setWaLanguage('english')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  waLanguage === 'english'
                    ? 'bg-[#168653] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setWaLanguage('hindi')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  waLanguage === 'hindi'
                    ? 'bg-[#168653] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Hinglish / हिंदी
              </button>
            </div>
          </div>

          {/* Right Simulated WhatsApp Phone */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-sm rounded-[36px] bg-[#101D25] p-3 shadow-2xl border-4 border-[#142630]">
              <div className="rounded-[28px] bg-[#0b141a] overflow-hidden border border-white/10 text-white">
                {/* WhatsApp Top Header */}
                <div className="bg-[#1f2c34] px-4 py-3 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#168653] flex items-center justify-center font-bold text-xs text-white">
                      RX
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <span>RepayX Collections</span>
                        <CheckCheck className="w-3.5 h-3.5 text-[#5DE5A1]" />
                      </div>
                      <span className="text-[10px] text-[#5DE5A1]">Verified Official Business</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">11:42 AM</span>
                </div>

                {/* Conversation Thread */}
                <div className="p-4 space-y-3 min-h-[340px] bg-[#0b141a] text-xs">
                  {/* Timestamp */}
                  <div className="text-center">
                    <span className="text-[10px] bg-[#182229] px-2 py-0.5 rounded text-slate-400">
                      TODAY
                    </span>
                  </div>

                  {/* Outbound AI Reminder */}
                  <div className="max-w-[85%] bg-[#005c4b] text-white p-3 rounded-xl rounded-tl-none space-y-2 shadow-sm">
                    {waLanguage === 'english' ? (
                      <>
                        <p>
                          Dear <strong>Rahul Verma</strong>, your EMI of <strong>₹8,500</strong> for Loan #LN-84920 is overdue by 5 days.
                        </p>
                        <p className="text-[11px] text-emerald-100">
                          Please tap below to settle securely via UPI without penal interest:
                        </p>
                        <div className="p-2 rounded-lg bg-black/30 border border-white/10 flex items-center gap-2">
                          <QrCode className="w-6 h-6 text-[#5DE5A1] shrink-0" />
                          <div className="text-[10px] leading-tight">
                            <div className="font-bold text-white">Instant UPI Intent</div>
                            <span className="text-[#5DE5A1]">repayx@axisbank</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p>
                          नमस्ते <strong>Rahul Verma जी</strong>, आपके लोन #LN-84920 की EMI <strong>₹8,500</strong> पिछले 5 दिनों से बकाया है।
                        </p>
                        <p className="text-[11px] text-emerald-100">
                          कृपया पेनल्टी से बचने के लिए नीचे दिए गए UPI लिंक से तुरंत भुगतान करें:
                        </p>
                        <div className="p-2 rounded-lg bg-black/30 border border-white/10 flex items-center gap-2">
                          <QrCode className="w-6 h-6 text-[#5DE5A1] shrink-0" />
                          <div className="text-[10px] leading-tight">
                            <div className="font-bold text-white">तुरंत UPI भुगतान</div>
                            <span className="text-[#5DE5A1]">repayx@axisbank</span>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="text-[9px] text-right text-emerald-200 flex items-center justify-end gap-1">
                      <span>11:40 AM</span>
                      <CheckCheck className="w-3 h-3 text-[#5DE5A1]" />
                    </div>
                  </div>

                  {/* Inbound Borrower Response */}
                  <div className="max-w-[80%] ml-auto bg-[#202c33] text-white p-3 rounded-xl rounded-tr-none space-y-1 shadow-sm">
                    {waLanguage === 'english' ? (
                      <p>
                        Hi, my salary got delayed. Can I pay ₹4,000 today and the remaining ₹4,500 on Friday 15th?
                      </p>
                    ) : (
                      <p>
                        Salary abhi tak aayi nahi hai. Kya main abhi ₹4,000 aur baaki 15 tareekh ko de sakta hoon?
                      </p>
                    )}
                    <div className="text-[9px] text-right text-slate-400">11:41 AM</div>
                  </div>

                  {/* Outbound AI Intelligent Resolution */}
                  <div className="max-w-[85%] bg-[#005c4b] text-white p-3 rounded-xl rounded-tl-none space-y-1.5 shadow-sm">
                    {waLanguage === 'english' ? (
                      <>
                        <div className="text-[10px] font-bold text-[#5DE5A1] flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>RepayX AI Approved Split Arrangement</span>
                        </div>
                        <p>
                          Thank you Rahul. We have accepted your split plan! Here is the link for partial payment of ₹4,000 today. Balance scheduled for Friday.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-[10px] font-bold text-[#5DE5A1] flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>AI अनुमोदित किश्त योजना</span>
                        </div>
                        <p>
                          धन्यवाद राहुल जी। हमने आपकी सुविधा के लिए आज ₹4,000 स्वीकार कर लिए हैं। शेष ₹4,500 के लिए 15 तारीख को रिमाइंडर भेजा जाएगा।
                        </p>
                      </>
                    )}
                    <div className="text-[9px] text-right text-emerald-200 flex items-center justify-end gap-1">
                      <span>11:42 AM</span>
                      <CheckCheck className="w-3 h-3 text-[#5DE5A1]" />
                    </div>
                  </div>
                </div>

                {/* Bottom WhatsApp bar */}
                <div className="bg-[#1f2c34] p-2.5 flex items-center justify-between text-slate-400 text-[11px] border-t border-white/5">
                  <span className="italic">Type a message...</span>
                  <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-white">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            FEATURE 2: AI VOICE REMINDERS
           ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Visual: Futuristic Voice Synthesizer Visual */}
          <div className="lg:col-span-6 order-2 lg:order-1 flex justify-center">
            <div className="w-full max-w-md bg-[#101D25] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white">
              <div className="absolute -top-16 -left-16 w-36 h-36 bg-[#5DE5A1]/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#168653]/40 border border-[#5DE5A1]/30 flex items-center justify-center text-[#5DE5A1]">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-heading">RepayX Neural Voice Agent</h4>
                    <span className="text-[10px] text-emerald-400">Real-Time Speech Synthesis</span>
                  </div>
                </div>

                <div className="flex gap-1.5 text-[10px]">
                  <button
                    onClick={() => setVoiceLanguage('hindi')}
                    className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                      voiceLanguage === 'hindi' ? 'bg-[#168653] text-white' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    Hindi
                  </button>
                  <button
                    onClick={() => setVoiceLanguage('english')}
                    className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                      voiceLanguage === 'english' ? 'bg-[#168653] text-white' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Animated Waveform Display */}
              <div className="my-8 p-6 rounded-2xl bg-[#142630] border border-white/10 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-1.5 h-16 w-full">
                  {[24, 45, 18, 60, 35, 70, 52, 85, 40, 68, 30, 78, 44, 90, 55, 30, 48, 65, 20].map(
                    (height, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 rounded-full transition-all duration-300 ${
                          isPlayingVoice
                            ? 'bg-gradient-to-t from-[#168653] to-[#5DE5A1] animate-pulse'
                            : 'bg-slate-700'
                        }`}
                        style={{
                          height: isPlayingVoice ? `${height}%` : '20%',
                          animationDelay: `${idx * 0.05}s`,
                        }}
                      />
                    )
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => setIsPlayingVoice(!isPlayingVoice)}
                    className="p-3 rounded-full bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] font-bold shadow-lg shadow-[#168653]/30 hover:scale-105 transition-all cursor-pointer"
                    aria-label={isPlayingVoice ? 'Pause voice preview' : 'Play voice preview'}
                  >
                    {isPlayingVoice ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                  <span className="text-xs font-semibold text-slate-300">
                    {isPlayingVoice ? 'Simulating Active Voice Stream...' : 'Click to preview AI voice generation'}
                  </span>
                </div>
              </div>

              {/* Spoken Script Transcription */}
              <div className="p-3.5 rounded-xl bg-[#0b141a] border border-white/5 text-xs text-slate-300 font-mono">
                <div className="text-[10px] text-[#5DE5A1] uppercase font-bold mb-1 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Synthesized Outbound Dialogue:</span>
                </div>
                {voiceLanguage === 'hindi' ? (
                  <p className="leading-relaxed">
                    &quot;नमस्ते राहुल जी, मैं RepayX से बोल रही हूँ। आपके लोन की EMI देय तिथि से आगे निकल चुकी है। क्या आप आज शाम तक भुगतान कर पाएंगे?&quot;
                  </p>
                ) : (
                  <p className="leading-relaxed">
                    &quot;Hello Rahul, this is an automated reminder from RepayX. Your EMI of ₹8,500 is currently overdue. Would you like us to send an instant UPI link to your WhatsApp?&quot;
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Text */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#168653] uppercase tracking-wider">
              <PhoneCall className="w-4 h-4" />
              <span>Feature 02 · AI Voice Automation</span>
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-[#101D25] leading-snug">
              Human-Quality Multilingual Voice Reminders at Infinite Scale
            </h3>
            <p className="text-sm sm:text-base text-[#718078] leading-relaxed">
              Replace costly, stressed call center outbound teams with ultra-polite, latency-free AI voice callers. RepayX conducts thousands of concurrent borrower calls within regulatory contact windows.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#168653] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#101D25]">Regulatory Contact Window Guard</h4>
                  <p className="text-xs text-[#718078]">Hard-enforced 08:00 to 19:00 contact bounds conforming strictly to RBI fair recovery codes.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#168653] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#101D25]">Live Sentiment & Frustration Detection</h4>
                  <p className="text-xs text-[#718078]">Detects borrower distress or disputes, instantly de-escalating and transferring context to senior managers.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#168653] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#101D25]">Automatic Transcription & Call Summaries</h4>
                  <p className="text-xs text-[#718078]">Full speech-to-text auditable transcript stored automatically under the borrower profile.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            FEATURE 3: THREE-STAGE ESCALATION ENGINE
           ======================================================== */}
        <div className="space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#168653] uppercase tracking-wider mb-2">
              <GitBranch className="w-4 h-4" />
              <span>Feature 03 · Policy Governance</span>
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-[#101D25]">
              Three-Stage Autonomous Escalation Ladder
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-[#718078]">
              Delinquent accounts systematically transition through escalating recovery workflows without human oversight errors.
            </p>
          </div>

          {/* Interactive Timeline Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stage 1 */}
            <div
              onClick={() => setActiveEscalationStage(1)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                activeEscalationStage === 1
                  ? 'bg-[#142630] text-white border-[#5DE5A1] shadow-xl shadow-[#168653]/20 -translate-y-1'
                  : 'bg-[#F7FAF8] text-[#202B25] border-[#E5EBE7] hover:border-[#168653]/40'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                  STAGE 01 (DPD 1 - 5)
                </span>
                <span className="text-xs font-bold">Initial Friendly Nudge</span>
              </div>
              <h4 className="text-base font-bold font-heading mb-2">
                Automated Courtesy Notification
              </h4>
              <p className="text-xs opacity-80 leading-relaxed mb-4">
                Polite WhatsApp and SMS reminder with instant Dynamic UPI QR code. Zero penal interest applied; encourages immediate on-time compliance.
              </p>
              <div className="pt-3 border-t border-white/10 text-[11px] font-semibold text-emerald-400 flex items-center justify-between">
                <span>Success Rate: 68%</span>
                <span>Self-Service Recovery</span>
              </div>
            </div>

            {/* Stage 2 */}
            <div
              onClick={() => setActiveEscalationStage(2)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                activeEscalationStage === 2
                  ? 'bg-[#142630] text-white border-[#5DE5A1] shadow-xl shadow-[#168653]/20 -translate-y-1'
                  : 'bg-[#F7FAF8] text-[#202B25] border-[#E5EBE7] hover:border-[#168653]/40'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">
                  STAGE 02 (DPD 6 - 15)
                </span>
                <span className="text-xs font-bold">Follow-up & Restructuring</span>
              </div>
              <h4 className="text-base font-bold font-heading mb-2">
                Conversational Nudge & PTP
              </h4>
              <p className="text-xs opacity-80 leading-relaxed mb-4">
                AI Voice calling paired with interactive WhatsApp bot. Offers split payment schemes and logs Promise-to-Pay dates automatically.
              </p>
              <div className="pt-3 border-t border-white/10 text-[11px] font-semibold text-amber-400 flex items-center justify-between">
                <span>Success Rate: 22%</span>
                <span>Promise-To-Pay Logged</span>
              </div>
            </div>

            {/* Stage 3 */}
            <div
              onClick={() => setActiveEscalationStage(3)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                activeEscalationStage === 3
                  ? 'bg-[#142630] text-white border-[#5DE5A1] shadow-xl shadow-[#168653]/20 -translate-y-1'
                  : 'bg-[#F7FAF8] text-[#202B25] border-[#E5EBE7] hover:border-[#168653]/40'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono">
                  STAGE 03 (DPD 16+)
                </span>
                <span className="text-xs font-bold">Executive Escalation</span>
              </div>
              <h4 className="text-base font-bold font-heading mb-2">
                Manager Review & Legal Notice
              </h4>
              <p className="text-xs opacity-80 leading-relaxed mb-4">
                Flagged in the Executive Authorization Queue. Generates formal OTS (One-Time Settlement) letters and legal notification packs requiring manager sign-off.
              </p>
              <div className="pt-3 border-t border-white/10 text-[11px] font-semibold text-rose-400 flex items-center justify-between">
                <span>Success Rate: 10%</span>
                <span>Executive Sign-Off</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            FEATURE 4: OMNICHANNEL CONVERGENCE ECOSYSTEM
           ======================================================== */}
        <div className="bg-[#101D25] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#168653]/20 rounded-full blur-[100px] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#5DE5A1] uppercase tracking-wider">
                <Radio className="w-4 h-4" />
                <span>Feature 04 · Omnichannel Convergence</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                One Unified Intelligence Engine. Four Delivery Channels.
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                RepayX intelligently switches between WhatsApp, SMS, Email, and Voice based on carrier delivery receipts, borrower engagement history, and communication priority.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="font-bold text-xs text-[#5DE5A1]">WhatsApp Cloud API</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">High open rates & dynamic buttons</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="font-bold text-xs text-[#5DE5A1]">AI Voice Calls</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Two-way natural conversational agent</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="font-bold text-xs text-[#5DE5A1]">Carrier DLT SMS</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Universal fallback for feature phones</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="font-bold text-xs text-[#5DE5A1]">Official Email Notices</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Legally compliant loan ledgers & notices</div>
                </div>
              </div>
            </div>

            {/* Right: Visual Converging Hub Graphic */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-dashed border-[#5DE5A1]/30 flex items-center justify-center p-4">
                {/* Central AI Hub */}
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#168653] to-[#5DE5A1] p-1 shadow-2xl shadow-[#168653]/60 flex items-center justify-center text-center">
                  <div className="w-full h-full bg-[#101D25] rounded-full flex flex-col items-center justify-center p-2">
                    <Sparkles className="w-5 h-5 text-[#5DE5A1] mb-1" />
                    <span className="text-[10px] font-extrabold uppercase tracking-tight text-white">
                      RepayX AI
                    </span>
                    <span className="text-[8px] text-emerald-400">Core Engine</span>
                  </div>
                </div>

                {/* Satellite Channel Nodes */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#142630] border border-[#5DE5A1]/40 text-xs font-bold text-white shadow-lg flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#5DE5A1]" />
                  <span>WhatsApp</span>
                </div>

                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#142630] border border-white/20 text-xs font-bold text-white shadow-lg flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-400" />
                  <span>Carrier SMS</span>
                </div>

                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#142630] border border-white/20 text-xs font-bold text-white shadow-lg flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI Voice</span>
                </div>

                <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#142630] border border-white/20 text-xs font-bold text-white shadow-lg flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Email</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            FEATURE 5: INTELLIGENT RISK DASHBOARD & PORTFOLIO HEALTH
           ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Text */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#168653] uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Feature 05 · Risk & Portfolio Intelligence</span>
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-[#101D25] leading-snug">
              Comprehensive Portfolio Health & Delinquency Tracking
            </h3>
            <p className="text-sm sm:text-base text-[#718078] leading-relaxed">
              Maintain granular oversight of overdue customer accounts, borrower payment statuses, delivery confirmations, and recovery trends in one unified operational interface.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#168653] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#101D25]">Overdue Customer Account Stratification</h4>
                  <p className="text-xs text-[#718078]">Categorizes delinquent portfolios across DPD 1–5, DPD 6–30, and DPD 30+ delinquency stages with balance visibility.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#168653] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#101D25]">Real-Time Payment Status & PTP Monitoring</h4>
                  <p className="text-xs text-[#718078]">Logs borrower payment promises, tracks partial installment updates, and reconciles incoming settlements.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#168653] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#101D25]">Delivery Performance & Channel Verification</h4>
                  <p className="text-xs text-[#718078]">Audit carrier receipts and delivery confirmations across WhatsApp, SMS, AI Voice, and Email.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual: Risk Analytics Card Mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-lg bg-[#142630] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl text-white space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#168653]/30 border border-[#5DE5A1]/20 flex items-center justify-center text-[#5DE5A1]">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-heading">Portfolio Delinquency Health</h4>
                    <span className="text-[10px] text-slate-400">Live Risk Distribution</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#168653]/30 text-[#5DE5A1] border border-[#5DE5A1]/20">
                  Sample Benchmarks
                </span>
              </div>

              {/* DPD Stage Distribution */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Stage 1 · DPD 1–5 (Polite Nudge)</span>
                  <span className="text-[#5DE5A1] font-mono">62% (38,120)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '62%' }} />
                </div>

                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Stage 2 · DPD 6–15 (Restructuring & PTP)</span>
                  <span className="text-amber-400 font-mono">26% (16,210)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '26%' }} />
                </div>

                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Stage 3 · DPD 16+ (Manager Escalation)</span>
                  <span className="text-rose-400 font-mono">12% (7,173)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '12%' }} />
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 rounded-xl bg-[#101D25] border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 block">Delivery Rate</span>
                  <span className="text-base font-extrabold text-[#5DE5A1] font-heading mt-0.5 block">98.2%</span>
                </div>
                <div className="p-3 rounded-xl bg-[#101D25] border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 block">PTP Commitments</span>
                  <span className="text-base font-extrabold text-blue-400 font-heading mt-0.5 block">1,840</span>
                </div>
                <div className="p-3 rounded-xl bg-[#101D25] border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 block">Recovered</span>
                  <span className="text-base font-extrabold text-emerald-400 font-heading mt-0.5 block">₹12.5L+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
