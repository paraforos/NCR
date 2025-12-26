
import { useEffect } from 'react';
import React, { useState, useCallback } from 'react';
import { AppLists, ReportData, defaultLists, initialReportData } from './types';
import { STORAGE_KEY, LOGO_PATH } from './constants';
import NCRForm from './components/NCRForm';
import Settings from './components/Settings';
import ReportArchive from './components/ReportArchive';
import { Wifi, WifiOff, Download, Clock, ListOrdered, FilePlus, AlertCircle } from 'lucide-react';
import { getAllReports } from './services/dbService';

const DRAFT_KEY = 'aspis_ncr_draft_v1';

const LiveClock: React.FC = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const dateFormatter = new Intl.DateTimeFormat('el-GR', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeFormatter = new Intl.DateTimeFormat('el-GR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col items-end leading-none text-blue-900">
      <div className="text-[10px] font-black uppercase tracking-tighter">{dateFormatter.format(now)}</div>
      <div className="text-sm font-black tracking-tighter">{timeFormatter.format(now)}</div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'form' | 'settings' | 'archive'>('form');
  const [lists, setLists] = useState<AppLists>(defaultLists);
  const [reportData, setReportData] = useState<ReportData>(initialReportData);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [appReady, setAppReady] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const allReports = await getAllReports();
      const pending = allReports.filter(r => !r.controlDate || r.controlDate.trim() === "");
      setPendingCount(pending.length);
    } catch (err) {
      console.error("Error fetching pending count", err);
    }
  }, []);

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

  useEffect(() => {
    if (JSON.stringify(reportData) === JSON.stringify(initialReportData)) return;
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(reportData));
      setLastAutoSave(new Date());
    }, 1000);
    return () => clearTimeout(timer);
  }, [reportData]);

  const handleUpdateLists = useCallback((newLists: AppLists) => {
    setLists(newLists);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLists));
    } catch (error) {
      console.warn("Could not save lists to LocalStorage:", error);
    }
  }, []);

  const fetchAutomaticBackup = useCallback(async () => {
    try {
      const response = await fetch('/bak_aspis_non_conf.json');
      if (response.ok) {
        const data = await response.json();
        if (data && data.lists) {
           handleUpdateLists(data.lists);
        } else if (data && Array.isArray(data.suppliers)) {
           handleUpdateLists(data);
        }
      }
    } catch (err) { }
  }, [handleUpdateLists]);

  useEffect(() => {
    const initialize = async () => {
      const savedLists = localStorage.getItem(STORAGE_KEY);
      if (savedLists) {
        try { setLists(JSON.parse(savedLists)); } catch (e) { }
      }
      await fetchAutomaticBackup();
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft);
          setReportData(parsedDraft);
          setLastAutoSave(new Date());
        } catch (e) { }
      }
      await refreshPendingCount();
      setAppReady(true);
    };
    initialize();
  }, [fetchAutomaticBackup, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
  }, [view, refreshPendingCount]);

  const handleEditFromArchive = (report: ReportData) => {
    setReportData(report);
    setView('form');
    window.scrollTo(0, 0);
  };

  const handleClearDraft = () => {
    if (window.confirm('Είστε σίγουροι; Το τρέχον προσχέδιο θα χαθεί.')) {
      localStorage.removeItem(DRAFT_KEY);
      setReportData(initialReportData);
      setLastAutoSave(null);
      setView('form');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans bg-gray-50 transition-opacity duration-700 ${appReady ? 'opacity-100' : 'opacity-0'}`}>
      {/* HEADER */}
      <header className="bg-white shadow-md border-b border-blue-900/20 sticky top-0 z-50 px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img 
              src={LOGO_PATH} 
              alt="Logo" 
              className="h-8 w-auto object-contain" 
              onClick={() => setView('form')}
            />
            <div className="flex flex-col">
              <h1 className="text-[11px] font-black text-blue-900 leading-none uppercase tracking-tighter">NCR SYSTEM</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-[8px] font-bold text-gray-400 uppercase">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
          <LiveClock />
        </div>
      </header>

      <main className="flex-grow pb-24">
        {view === 'form' ? (
          <NCRForm 
            data={reportData} 
            setData={setReportData} 
            lists={lists} 
            onOpenSettings={() => setView('settings')} 
            onOpenArchive={() => setView('archive')}
            lastAutoSave={lastAutoSave}
            onNewReport={handleClearDraft}
          />
        ) : view === 'settings' ? (
          <Settings 
            lists={lists} 
            onUpdateLists={handleUpdateLists} 
            onClose={() => setView('form')} 
          />
        ) : (
          <ReportArchive 
            lists={lists}
            onEdit={handleEditFromArchive}
            onClose={() => setView('form')}
          />
        )}
      </main>

      {/* MOBILE TAB BAR NAVIGATION - ΟΠΤΙΜΟΠΟΙΗΜΕΝΟ ΓΙΑ GALAXY A22 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setView('form')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'form' ? 'text-blue-900 scale-110' : 'text-gray-400'}`}
        >
          <FilePlus size={24} strokeWidth={view === 'form' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase">Νέα Φόρμα</span>
        </button>

        <button 
          onClick={() => setView('archive')}
          className={`flex flex-col items-center gap-1 relative transition-all ${view === 'archive' ? 'text-blue-900 scale-110' : 'text-gray-400'}`}
        >
          <AlertCircle size={24} strokeWidth={view === 'archive' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase">Εκκρεμότητες</span>
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
              {pendingCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => setView('settings')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'settings' ? 'text-blue-900 scale-110' : 'text-gray-400'}`}
        >
          <ListOrdered size={24} strokeWidth={view === 'settings' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase">Λίστες</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
