import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainView } from './components/MainView';
import { AppItem, RelatedFile, ScanStatus } from './types';
import { MOCK_APPS, COMMON_PATHS, generateRelatedFiles } from './data';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [apps, setApps] = useState<AppItem[]>(MOCK_APPS);
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<RelatedFile[]>([]);
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    scanning: false,
    progress: 0,
    currentPath: '',
    permissionsGranted: false
  });
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const filteredApps = useMemo(() => {
    return apps.filter(app => 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.bundleId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [apps, searchQuery]);

  const handleSelectApp = (app: AppItem) => {
    setSelectedApp(app);
    setResults([]);
    setScanStatus(prev => ({ ...prev, scanning: false, progress: 0, currentPath: '' }));
  };

  const handleScan = () => {
    if (!selectedApp) return;

    setScanStatus(prev => ({ ...prev, scanning: true, progress: 0, currentPath: '' }));
    setResults([]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setScanStatus(s => ({ ...s, scanning: false, progress: 100 }));
        
        // Include hidden files in results
        const files = generateRelatedFiles(selectedApp);
        setResults(files);
      } else {
        const randomPath = COMMON_PATHS[Math.floor(Math.random() * COMMON_PATHS.length)];
        const isHidden = Math.random() > 0.7;
        const prefix = isHidden ? '.' : '';
        setScanStatus(prev => ({
          ...prev,
          scanning: true,
          progress,
          currentPath: `${randomPath}/${prefix}${selectedApp.bundleId}`
        }));
      }
    }, 200);
  };

  const handleRequestPermissions = () => {
    // Simulate macOS permission request
    const confirm = window.confirm("Cleaner for macOS wants to access 'Full Disk' to find all hidden residue files. Grant access in System Settings?");
    if (confirm) {
      setScanStatus(prev => ({ ...prev, permissionsGranted: true }));
    }
  };

  const handleRevealInFinder = (path: string) => {
    // Simulate "Reveal in Finder"
    alert(`[Simulated] Opening Finder at: ${path}`);
  };

  const handleToggleFile = (id: string) => {
    setResults(prev => prev.map(f => 
      f.id === id ? { ...f, selected: !f.selected } : f
    ));
  };

  const handleToggleAll = (selected: boolean) => {
    setResults(prev => prev.map(f => ({ ...f, selected })));
  };

  const handleUninstallClick = () => {
    setShowConfirm(true);
  };

  const confirmUninstall = () => {
    setShowConfirm(false);
    setIsRemoving(true);
    
    // Simulate removal
    setTimeout(() => {
      setIsRemoving(false);
      setShowSuccess(true);
      
      // If the main app was selected, remove it from the list
      const mainAppFile = results.find(f => f.path === selectedApp?.path && f.selected);
      if (mainAppFile && selectedApp) {
        setApps(prev => prev.filter(a => a.id !== selectedApp.id));
        setSelectedApp(null);
      }
      
      setResults([]);
      
      setTimeout(() => setShowSuccess(false), 3000);
    }, 2000);
  };

  const handleDeepScan = () => {
    setSelectedApp(null);
    setResults([]);
    setScanStatus({
      scanning: true,
      progress: 0,
      currentPath: '',
      permissionsGranted: scanStatus.permissionsGranted,
      isDeepScan: true
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 8;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setScanStatus(s => ({ ...s, scanning: false, progress: 100 }));
        
        // Find orphans (mocking folders that don't have apps)
        const orphans: RelatedFile[] = [
          {
            id: 'orphan-1',
            path: '~/Library/Application Support/Skype',
            size: '45.2 MB',
            type: 'directory',
            selected: true,
            risk: 'medium',
            category: 'Support',
            reason: 'App binary not found in /Applications'
          },
          {
            id: 'orphan-2',
            path: '~/Library/Caches/com.skype.skype',
            size: '128.0 MB',
            type: 'directory',
            selected: true,
            risk: 'low',
            category: 'Cache',
            reason: 'Temporary files from deleted app'
          },
          {
            id: 'orphan-3',
            path: '~/Library/Preferences/com.evernote.Evernote.plist',
            size: '12 KB',
            type: 'file',
            selected: true,
            risk: 'low',
            category: 'Preference',
            reason: 'Settings left by Evernote'
          }
        ];
        setResults(orphans);
      } else {
        const paths = ['/Library/Application Support', '/Library/Caches', '/Library/Containers'];
        const randomPath = paths[Math.floor(Math.random() * paths.length)];
        setScanStatus(prev => ({
          ...prev,
          scanning: true,
          progress,
          currentPath: `Searching orphans in ${randomPath}...`
        }));
      }
    }, 150);
  };

  const handleAddManual = () => {
    const name = prompt('Enter app name:');
    if (name) {
      const newApp: AppItem = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        bundleId: `com.manual.${name.toLowerCase().replace(/\s+/g, '.')}`,
        path: `/Applications/${name}.app`,
        icon: 'Monitor',
        size: 'Unknown'
      };
      setApps(prev => [newApp, ...prev]);
      handleSelectApp(newApp);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f5f7] overflow-hidden font-sans text-gray-900 select-none">
      <Sidebar 
        apps={filteredApps}
        selectedAppId={selectedApp?.id || null}
        onSelectApp={handleSelectApp}
        onAddManual={handleAddManual}
        onDeepScan={handleDeepScan}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <MainView 
        app={selectedApp}
        scanStatus={scanStatus}
        results={results}
        onScan={handleScan}
        onToggleFile={handleToggleFile}
        onToggleAll={handleToggleAll}
        onUninstall={handleUninstallClick}
        onReveal={handleRevealInFinder}
        onRequestPermissions={handleRequestPermissions}
        isRemoving={isRemoving}
      />

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Uninstallation</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to move the selected items for <span className="font-semibold text-gray-800">{selectedApp?.name}</span> to the Trash?
                </p>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-left">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Items to remove:</p>
                  <p className="text-xs text-gray-600 font-medium">
                    {results.filter(f => f.selected).length} files and directories
                  </p>
                </div>
              </div>
              <div className="flex border-t border-gray-100">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmUninstall}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                >
                  Move to Trash
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 bg-green-600 text-white rounded-2xl shadow-xl shadow-green-600/20"
          >
            <CheckCircle2 size={24} />
            <div>
              <p className="text-sm font-bold">Uninstallation Successful</p>
              <p className="text-xs opacity-90">Selected items have been moved to the Trash.</p>
            </div>
            <button onClick={() => setShowSuccess(false)} className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
