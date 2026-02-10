
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, MapPin, Loader2, Send, X, AlertTriangle, User, UserX, Film, MapPinned, Edit3, AlertCircle } from 'lucide-react';
import { RaidType, Location, Report } from '../types';
import { analyzeReport } from '../services/geminiService';

interface ReportFormProps {
  onSubmit: (report: Report, file?: File | null) => void;
  onCancel: () => void;
  initialLocation?: Location | null;
}

const ReportForm: React.FC<ReportFormProps> = ({ onSubmit, onCancel, initialLocation }) => {
  const [description, setDescription] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [location, setLocation] = useState<Location | null>(initialLocation || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // If initialLocation changes (though unlikely once open), sync it
  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        alert("File is too large. Please select a file smaller than 20MB.");
        return;
      }
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const fetchLocation = () => {
    setIsLocating(true);
    setLocationError(null);
    setShowManualInput(false);

    const options = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 30000
    };

    const success = (pos: GeolocationPosition) => {
      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        address: "GPS Verified Location"
      });
      setIsLocating(false);
    };

    const error = (err: GeolocationPositionError) => {
      navigator.geolocation.getCurrentPosition(success, (err2) => {
        setIsLocating(false);
        switch(err2.code) {
          case err2.PERMISSION_DENIED:
            setLocationError("Permission Denied");
            break;
          case err2.POSITION_UNAVAILABLE:
            setLocationError("GPS Unavailable");
            setShowManualInput(true);
            break;
          case err2.TIMEOUT:
            setLocationError("Request Timed Out");
            setShowManualInput(true);
            break;
          default:
            setLocationError("Fix Failed");
            setShowManualInput(true);
        }
      }, { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 });
    };

    if (!navigator.geolocation) {
      setIsLocating(false);
      setLocationError("Not Supported");
      setShowManualInput(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(success, error, options);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalLocation = location || (manualLocation ? { lat: 0, lng: 0, address: manualLocation } : null);

    if (!description || !finalLocation) {
      alert("Description and location are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      let mediaData = undefined;
      // We convert to base64 ONLY for the Gemini analysis (AI), 
      // but we pass the raw file to onSubmit for storage.
      if (mediaFile && mediaFile.type.startsWith('image/')) {
        mediaData = {
          data: await fileToBase64(mediaFile),
          mimeType: mediaFile.type
        };
      }

      const analysis = await analyzeReport(description, mediaData);
      
      const newReport: Report = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        description,
        type: analysis.category,
        severity: analysis.severity,
        location: finalLocation,
        // We use previewUrl as a placeholder for UI responsiveness, 
        // but the dataService will overwrite this with the cloud URL.
        mediaUrl: previewUrl || undefined,
        mediaType: mediaFile?.type.startsWith('video') ? 'video' : 'image',
        isAnonymous: isAnonymous,
        categoryAnalysis: analysis.summary,
        comments: []
      };

      onSubmit(newReport, mediaFile);
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocationLocked = !!location || (!!manualLocation && showManualInput);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[95vh] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-50 shrink-0">
          <div className="flex items-center gap-2 text-blue-800">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-bold">New Safety Alert</h2>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-blue-100 rounded-full text-blue-800">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto no-scrollbar">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isAnonymous ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-600'}`}>
                {isAnonymous ? <UserX className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Anonymous Mode</p>
                <p className="text-[10px] text-slate-500 font-medium">Identity hidden from community</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isAnonymous ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isAnonymous ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">What did you see?</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the officers, vehicles, and their actions..."
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="w-full h-28 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">Evidence & Location</label>
              {locationError && !location && (
                <span className="text-[10px] font-black text-red-600 uppercase flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" /> {locationError}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 border-dashed transition-all ${
                  mediaFile && cameraInputRef.current?.files?.length ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 hover:border-blue-400 text-slate-500 bg-white'
                }`}
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">Camera</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 border-dashed transition-all ${
                  mediaFile && galleryInputRef.current?.files?.length ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 hover:border-blue-400 text-slate-500 bg-white'
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">Upload</span>
              </button>

              <button
                type="button"
                onClick={fetchLocation}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 border-dashed transition-all ${
                  location ? 'border-green-600 bg-green-50 text-green-700' : 
                  showManualInput ? 'border-orange-400 bg-orange-50 text-orange-700' :
                  'border-slate-300 hover:border-blue-400 text-slate-500 bg-white'
                }`}
              >
                {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : location ? <MapPinned className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                <span className="text-[10px] font-bold uppercase">{location ? (initialLocation ? 'Map Pick' : 'GPS Locked') : 'Location'}</span>
              </button>
            </div>

            {(showManualInput || locationError) && !location && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <Edit3 className="w-4 h-4 text-orange-600 shrink-0" />
                  <input
                    type="text"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="Enter cross-streets or neighborhood..."
                    className="flex-1 bg-transparent text-sm font-medium outline-none text-orange-900 placeholder:text-orange-300"
                  />
                </div>
                <p className="text-[9px] text-orange-600 font-bold mt-1 ml-1 uppercase">Hardware GPS unavailable. Please enter area manually.</p>
              </div>
            )}

            <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*,video/*" capture="environment" className="hidden" />
            <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
          </div>

          {previewUrl && (
            <div className="relative rounded-2xl overflow-hidden h-48 bg-slate-900 shadow-inner group">
              {mediaFile?.type.startsWith('video') ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  <video src={previewUrl} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors pointer-events-none">
                     <Film className="w-10 h-10 text-white opacity-70" />
                  </div>
                </div>
              ) : (
                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
              )}
              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1.5">
                <span className="text-[8px] font-bold text-white uppercase tracking-widest">
                  {mediaFile?.type.startsWith('video') ? 'Video Evidence' : 'Photo Evidence'}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => { setPreviewUrl(null); setMediaFile(null); }}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg transition-transform active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting || !description || !isLocationLocked}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying Safety Data...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Broadcast Warning
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-500 mt-4 leading-relaxed">
              <strong>Safe Documentation:</strong> {initialLocation ? 'Reporting at selected map point.' : 'Keep moving, stay at a distance.'} Reports are automatically analyzed for community verification.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportForm;
