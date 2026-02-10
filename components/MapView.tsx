
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Report, Location } from '../types';
import { Navigation, Loader2 } from 'lucide-react';

interface MapViewProps {
  reports: Report[];
  onSelect: (report: Report) => void;
  onMapClick: (location: Location) => void;
  userLocation: { lat: number, lng: number } | null;
}

const MapView: React.FC<MapViewProps> = ({ reports, onSelect, onMapClick, userLocation }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const getPinColor = (severity: string) => {
    switch(severity) {
      case 'high': return '#dc2626'; // Red
      case 'medium': return '#f97316'; // Orange
      default: return '#1e40af'; // Blue
    }
  };

  const createCustomIcon = (severity: string) => {
    const color = getPinColor(severity);
    return L.divIcon({
      className: 'custom-pin-icon',
      html: `
        <div style="width: 30px; height: 30px; background-color: white; border-radius: 50%; padding: 3px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
          <div style="width: 100%; height: 100%; background-color: ${color}; border-radius: 50%; display: flex; items-center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
              <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
            </svg>
          </div>
          <div style="position: absolute; bottom: -6px; left: 11px; width: 8px; height: 8px; background-color: white; transform: rotate(45deg); box-shadow: 2px 2px 2px -1px rgb(0 0 0 / 0.1);"></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });
  };

  const locateUser = () => {
    if (!mapRef.current) return;
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], 15);
        
        // Update or create user marker
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          userMarkerRef.current = L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: '#3b82f6',
            color: 'white',
            weight: 2,
            fillOpacity: 0.8
          }).addTo(mapRef.current!).bindPopup("You are here");
        }
        
        setIsLocating(false);
      },
      (err) => {
        console.error("Locate error:", err);
        setIsLocating(false);
        alert("Unable to retrieve your location. Please check your GPS settings.");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center (USA) if no location
    const center: L.LatLngExpression = userLocation 
      ? [userLocation.lat, userLocation.lng] 
      : [37.0902, -95.7129];

    mapRef.current = L.map(mapContainerRef.current, {
      center,
      zoom: userLocation ? 13 : 4,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);

    markersRef.current = L.layerGroup().addTo(mapRef.current);

    // Initial positioning marker and auto-centering if userLocation is already known
    if (userLocation) {
      userMarkerRef.current = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 8,
        fillColor: '#3b82f6',
        color: 'white',
        weight: 2,
        fillOpacity: 0.8
      }).addTo(mapRef.current).bindPopup("You are here");
      
      // Auto-focus on render if we have the location
      mapRef.current.setView([userLocation.lat, userLocation.lng], 14);
    }

    // Add click listener for reporting at specific locations
    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      // Small delay to ensure marker clicks take priority
      setTimeout(() => {
        onMapClick({ 
          lat: e.latlng.lat, 
          lng: e.latlng.lng,
          address: "Manually Selected Location" 
        });
      }, 50);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click');
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    reports.forEach(report => {
      const marker = L.marker([report.location.lat, report.location.lng], {
        icon: createCustomIcon(report.severity)
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e); // Prevent map click from firing
        onSelect(report);
      });
      marker.addTo(markersRef.current!);
    });
  }, [reports, onSelect]);

  // Sync user location marker if it changes in App.tsx
  useEffect(() => {
    if (mapRef.current && userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      } else {
        userMarkerRef.current = L.circleMarker([userLocation.lat, userLocation.lng], {
          radius: 8,
          fillColor: '#3b82f6',
          color: 'white',
          weight: 2,
          fillOpacity: 0.8
        }).addTo(mapRef.current).bindPopup("You are here");
      }
    }
  }, [userLocation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full bg-slate-100" />
      
      {/* Tactical Map Controls */}
      <div className="absolute top-4 right-4 z-[40] flex flex-col gap-2">
        <button 
          onClick={locateUser}
          disabled={isLocating}
          className="p-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 text-blue-700 hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
          title="Find My Location"
        >
          {isLocating ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Navigation className="w-6 h-6 fill-current" />
          )}
        </button>
      </div>

      {/* Map Attribution/Status Overlay */}
      <div className="absolute top-4 left-4 z-[40] pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg border border-white/10">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">Global Sector Grid Active</span>
        </div>
      </div>
    </div>
  );
};

export default MapView;
