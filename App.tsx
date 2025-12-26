
import { useEffect } from 'react';
import React, { useState, useCallback } from 'react';
import { AppLists, ReportData, defaultLists, initialReportData } from './types';
import { STORAGE_KEY, LOGO_PATH } from './constants';
import NCRForm from './components/NCRForm';
import Settings from './components/Settings';
import ReportArchive from './components/ReportArchive';
import { FilePlus, ListOrdered, AlertCircle, Wifi, WifiOff, Clock } from 'lucide-react';
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
    } catch (err) { }
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newLists)); } catch (e) { }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const savedLists = localStorage.getItem(STORAGE_KEY);
      if (savedLists) try { setLists(JSON.parse(savedLists)); } catch (e) { }
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) try { setReportData(JSON.parse(savedDraft)); } catch (e) { }
      await refreshPendingCount();
      setAppReady(true);
    };
    initialize();
  }, [refreshPendingCount]);

  const handleEditFromArchive = (report: ReportData) => {
    setReportData(report);
    setView('form');
    window.scrollTo(0, 0);
  };

  const handleClearDraft = () => {
    if (window.confirm('Εκκαθάριση φόρμας;')) {
      localStorage.removeItem(DRAFT_KEY);
      setReportData(initialReportData);
      setLastAutoSave(null);
      setView('form');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans bg-gray-50 transition-opacity duration-700 ${appReady ? 'opacity-100' : 'opacity-0'}`}>
      <header className="bg-white shadow-sm border-b border-blue-900/10 sticky top-0 z-50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={LOGO_PATH} alt="Logo" className="h-7 w-auto" />
          <h1 className="text-[10px] font-black text-blue-950 tracking-tighter uppercase">NCR SYSTEM</h1>
        </div>
        <div className="flex items-center gap-3">
           {isOnline ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-red-500" />}
           <LiveClock />
        </div>
      </header>

      <main className="flex-grow pb-24">
        {view === 'form' ? (
          <NCRForm data={reportData} setData={setReportData} lists={lists} onOpenSettings={() => setView('settings')} onOpenArchive={() => setView('archive')} lastAutoSave={lastAutoSave} onNewReport={handleClearDraft} />
        ) : view === 'settings' ? (
          <Settings lists={lists} onUpdateLists={handleUpdateLists} onClose={() => setView('form')} />
        ) : (
          <ReportArchive lists={lists} onEdit={handleEditFromArchive} onClose={() => setView('form')} />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-8 py-3 flex items-center justify-between z-50 shadow-2xl">
        <button onClick={() => setView('form')} className={`flex flex-col items-center gap-1 ${view === 'form' ? 'text-blue-900 scale-110' : 'text-gray-400'}`}>
          <FilePlus size={26} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase">ΦΟΡΜΑ</span>
        </button>

        <button onClick={() => setView('archive')} className={`flex flex-col items-center gap-1 relative ${view === 'archive' ? 'text-blue-900 scale-110' : 'text-gray-400'}`}>
          <AlertCircle size={26} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase">ΕΚΚΡΕΜΕΙ</span>
          {pendingCount > 0 && <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">{pendingCount}</span>}
        </button>

        <button onClick={() => setView('settings')} className={`flex flex-col items-center gap-1 ${view === 'settings' ? 'text-blue-900 scale-110' : 'text-gray-400'}`}>
          <ListOrdered size={26} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase">ΛΙΣΤΕΣ</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
