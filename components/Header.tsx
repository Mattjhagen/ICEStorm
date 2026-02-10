
import React from 'react';
import { Shield, Info, LifeBuoy, Heart } from 'lucide-react';

interface HeaderProps {
  onShowInfo: () => void;
  onShowAlerts: () => void;
  isOnline?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onShowInfo, isOnline = true }) => {
  const handleHelpClick = () => {
    window.location.href = 'mailto:info@icestorm.site?subject=Ice Watch Support Request';
  };

  const handleDonateClick = () => {
    window.open('https://www.zeffy.com/en-US/donation-form/icestorm-bringing-transparency-and-safety-to-our-communities', '_blank');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <div className="bg-blue-700 p-1.5 rounded-lg shadow-sm">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">Ice Watch</h1>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} title={isOnline ? "Connected to Grid" : "Offline"}></div>
          </div>
          <p className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Report & Safety Network</p>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <button 
          onClick={handleDonateClick}
          className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors group"
          title="Support our Mission"
        >
          <Heart className="w-5 h-5 group-hover:fill-current transition-all" />
        </button>
        <button 
          onClick={handleHelpClick}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          title="Get Help"
        >
          <LifeBuoy className="w-5 h-5" />
        </button>
        <button 
          onClick={onShowInfo}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          title="System Information"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
