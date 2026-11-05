import React, { useState } from 'react';
import {
  CheckCircle2,
  Globe,
  Languages,
  MessageSquare,
  Pause,
  Play,
  Send,
  Sparkles,
  Volume2,
  X,
  Zap,
} from 'lucide-react';

export type LanguageCode = 'hinglish' | 'hindi' | 'english' | 'marathi' | 'tamil' | 'telugu' | 'gujarati';

interface TemplateOption {
  tone: 'polite' | 'reminder' | 'urgent' | 'settlement';
  label: string;
}

const TEMPLATES: Record<
  LanguageCode,
  Record<'polite' | 'reminder' | 'urgent' | 'settlement', string>
> = {
  hinglish: {
    polite:
      'Namaste {name} ji, RepayX se gentle update. Aapki loan {loanId} ki EMI Rs {amount} ki due date {dueDate} hai. Bina kisi late fees ke pay karne ke liye yahan tap karein: {upiLink}',
    reminder:
      'Hello {name} ji, aapki monthly EMI Rs {amount} pending chal rahi hai. Aage credit score safe rakhne ke liye kripya aaj hi clear karein. Quick UPI link: {upiLink}',
    urgent:
      'URGENT: {name} ji, aapka loan account {loanId} overdue ho gaya hai. Legal escalation se bachne ke liye agle 24 ghante mein Rs {amount} jama karein. Link: {upiLink}',
    settlement:
      'Special Offer: {name} ji, RepayX Management aapko loan {loanId} par 10% instant discount offer kar rahi hai agar aap aaj hi settle karte hain. Pay here: {upiLink}',
  },
  hindi: {
    polite:
      'नमस्ते {name} जी, RepayX से विनम्र सूचना। आपके ऋण खाता {loanId} की किश्त ₹{amount} देय तिथि {dueDate} को नियत है। समय पर भुगतान हेतु लिंक: {upiLink}',
    reminder:
      'प्रिय {name} जी, आपका मासिक ऋण भुगतान ₹{amount} अभी भी बकाया है। अपना सिबिल स्कोर सुरक्षित रखने के लिए आज ही भुगतान करें: {upiLink}',
    urgent:
      'अति आवश्यक सूचना: {name} जी, आपका ऋण खाता {loanId} गंभीर रूप से अतिदेय है। विधिक कार्यवाही से बचने हेतु तत्काल भुगतान करें: {upiLink}',
    settlement:
      'विशेष निपटान योजना: {name} जी, आपके खाते पर विलंब शुल्क में छूट प्रदान की जा रही है। आज ही पूर्ण निपटान करें: {upiLink}',
  },
  english: {
    polite:
      'Dear {name}, this is a gentle reminder from RepayX. Your EMI installment of ₹{amount} for Loan ID {loanId} is due on {dueDate}. Pay instantly via UPI: {upiLink}',
    reminder:
      'Dear {name}, your monthly installment of ₹{amount} remains unpaid. Please clear it today to safeguard your credit rating: {upiLink}',
    urgent:
      'FINAL NOTICE: Dear {name}, Loan ID {loanId} is overdue. Kindly remit ₹{amount} within 24 hours to prevent credit bureau reporting and legal transfer: {upiLink}',
    settlement:
      'One-Time Settlement Offer: Dear {name}, an exclusive 10% concession is approved on your overdue balance if settled today: {upiLink}',
  },
  marathi: {
    polite:
      'नमस्कार {name} जी, RepayX कडून विनंती. आपल्या कर्ज खाते {loanId} चा हप्ता ₹{amount} देय दिनांक {dueDate} आहे. त्वरित भरण्यासाठी: {upiLink}',
    reminder:
      'प्रिय {name} जी, आपला मासिक हप्ता ₹{amount} अद्याप प्रलंबित आहे. आपला क्रेडिट स्कोअर चांगला ठेवण्यासाठी कृपया आजच भरा: {upiLink}',
    urgent:
      'अत्यंत तातडीची नोटीस: {name} जी, आपले कर्ज खाते {loanId} थकीत झाले आहे. पुढील कारवाई टाळण्यासाठी २४ तासात भरा: {upiLink}',
    settlement:
      'विशेष सेटलमेंट ऑफर: {name} जी, आजच पूर्ण कर्ज निकाली काढण्यासाठी सवलत उपलब्ध आहे: {upiLink}',
  },
  tamil: {
    polite:
      'வணக்கம் {name}, RepayX நினைவூட்டல். உங்கள் கடன் {loanId} தவணை தொகை ₹{amount} செலுத்த கடைசி நாள் {dueDate}. செலுத்த: {upiLink}',
    reminder:
      'அன்புள்ள {name}, உங்கள் மாதத் தவணை ₹{amount} நிலுவையில் உள்ளது. உங்கள் கிரெடிட் ஸ்கோரைப் பாதுகாக்க உடனே செலுத்தவும்: {upiLink}',
    urgent:
      'முக்கிய அறிவிப்பு: {name}, உங்கள் கடன் {loanId} தவணை தவறிவிட்டது. சட்ட நடவடிக்கைகளைத் தவிர்க்க உடனே செலுத்தவும்: {upiLink}',
    settlement:
      'சிறப்பு சமரச சலுகை: {name}, உங்கள் நிலுவைத் தொகையை இன்றே செலுத்தி சிறப்பு தள்ளுபடி பெறுங்கள்: {upiLink}',
  },
  telugu: {
    polite:
      'నమస్కారం {name} గారు, RepayX రిమైండర్. మీ లోన్ {loanId} కిస్తీ ₹{amount} చెల్లించాల్సిన తేదీ {dueDate}. చెల్లింపు లింక్: {upiLink}',
    reminder:
      'డియర్ {name} గారు, మీ నెలవారీ కిస్తీ ₹{amount} పెండింగ్‌లో ఉంది. మీ క్రెడిట్ స్కోర్ దెబ్బతినకుండా ఉండేందుకు ఇప్పుడే చెల్లించండి: {upiLink}',
    urgent:
      'అత్యవసర సూచన: {name} గారు, మీ లోన్ ఖాతా ఓవర్‌డ్యూ అయ్యింది. చట్టపరమైన సమస్యలు నివారించడానికి వెంటనే చెల్లించండి: {upiLink}',
    settlement:
      'ప్రత్యేక సెటిల్‌మెంట్ ఆఫర్: {name} గారు, మీ బకాయిపై ప్రత్యేక తగ్గింపుతో నేడే రుణ విముక్తి పొందండి: {upiLink}',
  },
  gujarati: {
    polite:
      'નમસ્તે {name} જી, RepayX તરફથી નમ્ર રીમાઇન્ડર. તમારી લોન {loanId} નો હપ્તો ₹{amount} તારીખ {dueDate} ના રોજ બાકી છે. ચૂકવણી કરવા માટે: {upiLink}',
    reminder:
      'પ્રિય {name} જી, તમારો માસિક હપ્તો ₹{amount} બાકી છે. ક્રેડિટ સ્કોર સુરક્ષિત રાખવા માટે કૃપા કરીને આજે જ ચૂકવો: {upiLink}',
    urgent:
      'તાકીદની નોટિસ: {name} જી, તમારું લોન ખાતું {loanId} અતિદેય થયેલ છે. કાયદાકીય કાર્યવાહી ટાળવા તાત્કાલિક ચૂકવણી કરો: {upiLink}',
    settlement:
      'ખાસ સેટલમેન્ટ સ્કીમ: {name} જી, તમારો બાકી હપ્તો આજે જ ક્લિયર કરી ખાસ છૂટ મેળવો: {upiLink}',
  },
};

const LANGUAGES: { code: LanguageCode; label: string; native: string; flag: string }[] = [
  { code: 'hinglish', label: 'Hinglish', native: 'हिंग्लिश', flag: '🇮🇳' },
  { code: 'hindi', label: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { code: 'english', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'marathi', label: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { code: 'tamil', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'telugu', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'gujarati', label: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
];

interface MultiLanguageOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrowerName?: string;
  amount?: number;
  loanId?: string;
  dueDate?: string;
  onDispatch?: (msg: string, lang: string) => void;
}

export const MultiLanguageOutreachModal: React.FC<MultiLanguageOutreachModalProps> = ({
  isOpen,
  onClose,
  borrowerName = 'Rahul Sharma',
  amount = 8500,
  loanId = 'LN1001',
  dueDate = '30 Sep 2026',
  onDispatch,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('hinglish');
  const [tone, setTone] = useState<'polite' | 'reminder' | 'urgent' | 'settlement'>('polite');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  if (!isOpen) return null;

  const rawTemplate = TEMPLATES[selectedLang][tone];
  const compiledMessage = rawTemplate
    .replace('{name}', borrowerName)
    .replace('{loanId}', loanId)
    .replace('{amount}', amount.toLocaleString('en-IN'))
    .replace('{dueDate}', dueDate)
    .replace('{upiLink}', `https://pay.repayx.in/${loanId.toLowerCase()}`);

  const handlePlayVoice = () => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(compiledMessage);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      if (selectedLang === 'hindi') utterance.lang = 'hi-IN';
      else if (selectedLang === 'tamil') utterance.lang = 'ta-IN';
      else if (selectedLang === 'telugu') utterance.lang = 'te-IN';
      else if (selectedLang === 'gujarati') utterance.lang = 'gu-IN';
      else if (selectedLang === 'marathi') utterance.lang = 'mr-IN';
      else utterance.lang = 'en-IN';

      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback simulation
      setIsPlayingAudio(true);
      setTimeout(() => setIsPlayingAudio(false), 4000);
    }
  };

  const handleDispatch = () => {
    setDispatchedSuccess(true);
    if (onDispatch) {
      onDispatch(compiledMessage, selectedLang);
    }
    setTimeout(() => {
      setDispatchedSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#E7EBE3] animate-scaleUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#173D22] via-[#245C35] to-[#1E4D2C] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#B5F078] text-[#173D22]">
              Vernacular AI Engine
            </span>
            <span className="text-xs text-white/80">Regional Collection Intelligence</span>
          </div>
          <h2 className="text-xl font-bold font-heading flex items-center gap-2">
            <Languages className="w-5 h-5 text-[#B5F078]" />
            Regional & Hinglish Multi-Language Outreach
          </h2>
          <p className="text-xs text-white/70 mt-1">
            Boost recovery response by up to +42% by messaging borrowers in their native tongue or conversational Hinglish.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {dispatchedSuccess ? (
            <div className="text-center py-8 space-y-3 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-[#EDF5E5] text-[#245C35] mx-auto flex items-center justify-center border-2 border-[#B5F078]">
                <CheckCircle2 className="w-10 h-10 text-[#245C35]" />
              </div>
              <h3 className="text-lg font-bold text-[#171A17]">Dispatched Successfully!</h3>
              <p className="text-xs text-[#777E77]">
                Localized message sent to <strong>{borrowerName}</strong> in <strong>{selectedLang.toUpperCase()}</strong>.
              </p>
            </div>
          ) : (
            <>
              {/* Language Selector Pills */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#777E77] block mb-2">
                  Select Regional Language (7 Languages Supported)
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLang(lang.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        selectedLang === lang.code
                          ? 'bg-[#245C35] text-white shadow-sm ring-2 ring-[#B5F078]'
                          : 'bg-[#F8FAF6] text-[#171A17] hover:bg-[#EDF5E5] border border-[#E7EBE3]'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                      <span className="text-[10px] opacity-75 font-normal">({lang.native})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone Selection */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#777E77] block mb-2">
                  Communication Tone & Recovery Stage
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'polite', label: 'Polite Check-in', desc: 'Pre-due / Day 1' },
                    { key: 'reminder', label: 'Friendly Follow-up', desc: 'Day 3 - 7' },
                    { key: 'urgent', label: 'Urgent Overdue', desc: 'Day 15+' },
                    { key: 'settlement', label: 'OTS Concession', desc: 'Day 30+' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTone(t.key as any)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        tone === t.key
                          ? 'bg-[#EDF5E5] border-[#245C35] text-[#245C35]'
                          : 'bg-white border-[#E7EBE3] text-[#777E77] hover:border-[#D1E8BC]'
                      }`}
                    >
                      <div className="font-bold text-xs text-[#171A17]">{t.label}</div>
                      <div className="text-[10px] text-[#777E77]">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Live Preview Card */}
              <div className="p-4 rounded-2xl bg-[#F8FAF6] border border-[#E7EBE3] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#171A17]">
                    <MessageSquare className="w-4 h-4 text-[#245C35]" />
                    Live WhatsApp / SMS Preview
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#E7EBE3] text-[#777E77]">
                    {selectedLang.toUpperCase()} · {tone.toUpperCase()}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#E7EBE3] text-xs leading-relaxed text-[#171A17] shadow-sm font-sans whitespace-pre-wrap">
                  {compiledMessage}
                </div>

                {/* AI Audio Voice Note Synthesizer */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E7EBE3]">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handlePlayVoice}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isPlayingAudio
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-[#245C35] text-white hover:bg-[#1E4D2C]'
                      }`}
                      title="Listen to synthesized borrower voice note"
                    >
                      {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div>
                      <div className="text-xs font-bold text-[#171A17] flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-[#245C35]" />
                        Synthesize AI Voice Note ({selectedLang.toUpperCase()})
                      </div>
                      <div className="text-[10px] text-[#777E77]">
                        {isPlayingAudio ? 'Speaking in regional dialect...' : 'Click play to simulate conversational voice call'}
                      </div>
                    </div>
                  </div>

                  {/* Soundwave bars animation */}
                  <div className="flex items-center gap-1 h-5">
                    {[12, 20, 8, 24, 16, 28, 14, 18, 10].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-200 ${
                          isPlayingAudio ? 'bg-[#245C35] animate-bounce' : 'bg-[#E7EBE3]'
                        }`}
                        style={{
                          height: isPlayingAudio ? `${h}px` : '6px',
                          animationDelay: `${i * 80}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold bg-[#F2F4EE] hover:bg-[#E5E9E0] text-[#171A17] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispatch}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#245C35] hover:bg-[#1E4D2C] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Send className="w-4 h-4 text-[#B5F078]" />
                  Dispatch Multi-Lingual Message
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
