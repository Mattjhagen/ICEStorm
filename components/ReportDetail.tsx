
import React, { useState, useEffect, useRef } from 'react';
import { Report, Comment, Location } from '../types';
import { X, MapPin, Clock, ShieldAlert, BookOpen, Loader2, ExternalLink, UserX, MessageSquare, Send, CheckCircle2, HeartHandshake, Map as MapIcon, Play, Pause, RotateCcw } from 'lucide-react';
import { getRightsGuidance, getNearbySupport } from '../services/geminiService';
import { sharedDataService } from '../services/dataService';

interface ReportDetailProps {
  report: Report;
  onClose: () => void;
  onAddComment: (comment: Comment) => void;
  userLocation?: Location | null;
}

const ReportDetail: React.FC<ReportDetailProps> = ({ report, onClose, onAddComment, userLocation }) => {
  const [rightsInfo, setRightsInfo] = useState<string | null>(null);
  const [supportInfo, setSupportInfo] = useState<{ text: string, links: { title: string, uri: string }[] } | null>(null);
  const [isLoadingRights, setIsLoadingRights] = useState(false);
  const [isLoadingSupport, setIsLoadingSupport] = useState(false);
  const [liveComments, setLiveComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isCommentAnon, setIsCommentAnon] = useState(true);
  
  // Video Player State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoadingRights(true);
      setIsLoadingSupport(true);
      setIsLoadingComments(true);
      
      const [guidance, fetchedComments, support] = await Promise.all([
        getRightsGuidance(`${report.type}: ${report.description}`),
        sharedDataService.getComments(report.id),
        getNearbySupport(report.location, userLocation || null)
      ]);
      
      setRightsInfo(guidance);
      setLiveComments(fetchedComments);
      setSupportInfo(support);
      setIsLoadingRights(false);
      setIsLoadingSupport(false);
      setIsLoadingComments(false);
    }

    loadData();

    const unsubscribe = sharedDataService.subscribeToComments(report.id, (payload) => {
      const newComment = payload.new;
      setLiveComments(prev => {
        if (prev.find(c => c.id === newComment.id)) return prev;
        return [...prev, newComment];
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [report.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      text: commentText.trim(),
      timestamp: Date.now(),
      isAnonymous: isCommentAnon,
    };

    setCommentText('');
    await sharedDataService.addComment(report.id, newComment);
  };

  // Video Controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = (Number(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = time;
      setProgress(Number(e.target.value));
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div 
          className="relative h-64 bg-slate-950 shrink-0 group overflow-hidden"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {report.mediaUrl ? (
             report.mediaType === 'video' ? (
                <div className="w-full h-full relative">
                  <video 
                    ref={videoRef}
                    src={report.mediaUrl} 
                    className="w-full h-full object-contain cursor-pointer" 
                    onClick={togglePlay}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleVideoEnd}
                    playsInline
                  />
                  
                  {/* Play/Pause Overlay */}
                  <div 
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${!isPlaying || showControls ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                      className="p-4 bg-black/40 backdrop-blur-sm text-white rounded-full hover:bg-black/60 transition-all active:scale-90 pointer-events-auto"
                    >
                      {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                    </button>
                  </div>

                  {/* Seek Bar & Controls */}
                  <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-transform duration-300 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>
                      
                      <div className="flex-1 relative h-1.5 flex items-center group/seek">
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={progress}
                          onChange={handleSeek}
                          className="w-full h-full appearance-none bg-white/20 rounded-full cursor-pointer accent-blue-500 hover:accent-blue-400"
                          style={{
                            background: `linear-gradient(to right, #3b82f6 ${progress}%, rgba(255,255,255,0.2) ${progress}%)`
                          }}
                        />
                      </div>

                      <button 
                        onClick={() => { if(videoRef.current) videoRef.current.currentTime = 0; setProgress(0); }}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
             ) : (
                <img src={report.mediaUrl} className="w-full h-full object-cover" />
             )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100">
              <ShieldAlert className="w-16 h-16 text-slate-300" />
            </div>
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-20"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
             <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg backdrop-blur-md ${
               report.severity === 'high' ? 'bg-red-600/90' : 
               report.severity === 'medium' ? 'bg-orange-500/90' : 'bg-blue-600/90'
             }`}>
               {report.severity} Severity
             </span>

             {report.isAnonymous && (
               <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur px-3 py-1 rounded-full text-[9px] font-bold text-white uppercase tracking-wider border border-white/20 w-fit">
                 <UserX className="w-3 h-3" />
                 Secure Identity
               </div>
             )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          <section>
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-2xl font-black text-slate-900 tracking-tight">{report.type}</h2>
               <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase">
                 <Clock className="w-3.5 h-3.5" />
                 {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </div>
            </div>
            
            <div className="flex items-start gap-2 text-slate-600 mb-6">
              <MapPin className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
              <p className="font-bold text-sm">{report.location.address || "Live Incident Zone"}</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
               <p className="text-slate-800 leading-relaxed font-medium italic">
                 "{report.description}"
               </p>
            </div>
          </section>

          {/* New Maps Grounding Section */}
          <section className="bg-blue-50/30 rounded-2xl p-6 border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 text-blue-800 mb-4">
              <HeartHandshake className="w-5 h-5" />
              <h3 className="font-black text-lg uppercase tracking-tight">Community Support Resources</h3>
            </div>

            {isLoadingSupport ? (
              <div className="flex items-center gap-3 text-slate-400 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Scanning Nearby Resources...</span>
              </div>
            ) : supportInfo ? (
              <div className="space-y-4">
                <div className="text-slate-700 text-sm leading-relaxed prose prose-blue font-medium">
                  {supportInfo.text}
                </div>
                {supportInfo.links.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-blue-100">
                    <p className="text-[9px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-1">
                      <MapIcon className="w-3 h-3" /> Verified via Google Maps
                    </p>
                    {supportInfo.links.map((link, i) => (
                      <a 
                        key={i} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all group"
                      >
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700">{link.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium italic">No nearby support resources identified.</p>
            )}
          </section>

          <section className="bg-red-50/50 rounded-2xl p-5 border border-red-100">
             <h3 className="text-red-800 font-extrabold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Safety Checklist
             </h3>
             <ul className="grid grid-cols-1 gap-3">
                {[
                  "Maintain 25ft distance from agents",
                  "Record without obstructing flow",
                  "Stay calm and move slowly",
                  "Consult legal guidance below"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-700">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    {item}
                  </li>
                ))}
             </ul>
          </section>

          <section className="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <BookOpen className="w-20 h-20 text-white" />
             </div>
             <div className="flex items-center gap-2 text-white mb-4 relative z-10">
               <BookOpen className="w-5 h-5 text-red-500" />
               <h3 className="font-black text-lg uppercase tracking-tight">Know Your Rights</h3>
             </div>
             
             {isLoadingRights ? (
               <div className="flex items-center gap-3 text-slate-400 py-4 relative z-10">
                 <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                 <span className="text-xs font-bold uppercase tracking-widest">Generating Legal Brief...</span>
               </div>
             ) : (
               <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-line prose prose-invert max-w-none relative z-10 font-medium">
                 {rightsInfo}
               </div>
             )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-lg">Situation Updates</h3>
              <span className="text-[10px] bg-slate-900 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-widest animate-pulse">
                LIVE
              </span>
            </div>

            <div className="space-y-4">
              {isLoadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                </div>
              ) : liveComments.length > 0 ? (
                liveComments.map((comment) => (
                  <div key={comment.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in slide-in-from-left duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          {comment.isAnonymous ? 'Secure Source' : 'Verified Member'}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 font-medium">{comment.text}</p>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No situation updates yet</p>
                </div>
              )}
              <div ref={commentsEndRef} />
            </div>

            <form onSubmit={handleSubmitComment} className="pt-2">
              <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden focus-within:border-slate-300 transition-all shadow-sm">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Provide an update for the community..."
                  className="w-full p-4 text-sm focus:outline-none resize-none h-20 placeholder:text-slate-400"
                />
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCommentAnon(!isCommentAnon)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest transition-all ${
                      isCommentAnon ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCommentAnon ? 'ANONYMOUS' : 'PUBLIC'}
                  </button>
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="p-2 bg-blue-600 text-white rounded-xl active:scale-90 transition-transform disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
           <button 
             onClick={onClose}
             className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-black transition-all"
           >
             Return to Grid
           </button>
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;
