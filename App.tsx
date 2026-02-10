
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from './components/Header';
import AlertFeed from './components/AlertFeed';
import MapView from './components/MapView';
import ReportForm from './components/ReportForm';
import ReportDetail from './components/ReportDetail';
import Onboarding from './components/Onboarding';
import FilterBar, { TimeFilter } from './components/FilterBar';
import { Report, RaidType, Location, Comment } from './types';
import { getDistance } from './utils/location';
import { playAlertSound } from './utils/audio';
import { sharedDataService } from './services/dataService';
import { Plus, ShieldCheck, BellRing, Settings, WifiOff, Map as MapIcon, List, BellOff, Server, Cpu, CheckCircle2, AlertCircle, Database as DbIcon, X, Loader2, RefreshCw, Mail, LifeBuoy, Zap, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  // Defaulting to 'map' view on load as requested
  const [viewMode, setViewMode] = useState<'feed' | 'map'>('map');
  const [showForm, setShowForm] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('icewatch_tutorial_seen'));
  const [pendingLocation, setPendingLocation] = useState<Location | null>(null);
  
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const userLocationRef = useRef<Location | null>(null);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCloudActive, setIsCloudActive] = useState(sharedDataService.isConfigured());
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const [recentAlert, setRecentAlert] = useState<Report | null>(null);
  
  const [notificationRadius, setNotificationRadius] = useState<number>(() => {
    const saved = localStorage.getItem('icewatch_radius');
    return saved ? parseInt(saved, 10) : 5;
  });

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkAndAlert = useCallback(async (report: Report) => {
    if (!userLocationRef.current) return;
    
    const distance = getDistance(
      userLocationRef.current.lat, 
      userLocationRef.current.lng, 
      report.location.lat, 
      report.location.lng
    );

    if (distance <= notificationRadius) {
      // Audio always tries to play
      playAlertSound();
      
      // In-app visual alert
      setRecentAlert(report);
      setTimeout(() => setRecentAlert(null), 10000);

      // Reliable Service Worker Notification
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(
          report.severity === 'high' ? "⚠️ CRITICAL SECTOR THREAT" : "ICE WATCH: ACTIVITY DETECTED", 
          {
            body: `${report.type} reported ${distance.toFixed(1)}mi from your location. Use extreme caution.`,
            icon: './logo.svg',
            badge: './logo.svg',
            tag: `alert-${report.id}`,
            vibrate: [300, 100, 300, 100, 300],
            data: { reportId: report.id }
          } as any
        );
      }
    }
  }, [notificationRadius]);

  const loadReports = useCallback(async (isSilent = false) => {
    const configured = sharedDataService.isConfigured();
    setIsCloudActive(configured);

    if (configured) {
      if (!isSilent) setIsRefreshing(true);
      try {
        const cloudReports = await sharedDataService.getReports();
        
        if (cloudReports && cloudReports.length > 0) {
          setReports(prev => {
            const merged = [...cloudReports];
            prev.forEach(local => {
              if (!merged.find(c => c.id === local.id)) {
                merged.push(local);
              }
            });
            const sorted = merged.sort((a, b) => b.timestamp - a.timestamp);
            localStorage.setItem('icewatch_reports', JSON.stringify(sorted));
            return sorted;
          });
        }
      } catch (err) {
        console.error("Failed to sync with grid:", err);
      } finally {
        if (!isSilent) setIsRefreshing(false);
      }
    } else {
      const saved = localStorage.getItem('icewatch_reports');
      if (saved) setReports(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    loadReports();

    if (sharedDataService.isConfigured()) {
      const unsubscribe = sharedDataService.subscribeToReports((payload) => {
        const newReport = payload.new;
        setReports(prev => {
          if (prev.find(r => r.id === newReport.id)) return prev;
          const updated = [newReport, ...prev];
          localStorage.setItem('icewatch_reports', JSON.stringify(updated));
          return updated;
        });
        checkAndAlert(newReport);
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [loadReports, checkAndAlert]);

  useEffect(() => {
    if (!isCloudActive) return;
    const interval = setInterval(() => {
      if (navigator.onLine) {
        loadReports(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isCloudActive, loadReports]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Location error:", err),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const selectedReport = useMemo(() => 
    reports.find(r => r.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const [selectedTypes, setSelectedTypes] = useState<RaidType[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('active');

  const filteredReports = useMemo(() => {
    const now = Date.now();
    const activeThreshold = 2 * 60 * 60 * 1000;
    const expiredThreshold = 24 * 60 * 60 * 1000;

    return reports.filter((report) => {
      const age = now - report.timestamp;
      if (timeFilter === 'active' && age > activeThreshold) return false;
      if (timeFilter === 'expired' && (age <= activeThreshold || age > expiredThreshold)) return false;
      if (timeFilter === 'past' && age <= expiredThreshold) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(report.type)) return false;
      if (selectedSeverities.length > 0 && !selectedSeverities.includes(report.severity)) return false;
      return true;
    });
  }, [reports, selectedTypes, selectedSeverities, timeFilter]);

  const handleAddReport = async (report: Report, file?: File | null) => {
    setReports(prev => {
      if (prev.find(r => r.id === report.id)) return prev;
      return [report, ...prev];
    });

    if (isCloudActive) {
      // Pass the file to the service to handle upload + DB insert
      const success = await sharedDataService.createReport(report, file);
      if (!success) {
        setSyncError("Cloud Sync Failed - Post is local only.");
        setTimeout(() => setSyncError(null), 5000);
      }
    }
    
    setPendingLocation(null);
    setShowForm(false);
    setSelectedReportId(report.id); 
  };

  const handleAddComment = async (reportId: string, comment: Comment) => {
    setReports(prev => prev.map(r => 
      r.id === reportId 
      ? { ...r, comments: [...(r.comments || []), comment] } 
      : r
    ));

    if (isCloudActive) {
      await sharedDataService.addComment(reportId, comment);
    }
  };

  const handleCompleteTutorial = () => {
    localStorage.setItem('icewatch_tutorial_seen', 'true');
    setShowTutorial(false);
    // Auto-prompt notifications if not granted
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => setNotifPermission(p));
    }
  };

  const handleMapClick = (loc: Location) => {
    setPendingLocation(loc);
    setShowForm(true);
  };

  const projectInfo = sharedDataService.getProjectInfo();

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden select-none">
      {showTutorial && <Onboarding onComplete={handleCompleteTutorial} />}

      <div className="z-[150] pointer-events-none relative">
        {recentAlert && (
          <div 
            onClick={() => setSelectedReportId(recentAlert.id)}
            className="absolute top-4 left-4 right-4 bg-red-600 text-white p-4 rounded-2xl shadow-2xl border-2 border-red-400 flex items-center justify-between pointer-events-auto animate-in slide-in-from-top duration-500 z-[160] cursor-pointer active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl animate-pulse">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Sector Alert Detected</p>
                <p className="text-sm font-bold leading-tight line-clamp-1">{recentAlert.type}: {recentAlert.description}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-50" />
          </div>
        )}

        {notifPermission !== 'granted' && !showTutorial && !recentAlert && (
          <div className="bg-orange-600 text-white px-4 py-2 flex items-center justify-between pointer-events-auto shadow-lg animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-2">
              <BellOff className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Alerts Disabled - Tap to Secure</span>
            </div>
            <button 
              onClick={async () => {
                const p = await Notification.requestPermission();
                setNotifPermission(p);
              }}
              className="bg-white/20 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-tighter hover:bg-white/30"
            >
              Grant
            </button>
          </div>
        )}
        {!isOnline && (
          <div className="bg-blue-700 text-white px-4 py-2 flex items-center justify-between pointer-events-auto shadow-lg">
            <div className="flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Local Mode - Offline</span>
            </div>
          </div>
        )}
      </div>

      <Header 
        onShowInfo={() => setShowInfo(true)} 
        onShowAlerts={() => {}} 
        isOnline={isOnline && isCloudActive}
      />

      <div className="bg-white border-b border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center">
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <FilterBar
            selectedTypes={selectedTypes}
            setSelectedTypes={setSelectedTypes}
            selectedSeverities={selectedSeverities}
            setSelectedSeverities={setSelectedSeverities}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            onRefresh={() => loadReports()}
            isRefreshing={isRefreshing}
          />
        </div>
        <div className="px-4 py-2 flex justify-end border-t border-slate-100 sm:border-t-0 sm:border-l sm:ml-2 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('feed')}
              className={`p-2 rounded-lg flex items-center gap-2 transition-all ${viewMode === 'feed' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}
            >
              <List className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">Feed</span>
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-lg flex items-center gap-2 transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}
            >
              <MapIcon className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">Map</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 relative overflow-hidden bg-white">
        {isRefreshing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-4">
            <Loader2 className="w-3 h-3 animate-spin" />
            Syncing Grid...
          </div>
        )}
        {viewMode === 'feed' ? (
          <AlertFeed reports={filteredReports} onSelect={(r) => setSelectedReportId(r.id)} />
        ) : (
          <MapView 
            reports={filteredReports} 
            onSelect={(r) => setSelectedReportId(r.id)} 
            onMapClick={handleMapClick}
            userLocation={userLocation}
          />
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none z-[60]">
        <div className="max-w-md mx-auto flex items-center justify-between pointer-events-auto">
          <button 
            onClick={() => setShowInfo(true)}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl flex p-1.5 border border-white/50 active:scale-95 transition-transform"
          >
            <div className="px-3 py-2.5 flex items-center gap-2.5 text-slate-900">
               <DbIcon className={`w-4 h-4 ${isCloudActive ? 'text-blue-500 animate-pulse' : 'text-slate-300'}`} />
               <div className="flex flex-col items-start leading-none">
                 <span className="text-[10px] font-black uppercase tracking-widest">
                   {isCloudActive ? 'Ice Watch DB' : 'Standalone'}
                 </span>
                 <span className={`text-[8px] font-bold uppercase tracking-tighter ${isCloudActive ? 'text-blue-600' : 'text-slate-400'}`}>
                   {isCloudActive ? 'Real-time Active' : 'Offline Mode'}
                 </span>
               </div>
            </div>
          </button>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl blur opacity-25"></div>
            <button 
              onClick={() => setShowForm(true)}
              className="relative w-16 h-16 bg-blue-700 hover:bg-blue-800 text-white rounded-2xl flex items-center justify-center shadow-2xl transition-transform active:scale-90"
            >
              <Plus className="w-8 h-8 stroke-[3]" />
            </button>
          </div>

          <button 
            onClick={() => setShowInfo(true)}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-white/50 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {showForm && (
        <ReportForm 
          onSubmit={handleAddReport} 
          onCancel={() => { setShowForm(false); setPendingLocation(null); }} 
          initialLocation={pendingLocation}
        />
      )}
      
      {selectedReport && (
        <ReportDetail 
          report={selectedReport} 
          onClose={() => setSelectedReportId(null)} 
          onAddComment={(comment) => handleAddComment(selectedReport.id, comment)}
          userLocation={userLocation}
        />
      )}

      {showInfo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
           <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-slate-900 no-scrollbar">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-blue-700 mb-2">
                  <div className="p-3 bg-blue-50 rounded-2xl">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">System Status</h2>
                    <p className="text-slate-500 text-sm font-medium">Platform: <span className={isCloudActive ? "text-blue-600 font-bold" : "text-blue-800 font-bold"}>
                      {isCloudActive ? "CONNECTED GRID" : "LOCAL MODE"}
                    </span></p>
                  </div>
                </div>
                <button onClick={() => setShowInfo(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <section className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-700 space-y-3">
                 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2">
                      <Server className="w-3 h-3" />
                      Satellite Link
                    </div>
                    <span className={isCloudActive ? "text-blue-400" : "text-red-400"}>
                      {isCloudActive ? "CONNECTED" : "OFFLINE"}
                    </span>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <p className="text-[9px] text-slate-500 font-bold uppercase">Network Hub</p>
                       <p className="text-xs font-mono">{projectInfo.projectId}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[9px] text-slate-500 font-bold uppercase">DB Layer</p>
                       <p className="text-xs font-mono">Real-time PG</p>
                    </div>
                 </div>
              </section>

              <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <BellRing className="w-5 h-5 text-blue-700" />
                  <h3 className="font-bold text-slate-800">Alert Settings</h3>
                </div>
                
                <button 
                  onClick={async () => {
                    const p = await Notification.requestPermission();
                    setNotifPermission(p);
                    if (p === 'granted') playAlertSound();
                  }}
                  className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all w-full shadow-lg ${
                    notifPermission === 'granted' 
                    ? 'bg-green-600 text-white shadow-green-100' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                  }`}
                >
                  {notifPermission === 'granted' ? 'Notifications Verified' : 'Enable Safety Alerts'}
                </button>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700">Detection Radius</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg font-bold">{notificationRadius} mi</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={notificationRadius} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setNotificationRadius(val);
                      localStorage.setItem('icewatch_radius', val.toString());
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </section>

              {/* Help & Support Section */}
              <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <LifeBuoy className="w-5 h-5 text-blue-700" />
                  <h3 className="font-bold text-slate-800">Support & Feedback</h3>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Experiencing issues with the grid or have safety feedback? Contact our technical response team.
                </p>
                <button 
                  onClick={() => window.location.href = 'mailto:info@icestorm.site?subject=Ice Watch Support'}
                  className="w-full py-3 bg-white border border-blue-200 text-blue-700 font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-all shadow-sm"
                >
                  <Mail className="w-4 h-4" />
                  Email info@icestorm.site
                </button>
              </section>

              <div className="space-y-2">
                <button 
                  onClick={() => setShowInfo(false)}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95"
                >
                  Return to Network
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
