import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { voiceApi } from '../../services/api';
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
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ConversationMessage {
  sender: 'ai' | 'borrower';
  badge?: string;
  en: string;
  hi: string;
  time: string;
  hasUpiCard?: boolean;
}

interface RealBorrowerConversation {
  id: 'rahul' | 'nancy' | 'ananya';
  customerName: string;
  phone: string;
  loanId: string;
  amount: string;
  overdueInfo: string;
  avatarText: string;
  tag: string;
  vpa: string;
  messages: ConversationMessage[];
}

const REAL_CONVERSATIONS: RealBorrowerConversation[] = [
  {
    id: 'rahul',
    customerName: 'Rahul Sharma',
    phone: '+91 98201 54321',
    loanId: 'LN1001',
    amount: '₹8,500',
    overdueInfo: '5 days overdue',
    avatarText: 'RS',
    tag: 'Salary Delay · PTP Logged',
    vpa: 'repayx.recovery@icici',
    messages: [
      {
        sender: 'ai',
        time: '10:30 AM',
        en: 'Hello Rahul, your scheduled payment of ₹8,500 for Loan LN1001 was due on 25 September. Please let us know when you expect to complete the payment.',
        hi: 'नमस्ते Rahul जी, लोन LN1001 की आपकी ₹8,500 की EMI 25 सितम्बर को देय थी। कृपया बताएं कि आप भुगतान कब तक पूरा करेंगे।',
      },
      {
        sender: 'borrower',
        time: '11:15 AM',
        en: 'Sir salary late ho gayi hai, 5 din mein payment kar dunga.',
        hi: 'Sir salary late ho gayi hai, 5 din mein payment kar dunga.',
      },
      {
        sender: 'ai',
        time: '11:16 AM',
        badge: 'RepayX AI · PTP Logged (Salary Delay · 94% Confidence)',
        en: 'Thank you for letting us know. We have noted your expected payment timeline. We will follow up with you on 30 September 2026.',
        hi: 'धन्यवाद राहुल जी। हमने आपकी 30 सितम्बर 2026 तक की समय-सीमा नोट कर ली है। हमारी प्रणाली ने फॉलो-अप ऑटो-शेड्यूल कर दिया है।',
      },
      {
        sender: 'borrower',
        time: '09:42 AM',
        en: 'Sure sir, 30 tak 100% ho jayega, direct account se pay karunga.',
        hi: 'Sure sir, 30 tak 100% ho jayega, direct account se pay karunga.',
      },
      {
        sender: 'ai',
        time: '09:44 AM',
        hasUpiCard: true,
        en: 'Noted Rahul! Here is your instant Dynamic UPI Payment Intent QR for your ₹8,500 EMI on loan LN1001. You can scan or tap below to pay directly inside this WhatsApp chat.',
        hi: 'नोट कर लिया राहुल जी! लोन LN1001 की ₹8,500 EMI के लिए आपका इंस्टेंट डायनामिक UPI QR कोड तैयार है। आप सीधे व्हाट्सएप से भुगतान कर सकते हैं।',
      },
    ],
  },
  {
    id: 'nancy',
    customerName: 'Nancy Sharma',
    phone: '+91 70602 00849',
    loanId: '#385057',
    amount: '₹12,000',
    overdueInfo: '40 days overdue · Balance ₹63,502',
    avatarText: 'NS',
    tag: 'Live Database · EMI Balance',
    vpa: 'repayx.recovery@icici',
    messages: [
      {
        sender: 'ai',
        time: '10:00 AM',
        en: 'Hello Nancy, here is your verified RepayX Loan summary for Account #LN_385057:\n\n• Total Loan Sanctioned: ₹100,000.00\n• Total EMI Paid to Date: ₹36,497.49\n• Remaining Overdue Balance: ₹63,502.51\n• Status: 40 days past due\n\nPay securely using UPI, QR, Debit Card, Credit Card or NetBanking:\nhttps://rzp.io/i/plink_385057',
        hi: 'नमस्ते Nancy, आपके ऋण खाता #LN_385057 का सत्यापित विवरण:\n\n• स्वीकृत ऋण: ₹100,000.00\n• कुल जमा राशि: ₹36,497.49\n• शेष बकाया राशि: ₹63,502.51\n• स्थिति: 40 दिन overdue\n\nसुरक्षित भुगतान करें UPI, QR, कार्ड या नेटबैंकिंग द्वारा:\nhttps://rzp.io/i/plink_385057',
      },
      {
        sender: 'borrower',
        time: '10:14 AM',
        en: 'How much EMI is left to repay on my loan? Can I pay right now?',
        hi: 'मेरे लोन पर कुल कितनी EMI बची हुई है? क्या मैं अभी पे कर सकती हूँ?',
      },
      {
        sender: 'ai',
        time: '10:15 AM',
        badge: 'RepayX AI Two-Way NLU · Ledger Match',
        en: 'Hello Nancy, here are your RepayX Loan #385057 details:\n• Total Loan: ₹1,00,000.00\n• Total EMI Paid: ₹36,497.49\n• Remaining EMI Balance Left: ₹63,502.51 (Monthly EMI: ₹12,000.00)',
        hi: 'नमस्ते Nancy, आपके RepayX लोन #385057 का विवरण:\n• कुल लोन: ₹1,00,000.00\n• कुल चुकाया गया: ₹36,497.49\n• कुल शेष EMI: ₹63,502.51 (मासिक किस्त: ₹12,000.00)',
      },
      {
        sender: 'borrower',
        time: '10:18 AM',
        en: 'Please send me QR code to pay my monthly EMI of ₹12,000 right now.',
        hi: 'कृपया मुझे अभी ₹12,000 की मासिक किस्त भरने के लिए QR कोड भेजें।',
      },
      {
        sender: 'ai',
        time: '10:19 AM',
        hasUpiCard: true,
        en: 'Hello Nancy! Here is your verified Dynamic UPI Payment Intent QR for your ₹12,000.00 monthly EMI on loan #385057. Tap below to pay instantly without penal charges.',
        hi: 'नमस्ते Nancy! लोन #385057 की ₹12,000.00 मासिक किस्त के लिए आपका सत्यापित Dynamic UPI QR कोड नीचे तैयार है। सीधे भुगतान के लिए टैप करें।',
      },
    ],
  },
  {
    id: 'ananya',
    customerName: 'Ananya Verma',
    phone: '+91 98112 87654',
    loanId: 'LN1002',
    amount: '₹14,200',
    overdueInfo: '1 day overdue · Consumer Durable',
    avatarText: 'AV',
    tag: 'FD Interest · PTP Confirmed',
    vpa: 'repayx.recovery@icici',
    messages: [
      {
        sender: 'ai',
        time: 'Yesterday, 11:00 AM',
        en: 'Dear Ananya, gentle reminder that your EMI of ₹14,200 for Consumer Durable loan LN1002 was due yesterday.',
        hi: 'नमस्ते Ananya जी, आपके कंज्यूमर ड्यूरेबल लोन LN1002 की ₹14,200 की EMI कल देय थी।',
      },
      {
        sender: 'borrower',
        time: 'Today, 09:30 AM',
        en: "I'll make the payment tomorrow morning around 11 AM once my fixed deposit interest credits.",
        hi: 'मैं कल सुबह 11 बजे फिक्स्ड डिपॉजिट ब्याज क्रेडिट होते ही पूरा भुगतान कर दूंगी।',
      },
      {
        sender: 'ai',
        time: 'Today, 09:32 AM',
        badge: 'RepayX AI · PTP Confirmed (FD Interest · 97% Confidence)',
        hasUpiCard: true,
        en: 'Thank you Ananya. We have registered your commitment to pay ₹14,200 tomorrow by 11:00 AM. Here is your verified Dynamic UPI Payment Intent QR for loan LN1002.',
        hi: 'धन्यवाद Ananya जी। हमने कल सुबह 11:00 बजे तक ₹14,200 भुगतान करने का आपका वादा दर्ज कर लिया है। आपका सत्यापित Dynamic UPI QR कोड नीचे तैयार है।',
      },
    ],
  },
];

export const FeatureShowcase: React.FC = () => {
  const navigate = useNavigate();
  // Feature 1: WhatsApp state (Language toggle & Active real conversation)
  const [waLanguage, setWaLanguage] = useState<'english' | 'hindi'>('english');
  const [activeConvKey, setActiveConvKey] = useState<'rahul' | 'nancy' | 'ananya'>('rahul');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Feature 2: Real Voice state & Web Audio controller
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<'hindi' | 'english'>('hindi');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [loadedAudioUrl, setLoadedAudioUrl] = useState<string | null>(null);

  // Audio lifecycle cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const handleLanguageSwitch = (lang: 'hindi' | 'english') => {
    if (lang === voiceLanguage) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingVoice(false);
    setIsLoadingVoice(false);
    setCurrentTime(0);
    setVoiceError(null);
    setVoiceLanguage(lang);
    setLoadedAudioUrl(null);
  };

  const handleTogglePlay = async () => {
    setVoiceError(null);

    // If currently playing, pause
    if (isPlayingVoice && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingVoice(false);
      return;
    }

    // If audio already loaded and just paused, resume it
    if (audioRef.current && loadedAudioUrl && !audioRef.current.ended && audioRef.current.currentTime > 0) {
      try {
        await audioRef.current.play();
        setIsPlayingVoice(true);
        return;
      } catch {
        // Fall through to re-fetching/reloading if resume failed
      }
    }

    // Load fresh or cached audio via API
    setIsLoadingVoice(true);
    try {
      const data = await voiceApi.getDemoAudio(voiceLanguage);
      const fullUrl = voiceApi.resolveAudioUrl(data.audio_url);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.src = fullUrl;

      audio.onplay = () => {
        setIsPlayingVoice(true);
        setIsLoadingVoice(false);
      };
      audio.onpause = () => {
        setIsPlayingVoice(false);
      };
      audio.onended = () => {
        setIsPlayingVoice(false);
        setCurrentTime(0);
      };
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };
      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };
      audio.onerror = () => {
        setIsLoadingVoice(false);
        setIsPlayingVoice(false);
        setVoiceError('Audio playback failed. Please check network connection or try again.');
      };

      setLoadedAudioUrl(fullUrl);
      if (data.duration_seconds) {
        setDuration(data.duration_seconds);
      }

      await audio.play();
    } catch (err: any) {
      setIsLoadingVoice(false);
      setIsPlayingVoice(false);
      setVoiceError(err?.message || 'Unable to generate speech. Please try again.');
    }
  };

  const handleResetAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingVoice(false);
    setCurrentTime(0);
  };

  const formatAudioTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Feature 3: Escalation stage selection
  const [activeEscalationStage, setActiveEscalationStage] = useState<1 | 2 | 3>(1);

  const activeConv = REAL_CONVERSATIONS.find((c) => c.id === activeConvKey) || REAL_CONVERSATIONS[0];

  const handleCopyUpi = (vpa: string, amount: string, loanId: string) => {
    const upiUri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=RepayX%20Loan%20Recovery&am=${amount.replace(/[^0-9]/g, '')}&cu=INR&tn=${encodeURIComponent(`EMI Payment ${loanId}`)}`;
    navigator.clipboard?.writeText(upiUri);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  return (
    <section id="features" className="scroll-mt-24 py-20 lg:py-32 bg-white text-[#202B25] relative">
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

            {/* Real Borrower Scenario Selector */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#101D25]">Select Real Borrower Conversation:</span>
                <span className="text-[10px] text-[#168653] font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#168653] animate-pulse" />
                  Live RepayX NLU
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {REAL_CONVERSATIONS.map((conv) => {
                  const isSelected = activeConvKey === conv.id;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setActiveConvKey(conv.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#168653]/10 border-[#168653] text-[#101D25] shadow-sm ring-1 ring-[#168653]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#101D25] truncate">{conv.customerName}</span>
                        <span className="text-[10px] font-mono font-bold text-[#168653] shrink-0 ml-1">{conv.amount}</span>
                      </div>
                      <div className="text-[10px] text-[#718078] truncate mt-0.5">{conv.tag}</div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">Loan {conv.loanId}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Switcher Buttons */}
            <div className="pt-1 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-[#101D25]">Dialogue Language:</span>
              <button
                type="button"
                onClick={() => setWaLanguage('english')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  waLanguage === 'english'
                    ? 'bg-[#168653] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setWaLanguage('hindi')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  waLanguage === 'hindi'
                    ? 'bg-[#168653] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Hinglish / हिंदी
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/whatsapp')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#168653] hover:bg-[#157347] text-white text-xs font-bold transition-all shadow-md shadow-[#168653]/20 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Live WhatsApp Assistant</span>
                <ArrowRight className="w-3.5 h-3.5" />
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
                      {activeConv.avatarText}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <span>RepayX Collections</span>
                        <CheckCheck className="w-3.5 h-3.5 text-[#5DE5A1]" />
                      </div>
                      <div className="text-[10px] text-[#5DE5A1] flex items-center gap-1">
                        <span>{activeConv.customerName}</span>
                        <span className="text-slate-400 font-mono">({activeConv.loanId})</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-mono block">11:42 AM</span>
                    <span className="text-[9px] text-[#5DE5A1] font-mono">{activeConv.amount}</span>
                  </div>
                </div>

                {/* Conversation Thread */}
                <div className="p-3.5 space-y-3 max-h-[380px] overflow-y-auto bg-[#0b141a] text-xs">
                  {/* Timestamp */}
                  <div className="text-center">
                    <span className="text-[10px] bg-[#182229] px-2 py-0.5 rounded text-slate-400">
                      TODAY · VERIFIED BORROWER THREAD
                    </span>
                  </div>

                  {activeConv.messages.map((msg, index) => {
                    const isAi = msg.sender === 'ai';
                    const text = waLanguage === 'english' ? msg.en : msg.hi;

                    if (isAi) {
                      return (
                        <div
                          key={index}
                          className="max-w-[88%] bg-[#005c4b] text-white p-3 rounded-xl rounded-tl-none space-y-2 shadow-sm"
                        >
                          {msg.badge && (
                            <div className="text-[10px] font-bold text-[#5DE5A1] flex items-center gap-1">
                              <Sparkles className="w-3 h-3 shrink-0" />
                              <span>{msg.badge}</span>
                            </div>
                          )}
                          <p className="whitespace-pre-line leading-relaxed">{text}</p>

                          {msg.hasUpiCard && (
                            <div className="p-2.5 rounded-xl bg-black/40 border border-[#5DE5A1]/30 space-y-2 mt-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-[#168653]/30 border border-[#5DE5A1]/40 flex items-center justify-center">
                                    <QrCode className="w-4 h-4 text-[#5DE5A1]" />
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-bold text-white flex items-center gap-1">
                                      <span>Dynamic UPI Intent</span>
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-[#5DE5A1] font-mono">
                                        LIVE
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-emerald-200/80 font-mono">{activeConv.vpa}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-black text-[#5DE5A1] font-mono">{activeConv.amount}</div>
                                  <div className="text-[9px] text-slate-300">Loan {activeConv.loanId}</div>
                                </div>
                              </div>

                              <div className="pt-1 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopyUpi(activeConv.vpa, activeConv.amount, activeConv.loanId)}
                                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#168653] hover:bg-[#157347] text-white text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer"
                                >
                                  {copiedUpi ? (
                                    <>
                                      <Check className="w-3 h-3 text-[#5DE5A1]" />
                                      <span>UPI Intent Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Tap to Pay via UPI</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="text-[9px] text-right text-emerald-200 flex items-center justify-end gap-1">
                            <span>{msg.time}</span>
                            <CheckCheck className="w-3 h-3 text-[#5DE5A1]" />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={index}
                        className="max-w-[85%] ml-auto bg-[#202c33] text-white p-3 rounded-xl rounded-tr-none space-y-1 shadow-sm"
                      >
                        <p className="whitespace-pre-line leading-relaxed">{text}</p>
                        <div className="text-[9px] text-right text-slate-400">{msg.time}</div>
                      </div>
                    );
                  })}
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
                    type="button"
                    onClick={() => handleLanguageSwitch('hindi')}
                    className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                      voiceLanguage === 'hindi' ? 'bg-[#168653] text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    Hindi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageSwitch('english')}
                    className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                      voiceLanguage === 'english' ? 'bg-[#168653] text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Animated Waveform Display */}
              <div className="my-8 p-6 rounded-2xl bg-[#142630] border border-white/10 flex flex-col items-center justify-center relative">
                {/* Visual Audio Waveform */}
                <div className="flex items-center justify-center gap-1.5 h-16 w-full">
                  {[24, 45, 18, 60, 35, 70, 52, 85, 40, 68, 30, 78, 44, 90, 55, 30, 48, 65, 20].map(
                    (height, idx) => {
                      const progressRatio = duration > 0 ? currentTime / duration : 0;
                      const barPosition = idx / 19;
                      const hasPlayed = barPosition <= progressRatio;

                      let barStyleClass = 'bg-slate-700';
                      if (isLoadingVoice) {
                        barStyleClass = 'bg-[#5DE5A1]/40 animate-pulse';
                      } else if (isPlayingVoice) {
                        barStyleClass = 'bg-gradient-to-t from-[#168653] to-[#5DE5A1] animate-pulse';
                      } else if (currentTime > 0) {
                        barStyleClass = hasPlayed ? 'bg-[#168653]' : 'bg-slate-700';
                      }

                      return (
                        <span
                          key={idx}
                          className={`w-1.5 rounded-full transition-all duration-200 ${barStyleClass}`}
                          style={{
                            height: isPlayingVoice
                              ? `${Math.max(15, Math.min(100, height + Math.sin(currentTime * 8 + idx) * 20))}%`
                              : currentTime > 0 && hasPlayed
                              ? `${Math.max(25, height * 0.7)}%`
                              : '20%',
                            animationDelay: `${(idx % 5) * 0.1}s`,
                          }}
                        />
                      );
                    }
                  )}
                </div>

                {/* Player Controls & Status */}
                <div className="mt-5 flex items-center justify-between w-full pt-3 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      disabled={isLoadingVoice}
                      className="p-3 rounded-full bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] font-bold shadow-lg shadow-[#168653]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-wait"
                      aria-label={isPlayingVoice ? 'Pause voice audio' : 'Play voice audio'}
                    >
                      {isLoadingVoice ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#101D25]" />
                      ) : isPlayingVoice ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    {currentTime > 0 && (
                      <button
                        type="button"
                        onClick={handleResetAudio}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Replay from beginning"
                        aria-label="Replay audio"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">
                        {isLoadingVoice
                          ? 'Synthesizing Neural Speech...'
                          : isPlayingVoice
                          ? `Playing ${voiceLanguage === 'hindi' ? 'Hindi' : 'English'} Audio...`
                          : currentTime > 0
                          ? 'Paused'
                          : `Listen in ${voiceLanguage === 'hindi' ? 'Hindi' : 'English'}`}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatAudioTime(currentTime)} / {formatAudioTime(duration || (voiceLanguage === 'hindi' ? 7 : 6))}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-[#5DE5A1] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5DE5A1] animate-ping" />
                    <span>Neural Voice</span>
                  </div>
                </div>

                {/* Error Banner */}
                {voiceError && (
                  <div className="mt-3 w-full p-2.5 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{voiceError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="px-2 py-0.5 text-[10px] font-bold bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {/* Spoken Script Transcription */}
              <div className="p-3.5 rounded-xl bg-[#0b141a] border border-white/5 text-xs text-slate-300 font-mono">
                <div className="text-[10px] text-[#5DE5A1] uppercase font-bold mb-1 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Synthesized Outbound Dialogue ({voiceLanguage === 'hindi' ? 'Hindi' : 'English'}):</span>
                </div>
                {voiceLanguage === 'hindi' ? (
                  <p className="leading-relaxed">
                    &quot;नमस्ते राहुल जी, मैं RepayX से बोल रही हूँ। आपके लोन की EMI देय तिथि से आगे निकल चुकी है। क्या आप आज शाम तक भुगतान कर पाएंगे?&quot;
                  </p>
                ) : (
                  <p className="leading-relaxed">
                    &quot;Hello Rahul, this is RepayX calling. Your loan EMI payment is overdue. Would you be able to complete your payment by this evening?&quot;
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

            <div className="pt-2">
              <button
                onClick={() => navigate('/automation')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#168653] hover:bg-[#157347] text-white text-xs font-bold transition-all shadow-md shadow-[#168653]/20 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Configure AI Voice Reminders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
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

          <div className="flex justify-center pt-2">
            <button
              onClick={() => navigate('/escalations')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#168653] hover:bg-[#157347] text-white text-xs font-bold transition-all shadow-md shadow-[#168653]/20 cursor-pointer"
            >
              <GitBranch className="w-4 h-4" />
              <span>Open Live Escalations Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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

              <div className="pt-2">
                <button
                  onClick={() => navigate('/automation')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] text-xs font-extrabold transition-all shadow-md shadow-[#168653]/30 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Configure Multi-Channel Automations</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
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

            <div className="pt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#168653] hover:bg-[#157347] text-white text-xs font-bold transition-all shadow-md shadow-[#168653]/20 cursor-pointer"
              >
                <span>Launch Live Risk Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
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
