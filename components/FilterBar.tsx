
import React from 'react';
import { RaidType } from '../types';
import { Filter, Calendar, AlertTriangle, Tag, X, RefreshCw } from 'lucide-react';

export type TimeFilter = 'active' | 'expired' | 'past' | 'all';

interface FilterBarProps {
  selectedTypes: RaidType[];
  setSelectedTypes: (types: RaidType[]) => void;
  selectedSeverities: string[];
  setSelectedSeverities: (severities: any[]) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (time: TimeFilter) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  selectedTypes,
  setSelectedTypes,
  selectedSeverities,
  setSelectedSeverities,
  timeFilter,
  setTimeFilter,
  onRefresh,
  isRefreshing,
}) => {
  const raidTypes = Object.values(RaidType);
  const severities = ['high', 'medium', 'low'];

  const toggleType = (type: RaidType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const toggleSeverity = (sev: string) => {
    if (selectedSeverities.includes(sev)) {
      setSelectedSeverities(selectedSeverities.filter((s) => s !== sev));
    } else {
      setSelectedSeverities([...selectedSeverities, sev]);
    }
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedSeverities.length > 0 || timeFilter !== 'active';

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedSeverities([]);
    setTimeFilter('active');
  };

  return (
    <div className="bg-white border-b border-slate-200 overflow-x-auto no-scrollbar shadow-sm">
      <div className="flex items-center gap-4 px-4 py-3 min-w-max">
        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`p-2 rounded-xl transition-all ${isRefreshing ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          title="Refresh Feed"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Status Filter */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(['active', 'expired', 'past', 'all'] as TimeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                timeFilter === t
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'active' ? '🔥 Active' : t === 'expired' ? '🕰️ Expired' : t === 'past' ? '📅 History' : 'All'}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        {/* Severity Filters */}
        <div className="flex items-center gap-2">
          {severities.map((sev) => (
            <button
              key={sev}
              onClick={() => toggleSeverity(sev)}
              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase flex items-center gap-1.5 transition-all ${
                selectedSeverities.includes(sev)
                  ? sev === 'high' ? 'bg-red-600 border-red-600 text-white' : 
                    sev === 'medium' ? 'bg-orange-500 border-orange-500 text-white' : 
                    'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${
                sev === 'high' ? 'bg-red-300' : sev === 'medium' ? 'bg-orange-300' : 'bg-blue-300'
              } ${selectedSeverities.includes(sev) ? 'bg-white' : ''}`}></div>
              {sev}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        {/* Type Filters */}
        <div className="flex items-center gap-2">
          {raidTypes.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase transition-all ${
                selectedTypes.includes(type)
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-red-600 uppercase hover:underline ml-2"
          >
            <X className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
