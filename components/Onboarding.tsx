
import React, { useState } from 'react';
import { Shield, Map as MapIcon, BookOpen, Smartphone, ChevronRight, X, Bell, BellRing, Share, MoreVertical, Globe, Heart, Check } from 'lucide-react';
import { playAlertSound } from '../utils/audio';

interface OnboardingProps {
  onComplete: () => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'vi', label: 'Tiếng Việt' }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedLang, setSelectedLang] = useState(() => localStorage.getItem('icewatch_lang') || 'en');
  const [notifState, setNotifState] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const totalSteps = 4;

  const handleLanguageSelect = (code: string) => {
    setSelectedLang(code);
    localStorage.setItem('icewatch_lang', code);
  };

  const handleRequestNotifs = async () => {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    setNotifState(permission);
    if (permission === 'granted') {
      playAlertSound();
    }
  };

  const handleDonate = () => {
    window.open('https://www.zeffy.com/en-US/donation-form/icestorm-bringing-transparency-and-safety-to-our-communities', '_blank');
  };

  const steps = [
    {
      icon: <Globe className="w-12 h-12 text-blue-600" />,
      title: "Tactical Intelligence",
      description: "Defaulting to the sector map, you'll see verified activity in real-time. Please select your preferred language for the grid."
    },
    {
      icon: <Shield className="w-12 h-12 text-blue-600" />,
      title: "Secure Reporting",
      description: "Document officer sightings anonymously. Gemini AI verifies your data to create high-confidence community warnings."
    },
    {
      icon: <BellRing className="w-12 h-12 text-blue-600" />,
      title: "Proximity Alerts",
      description: "Get immediate push notifications and high-pitch tones if federal activity is detected within your custom safety radius."
    },
    {
      icon: <Smartphone className="w-12 h-12 text-blue-600" />,
      title: "Final Configuration",
      description: "Add Ice Watch to your home screen and enable system-level alerts to stay safe in the field."
    }
  ];

  const currentStepData = steps[step - 1];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl flex flex-col relative max-h-[90vh]">
        <div className="absolute top-0 left-0 right-0 h-1.5 flex gap-1 p-4">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={`h-full flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-blue-600' : 'bg-slate-100'}`} 
            />
          ))}
        </div>

        <div className="p-8 pt-12 flex-1 flex flex-col items-center text-center overflow-y-auto no-scrollbar">
          <div className="p-5 bg-blue-50 rounded-[2rem] mb-6 animate-in zoom-in-50 duration-500">
            {currentStepData.icon}
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
            {currentStepData.title}
          </h2>
          
          <p className="text-slate-500 font-medium leading-relaxed mb-6">
            {currentStepData.description}
          </p>

          {step === 1 && (
            <div className="w-full grid grid-cols-1 gap-2 mb-4">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`flex items-center justify-between px-5 py-3 rounded-2xl border-2 transition-all ${
                    selectedLang === lang.code 
                      ? 'border-blue-600 bg-blue-50 text-blue-700' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="font-bold">{lang.label}</span>
                  {selectedLang === lang.code && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="w-full space-y-3 mb-6">
              <button 
                onClick={handleRequestNotifs}
                className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2.5 transition-all font-black uppercase text-[11px] tracking-widest ${
                  notifState === 'granted' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-blue-700 text-white shadow-lg shadow-blue-100'
                }`}
              >
                {notifState === 'granted' ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {notifState === 'granted' ? 'Alerts Enabled' : 'Enable Safety Alerts'}
              </button>

              <button
                onClick={handleDonate}
                className="w-full py-3.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl flex items-center justify-center gap-2.5 transition-all font-black uppercase text-[11px] tracking-widest hover:bg-rose-100"
              >
                <Heart className="w-4 h-4 fill-current" />
                Support the Mission
              </button>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">Mobile Installation</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Share className="w-4 h-4 text-slate-400" />
                    <p className="text-[11px] font-bold text-slate-700">iOS: Share &gt; Add to Home Screen</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                    <p className="text-[11px] font-bold text-slate-700">Android: Menu &gt; Install App</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          {step < totalSteps ? (
            <button 
              onClick={() => setStep(step + 1)}
              className="w-full py-4 bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-blue-800 transition-all active:scale-95 shadow-xl shadow-blue-100"
            >
              Next Strategy <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={onComplete}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200"
            >
              Initialize Grid
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
