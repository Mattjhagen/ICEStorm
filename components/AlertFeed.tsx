
import React from 'react';
import { Report } from '../types';
import { Clock, MapPin, AlertCircle, ChevronRight, UserX, Ghost, Zap } from 'lucide-react';

interface AlertFeedProps {
  reports: Report[];
  onSelect: (report: Report) => void;
}

const AlertFeed: React.FC<AlertFeedProps> = ({ reports, onSelect }) => {
  const sortedReports = [...reports].sort((a, b) => b.timestamp - a.timestamp);

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  const isExpired = (ts: number) => {
    return (Date.now() - ts) > (2 * 60 * 60 * 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
           <div className="bg-red-600 px-2 py-0.5 rounded text-[9px] font-black text-white animate-pulse flex items-center gap-1">
              <Zap className="w-2 h-2 fill-current" />
              LIVE
           </div>
           <h3 className="font-black text-[11px] text-slate-900 uppercase tracking-widest">Intelligence Briefing</h3>
        </div>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold uppercase">
          {reports.length} Reports
        </span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {sortedReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Ghost className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">No alerts matching filters.</p>
            <p className="text-slate-400 text-[10px] mt-1 font-medium italic">Safety persists in this sector.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {sortedReports.map((report) => {
              const expired = isExpired(report.timestamp);
              return (
                <button
                  key={report.id}
                  onClick={() => onSelect(report)}
                  className={`w-full p-4 flex gap-4 hover:bg-slate-50 transition-colors text-left group ${expired ? 'opacity-60 grayscale-[0.5]' : ''}`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden border-2 ${
                      expired ? 'bg-slate-200 border-slate-100 text-slate-400' :
                      report.severity === 'high' ? 'bg-red-100 border-red-50 text-red-600' : 
                      report.severity === 'medium' ? 'bg-orange-100 border-orange-50 text-orange-600' : 'bg-blue-100 border-blue-50 text-blue-600'
                    }`}>
                      {report.mediaUrl ? (
                        <img src={report.mediaUrl} className="w-full h-full object-cover" alt="Evidence" />
                      ) : (
                        <AlertCircle className="w-7 h-7" />
                      )}
                    </div>
                    {report.isAnonymous && (
                      <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-lg border border-slate-100">
                        <UserX className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded ${
                          expired ? 'bg-slate-100 text-slate-500' :
                          report.severity === 'high' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'
                        }`}>
                          {report.type}
                        </span>
                        {expired && (
                          <span className="text-[8px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Archived</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                        <Clock className="w-3 h-3" />
                        {formatTime(report.timestamp)}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight mb-2">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span className="truncate">{report.location.address || "Live Zone"}</span>
                    </div>
                  </div>

                  <div className="self-center">
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-red-500 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertFeed;
