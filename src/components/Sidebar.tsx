import React from 'react';
import { Search, Plus, Monitor, Ghost, Zap } from 'lucide-react';
import { AppItem } from '../types';
import * as Icons from 'lucide-react';

interface SidebarProps {
  apps: AppItem[];
  selectedAppId: string | null;
  onSelectApp: (app: AppItem) => void;
  onAddManual: () => void;
  onDeepScan: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  apps,
  selectedAppId,
  onSelectApp,
  onAddManual,
  onDeepScan,
  searchQuery,
  onSearchChange
}) => {
  return (
    <div className="w-72 flex flex-col h-full bg-black/5 border-r border-black/10 backdrop-blur-xl">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h1 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Applications</h1>
          <button 
            onClick={onAddManual}
            className="p-1.5 rounded-md hover:bg-black/5 text-gray-500 transition-colors"
            title="Add manually"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white/50 border border-black/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {apps.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Monitor className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-xs text-gray-400">No applications found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {apps.map((app) => {
              const IconComponent = (Icons as any)[app.icon] || (app.isOrphaned ? Ghost : Monitor);
              return (
                <button
                  key={app.id}
                  onClick={() => onSelectApp(app)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
                    selectedAppId === app.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-black/5 text-gray-700'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${
                    selectedAppId === app.id 
                      ? 'bg-white/20' 
                      : app.isOrphaned ? 'bg-amber-100' : 'bg-white shadow-sm'
                  }`}>
                    <IconComponent size={16} className={app.isOrphaned && selectedAppId !== app.id ? 'text-amber-600' : ''} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{app.name}</p>
                      {app.isOrphaned && (
                        <span className={`text-[8px] font-bold uppercase tracking-tighter px-1 rounded ${
                          selectedAppId === app.id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                        }`}>
                          Ghost
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] truncate ${selectedAppId === app.id ? 'text-blue-100' : 'text-gray-400'}`}>
                      {app.path}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-black/5">
        <button 
          onClick={onDeepScan}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 rounded-xl transition-all font-semibold text-xs border border-blue-600/20"
        >
          <Zap size={14} className="fill-blue-700" />
          Deep Residue Scan
        </button>
      </div>
    </div>
  );
};
