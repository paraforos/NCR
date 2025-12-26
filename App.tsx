
import { useEffect } from 'react';
import React, { useState, useCallback } from 'react';
import { AppLists, ReportData, defaultLists, initialReportData } from './types';
import { STORAGE_KEY, LOGO_PATH } from './constants';
import NCRForm from './components/NCRForm';
import Settings from './components/Settings';
import ReportArchive from './components/ReportArchive';
import Dashboard from './components/Dashboard';
import { Wifi, WifiOff, Download, Clock, ListOrdered, Settings as SettingsIcon } from 'lucide-react';
import { getAllReports } from './services/dbService';

const DRAFT_KEY = 'aspis_ncr_draft_v1';

// Live Clock Component
const LiveClock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateFormatter = new Intl.DateTimeFormat('el-GR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const timeFormatter = new Intl.DateTimeFormat('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-blue-100 flex items-center gap-2.5 min-w-fit">
      <Clock size={14} className="text-blue-900 animate-pulse" />
      <div className="flex flex-col leading-none">
        <div className="text-[9px] font-black text-blue-900 uppercase tracking-widest mb-0.5">
          {dateFormatter.format(now).toUpperCase()}
        </div>
        <div className="text-xs font-black text-blue-800 tracking-tighter">
          {timeFormatter.format(now)}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'form' | 'settings' | 'archive' | 'dashboard'>('dashboard');
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
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = "ΠΡΙΝ ΚΑΝΕΙΣ ΕΞΟΔΟ ΑΠΟ ΤΗΝ ΕΦΑΡΜΟΓΗ ΦΡΟΝΤΙΣΕ ΓΙΑ ΤΗ ΔΗΜΙΟΥΡΓΙΑ ΑΝΤΙΓΡΑΦΟΥ ΑΣΦΑΛΕΙΑΣ, ΓΙΑ ΝΑ ΜΗ ΧΑΣΕΙΣ ΤΑ ΠΙΟ ΠΡΟΣΦΑΤΑ ΔΕΔΟΜΕΝΑ ΣΟΥ";
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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

  // Λήψη αυτόματου αντιγράφου από το bak_aspis_non_conf.json
  const fetchAutomaticBackup = useCallback(async () => {
    try {
      // Προσπαθούμε να φορτώσουμε το αρχείο backup από το root
      const response = await fetch('/bak_aspis_non_conf.json');
      if (response.ok) {
        const data = await response.json();
        // Αν το αρχείο έχει τη μορφή export (lists + reports)
        if (data.lists) {
          handleUpdateLists(data.lists);
          console.log("Auto-backup lists loaded from bak_aspis_non_conf.json");
        } 
        // Αν είναι απευθείας το αντικείμενο AppLists
        else if (data && typeof data === 'object' && Array.isArray(data.suppliers)) {
           handleUpdateLists(data);
           console.log("Simple backup lists loaded from bak_aspis_non_conf.json");
        }
      }
    } catch (err) {
      console.log("No automatic backup found in root.");
    }
  }, [handleUpdateLists]);

  useEffect(() => {
    const initialize = async () => {
      const savedLists = localStorage.getItem(STORAGE_KEY);
      if (savedLists) {
        try {
          setLists(JSON.parse(savedLists));
        } catch (e) { }
      }
      
      // Πάντα προσπαθούμε να φορτώσουμε το backup από το root κατά την εκκίνηση
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
    localStorage.removeItem(DRAFT_KEY);
    setReportData(initialReportData);
    setLastAutoSave(null);
  };

  const navigateToHome = () => {
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans bg-gray-50 transition-opacity duration-1000 ${appReady ? 'opacity-100' : 'opacity-0'}`}>
      <header className="bg-white shadow-sm border-b-2 border-blue-950 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img 
              src={LOGO_PATH} 
              alt="ASPIS Logo" 
              onClick={navigateToHome}
              className="h-10 w-auto object-contain cursor-pointer hover:opacity-70 active:scale-95 transition-all duration-300" 
              onError={(e) => e.currentTarget.style.display = 'none'} 
            />
            <div className="flex flex-col cursor-pointer group" onClick={navigateToHome}>
              <h1 className="text-base md:text-lg lg:text-xl font-black text-blue-900 leading-none uppercase tracking-tight group-hover:text-blue-700 transition-colors">
                NON-CONFORMITY REPORT SYSTEM
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 {isOnline ? (
                   <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 rounded-full shadow-sm border border-green-100">
                      <Wifi size={8} className="text-green-600" />
                      <span className="text-[8px] font-black text-green-700 uppercase tracking-widest">Online</span>
                   </div>
                 ) : (
                   <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 rounded-full shadow-sm border border-red-100">
                      <WifiOff size={8} className="text-red-600" />
                      <span className="text-[8px] font-black text-red-700 uppercase tracking-widest">Offline</span>
                   </div>
                 )}
                 <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded-full">
                    <Download size={8} className="text-blue-600" />
                    <span className="text-[8px] font-black text-blue-700 uppercase tracking-widest">Offline Ready</span>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <LiveClock />
            
            <nav className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-2xl shadow-inner">
              <button 
                onClick={() => setView('dashboard')}
                className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase transition-all ${view === 'dashboard' ? 'bg-blue-900 text-white shadow-md' : 'text-gray-500 hover:text-blue-900'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setView('form')}
                className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase transition-all ${view === 'form' ? 'bg-blue-900 text-white shadow-md' : 'text-gray-500 hover:text-blue-900'}`}
              >
                Φόρμα
              </button>
              <div className="relative">
                <button 
                  onClick={() => setView('archive')}
                  className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase transition-all flex items-center gap-1.5 ${view === 'archive' ? 'bg-blue-900 text-white shadow-md' : 'text-gray-500 hover:text-blue-900'}`}
                >
                  Ιστορικό
                </button>
                {pendingCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex items-center justify-center bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full shadow-lg border border-white">
                      {pendingCount}
                    </span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setView('settings')}
                className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase transition-all flex items-center gap-1.5 ${view === 'settings' ? 'bg-blue-900 text-white shadow-md' : 'text-gray-500 hover:text-blue-900'}`}
              >
                <ListOrdered size={12} className={view === 'settings' ? 'text-blue-300' : 'text-blue-500'} />
                Λίστες
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        {view === 'dashboard' ? (
          <Dashboard onOpenForm={() => setView('form')} lists={lists} />
        ) : view === 'form' ? (
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

      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-blue-900 font-bold text-sm tracking-wide">
            ©2025 Michalis Paraforos | <span className="text-gray-400 font-medium">PWA Offline Enabled</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
