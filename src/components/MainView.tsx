import React from 'react';
import { AppItem, RelatedFile, ScanStatus } from '../types';
import { 
  Play, Trash2, CheckCircle2, ShieldAlert, Folder, File, 
  Loader2, Monitor, ExternalLink, ShieldCheck, EyeOff, AlertCircle,
  Ghost, Zap, Wind
} from 'lucide-react';
import { motion } from 'motion/react';

interface MainViewProps {
  app: AppItem | null;
  scanStatus: ScanStatus;
  results: RelatedFile[];
  onScan: () => void;
  onToggleFile: (id: string) => void;
  onToggleAll: (selected: boolean) => void;
  onUninstall: () => void;
  onReveal: (path: string) => void;
  onRequestPermissions: () => void;
  isRemoving: boolean;
}

export const MainView: React.FC<MainViewProps> = ({
  app,
  scanStatus,
  results,
  onScan,
  onToggleFile,
  onToggleAll,
  onUninstall,
  onReveal,
  onRequestPermissions,
  isRemoving
}) => {
  if (!app && !scanStatus.isDeepScan && !scanStatus.scanning) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-white">
        <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
          <Monitor size={48} className="text-gray-300" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Select an App to Start</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Choose an application from the sidebar to scan for associated files and safely remove them.
        </p>
      </div>
    );
  }

  const selectedCount = results.filter(f => f.selected).length;
  const totalSize = results
    .filter(f => f.selected)
    .reduce((acc, f) => acc + parseSize(f.size), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Permissions Banner */}
      {!scanStatus.permissionsGranted && (
        <div className="bg-amber-50 border-b border-amber-100 px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} className="text-amber-600" />
            <p className="text-xs text-amber-800 font-medium">
              Limited access. Grant <span className="font-bold">Full Disk Access</span> to find all hidden residue.
            </p>
          </div>
          <button 
            onClick={onRequestPermissions}
            className="text-[10px] font-bold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors uppercase tracking-wider"
          >
            Grant Permissions
          </button>
        </div>
      )}

      {/* Header */}
      <div className={`p-8 border-b border-gray-100 ${scanStatus.isDeepScan ? 'bg-blue-50/20' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex gap-6">
            {scanStatus.isDeepScan ? (
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 overflow-hidden">
                <Zap size={40} className="text-white fill-white" />
              </div>
            ) : app ? (
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm border overflow-hidden ${
                app.isOrphaned ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className={app.isOrphaned ? 'text-amber-500' : 'text-blue-500'}>
                  {app.isOrphaned ? <Ghost size={40} /> : <Monitor size={40} />}
                </div>
              </div>
            ) : null}
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {scanStatus.isDeepScan ? 'Deep Residue Scan' : app?.name}
                </h1>
                {app?.isOrphaned && !scanStatus.isDeepScan && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase tracking-widest">
                    Orphaned / Ghost
                  </span>
                )}
                {scanStatus.isDeepScan && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-widest">
                    Global Search
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-2 font-mono">
                {scanStatus.isDeepScan ? 'Hunting orphaned files across common directories' : app?.bundleId}
              </p>
              <div className="flex gap-2">
                {!scanStatus.isDeepScan && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-600 uppercase tracking-wider">
                    Version 2.4.1
                  </span>
                )}
                {scanStatus.permissionsGranted && (
                  <span className="px-2 py-0.5 bg-green-50 rounded text-[10px] font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={10} /> Full Access
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2 mb-2 p-1 bg-gray-100 rounded-lg">
              <span className="text-[9px] font-bold text-gray-400 uppercase px-2">Safety Mode</span>
              <button 
                onClick={() => alert("Safety Mode: Critical system files are automatically hidden and protected.")}
                className="w-8 h-4 bg-blue-600 rounded-full relative"
              >
                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
              </button>
            </div>
            
            {!scanStatus.scanning && results.length === 0 && app && (
              <button
                onClick={onScan}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
              >
                <Play size={16} fill="currentColor" />
                Scan Files
              </button>
            )}
            
            {results.length > 0 && !scanStatus.scanning && (
              <button
                onClick={onUninstall}
                disabled={selectedCount === 0 || isRemoving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all shadow-lg ${
                  selectedCount > 0 
                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                }`}
              >
                {isRemoving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isRemoving ? 'Removing...' : scanStatus.isDeepScan ? `Clean Selected (${selectedCount})` : `Uninstall Selected (${selectedCount})`}
              </button>
            )}
          </div>
        </div>

        {scanStatus.scanning && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-500">
                {scanStatus.isDeepScan ? 'Hunting for ghosts...' : 'Scanning system and hidden items...'}
              </span>
              <span className="text-xs font-bold text-blue-600">{Math.round(scanStatus.progress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${scanStatus.progress}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-gray-400 font-mono truncate">
              {scanStatus.currentPath}
            </p>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!scanStatus.scanning && results.length > 0 && (
          <>
            <div className="px-8 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => onToggleAll(true)}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <button 
                  onClick={() => onToggleAll(false)}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Deselect All
                </button>
              </div>
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
                {scanStatus.isDeepScan ? `Found ${results.length} orphaned items` : `Found ${results.length} associated items`} ({formatSize(totalSize)})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    <th className="px-8 py-3 w-10"></th>
                    <th className="px-2 py-3">Item Name & Reason</th>
                    <th className="px-4 py-3 w-32">Category</th>
                    <th className="px-4 py-3 w-24 text-center">Risk</th>
                    <th className="px-8 py-3 text-right w-24">Size</th>
                    <th className="px-8 py-3 w-16 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((file) => (
                    <tr 
                      key={file.id} 
                      className={`group hover:bg-gray-50 transition-colors cursor-pointer ${file.selected ? 'bg-blue-50/30' : ''}`}
                      onClick={() => onToggleFile(file.id)}
                    >
                      <td className="px-8 py-3" onClick={(e) => e.stopPropagation()}>
                        <div 
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            file.selected 
                              ? 'bg-blue-600 border-blue-600' 
                              : 'bg-white border-gray-300'
                          }`}
                          onClick={() => onToggleFile(file.id)}
                        >
                          {file.selected && <CheckCircle2 size={10} className="text-white" />}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          {file.type === 'directory' ? (
                            <Folder size={16} className="text-blue-400 fill-blue-50" />
                          ) : (
                            <File size={16} className="text-gray-400" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-700 truncate">{file.path}</p>
                              {file.isHidden && (
                                <span className="flex items-center gap-1 text-[8px] font-bold text-gray-400 uppercase tracking-tighter bg-gray-100 px-1 rounded">
                                  <EyeOff size={8} /> Hidden
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium">
                              {file.reason}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                          {file.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded border ${
                          file.risk === 'low' 
                            ? 'bg-green-50 text-green-700 border-green-100' 
                            : file.risk === 'medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          {file.risk}
                        </span>
                      </td>
                      <td className="px-8 py-3 text-right text-xs font-medium text-gray-500 font-mono">
                        {file.size}
                      </td>
                      <td className="px-8 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReveal(file.path);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all opacity-0 group-hover:opacity-100"
                          title="Reveal in Finder"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!scanStatus.scanning && results.length === 0 && (app || scanStatus.isDeepScan) && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-40">
            {scanStatus.isDeepScan ? (
              <>
                <Wind size={48} className="text-gray-300 mb-4" />
                <p className="text-sm text-gray-500">Your Mac is clean. No ghosts found.</p>
              </>
            ) : (
              <>
                <ShieldAlert size={48} className="text-gray-300 mb-4" />
                <p className="text-sm text-gray-500">Ready to scan for files...</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper to parse size strings for summation
const parseSize = (sizeStr: string): number => {
  const [val, unit] = sizeStr.split(' ');
  const num = parseFloat(val);
  if (unit === 'MB') return num * 1024 * 1024;
  if (unit === 'KB') return num * 1024;
  if (unit === 'GB') return num * 1024 * 1024 * 1024;
  return num;
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
};
