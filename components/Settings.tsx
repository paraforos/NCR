
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppLists, ReportData } from '../types';
import { 
  Plus, Trash2, Upload, Download, FileImage, X, 
  ClipboardCheck, Search, Users, Truck, Package, Hash, 
  FileText, HelpCircle, ShieldCheck, Database, LayoutGrid,
  AlertCircle, Loader2, ImageIcon, Zap, AlertTriangle, Eraser, MousePointer2, Settings as SettingsIcon, Save
} from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { getAllReports, bulkInsertReports } from '../services/dbService';

interface SettingsProps {
  lists: AppLists;
  onUpdateLists: (newLists: AppLists) => void;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ lists, onUpdateLists, onClose }) => {
  const [activeTab, setActiveTab] = useState<string>('suppliers');
  const [newItem, setNewItem] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [includeImagesInBackup, setIncludeImagesInBackup] = useState(false); 

  // Signature Pad Logic
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (activeTab === 'system') {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = '#1e3a8a';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                
                // If there's an existing signature, draw it
                if (lists.signatureImage) {
                    const img = new Image();
                    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    img.src = lists.signatureImage;
                }
            }
        }
    }
  }, [activeTab, lists.signatureImage]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.beginPath();
        onUpdateLists({ ...lists, signatureImage: canvas.toDataURL('image/png') });
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onUpdateLists({ ...lists, signatureImage: undefined });
    }
  };

  const tabConfig: Record<string, { label: string, icon: React.ReactNode }> = {
    suppliers: { label: 'Προμηθευτές', icon: <Users size={18} /> },
    vehicles: { label: 'Οχήματα', icon: <Truck size={18} /> },
    products: { label: 'Προϊόντα', icon: <Package size={18} /> },
    batches: { label: 'Παρτίδες', icon: <Hash size={18} /> },
    managers: { label: 'Υπεύθυνοι', icon: <Users size={18} /> },
    attachmentTypes: { label: 'Συνημμένα', icon: <FileText size={18} /> },
    ncrReasons: { label: 'Λόγοι ΜΣ', icon: <AlertCircle size={18} /> },
    rootCauses: { label: 'Αιτίες', icon: <HelpCircle size={18} /> },
    system: { label: 'ΣΥΣΤΗΜΑ & BACKUP', icon: <ShieldCheck size={18} /> },
  };

  const filteredItems = useMemo(() => {
    if (activeTab === 'system') return [];
    const currentList = (lists[activeTab as keyof AppLists] as string[]) || [];
    if (!searchTerm.trim()) return currentList;
    return currentList.filter(item => 
      item.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [lists, activeTab, searchTerm]);

  const handleAddItem = () => {
    if (!newItem.trim() || activeTab === 'system') return;
    const updatedList = [...(lists[activeTab as keyof AppLists] as string[]), newItem.trim()];
    onUpdateLists({ ...lists, [activeTab]: updatedList });
    setLastAdded(newItem.trim());
    setNewItem('');
    setTimeout(() => setLastAdded(null), 1500);
  };

  const handleDeleteItem = (index: number) => {
    const updatedList = (lists[activeTab as keyof AppLists] as string[]).filter((_, i) => i !== index);
    onUpdateLists({ ...lists, [activeTab]: updatedList });
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const originalBase64 = reader.result as string;
        const compressed = await compressImage(originalBase64, 800, 400, 0.8);
        onUpdateLists({ ...lists, signatureImage: compressed });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackup = async () => {
    setIsProcessing(true);
    try {
      const allReports = await getAllReports();
      const processedReports = includeImagesInBackup 
        ? allReports 
        : allReports.map(report => ({ ...report, images: [] }));

      const backupData = {
        lists: lists,
        reports: processedReports,
        exportDate: new Date().toISOString(),
        backupType: includeImagesInBackup ? "FULL" : "LIGHTWEIGHT",
        version: "2.1"
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      
      const date = new Date();
      const dateString = `${String(date.getDate()).padStart(2, '0')}_${String(date.getMonth()+1).padStart(2, '0')}_${date.getFullYear()}`;
      const suffix = includeImagesInBackup ? 'FULL' : 'LIGHT';
      
      downloadAnchorNode.setAttribute("download", `BACKUP_ASPIS_NCR_${suffix}_${dateString}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      alert('Σφάλμα κατά τη δημιουργία αντιγράφου.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = async e => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const configToRestore = parsed.lists ? parsed.lists : parsed;
        const reportsToRestore = parsed.reports ? (parsed.reports as ReportData[]) : [];

        if (configToRestore && Array.isArray(configToRestore.suppliers)) {
          onUpdateLists({ ...lists, ...configToRestore });
          
          if (reportsToRestore.length > 0) {
            const type = parsed.backupType === "LIGHTWEIGHT" ? "χωρίς φωτογραφίες" : "με φωτογραφίες";
            if (window.confirm(`Βρέθηκαν ${reportsToRestore.length} αναφορές (${type}). Θέλετε να τις προσθέσετε στο ιστορικό σας;`)) {
              await bulkInsertReports(reportsToRestore);
            }
          }
          
          alert('Η ανάκτηση ολοκληρώθηκε επιτυχώς!');
        } else {
          throw new Error("Invalid format");
        }
      } catch (err) { 
        alert('Σφάλμα αρχείου. Βεβαιωθείτε ότι επιλέξατε ένα έγκυρο αρχείο backup .json'); 
      } finally {
        setIsProcessing(false);
        event.target.value = '';
      }
    };
  };

  return (
    <div className="bg-slate-50 min-h-[85vh] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-500">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-72 bg-blue-950 p-6 flex flex-col gap-8 text-white">
        <div className="flex items-center gap-3 mb-4">
           <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-900/50">
              <LayoutGrid size={24} />
           </div>
           <div>
              <h2 className="text-lg font-black tracking-tight uppercase">ΔΙΑΧΕΙΡΙΣΗ</h2>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-none">Λίστες & Σύστημα</p>
           </div>
        </div>

        <nav className="flex flex-col gap-1.5 flex-grow">
          {Object.entries(tabConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSearchTerm(''); }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black uppercase tracking-tight transition-all duration-300 ${
                activeTab === key 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 translate-x-1' 
                : 'text-blue-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={activeTab === key ? 'text-white' : 'text-blue-500'}>{config.icon}</span>
              {config.label}
              {activeTab === key && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>}
            </button>
          ))}
        </nav>

        <button 
          onClick={onClose}
          className="mt-auto flex items-center justify-center gap-2 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-black uppercase transition-all border border-white/10"
        >
          <X size={16} /> Επιστροφή στη Φόρμα
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 flex flex-col gap-8 overflow-y-auto max-h-[85vh]">
        
        {/* TAB HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h3 className="text-3xl font-black text-blue-950 uppercase tracking-tighter mb-1">
                {tabConfig[activeTab].label}
              </h3>
              <div className="flex items-center gap-2">
                 <div className="h-1.5 w-8 bg-blue-600 rounded-full"></div>
                 <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    {activeTab === 'system' ? 'ΚΕΝΤΡΙΚΕΣ ΡΥΘΜΙΣΕΙΣ ΣΥΣΤΗΜΑΤΟΣ' : `${(lists[activeTab as keyof AppLists] as string[] || []).length} ΕΓΓΡΑΦΕΣ ΣΤΗ ΛΙΣΤΑ`}
                 </span>
              </div>
           </div>

           {activeTab !== 'system' && (
             <div className="relative w-full md:w-64 animate-in fade-in zoom-in duration-300">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Αναζήτηση..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
                />
             </div>
           )}
        </div>

        {activeTab !== 'system' ? (
          /* LIST SECTION */
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
             <div className="flex gap-3">
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder={`Προσθήκη νέου αντικειμένου...`}
                  className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <button 
                  onClick={handleAddItem}
                  className="bg-blue-600 text-white px-8 rounded-2xl font-black text-sm uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Plus size={20} /> Προσθήκη
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                {filteredItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`flex justify-between items-center p-4 rounded-2xl border transition-all group ${lastAdded === item ? 'bg-green-50 border-green-200 scale-[1.02]' : 'bg-gray-50/50 border-gray-100 hover:border-blue-200 hover:bg-white hover:shadow-md'}`}
                  >
                    <div className="flex items-center gap-3">
                       <div className={`w-2 h-2 rounded-full ${lastAdded === item ? 'bg-green-500 animate-pulse' : 'bg-blue-400'}`}></div>
                       <span className="text-sm font-bold text-slate-700">{item}</span>
                    </div>
                    <button onClick={() => handleDeleteItem(idx)} className="text-gray-300 hover:text-red-600 p-2 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
             </div>
          </div>
        ) : (
          /* SYSTEM TAB CONTENT */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-500 pb-20">
             
             {/* SIGNATURE CARD */}
             <div className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col gap-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   <AlertTriangle size={14} /> ΨΗΦΙΑΚΗ ΥΠΟΓΡΑΦΗ ΑΝΑΦΕΡΟΝΤΑ
                </h4>
                
                <div className="flex flex-col gap-4">
                   <div className="relative group">
                      <canvas
                         ref={canvasRef}
                         width={350}
                         height={160}
                         onMouseDown={startDrawing}
                         onMouseUp={stopDrawing}
                         onMouseMove={draw}
                         onTouchStart={startDrawing}
                         onTouchEnd={stopDrawing}
                         onTouchMove={draw}
                         className="w-full h-[160px] bg-slate-50 border-2 border-dashed border-gray-200 rounded-3xl cursor-crosshair touch-none"
                      />
                      {!lists.signatureImage && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-300">
                            <MousePointer2 size={24} className="mb-1 opacity-50" />
                            <span className="text-[9px] font-black uppercase">Σχεδιάστε την υπογραφή σας</span>
                         </div>
                      )}
                   </div>

                   <div className="flex items-center gap-2">
                      <button 
                         onClick={clearSignature}
                         className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200 transition-all shadow-sm"
                      >
                         ΚΑΘΑΡΙΣΜΟΣ
                      </button>
                      <label className="flex-1 py-3 bg-blue-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-900/20">
                         <Upload size={14} /> ΦΟΡΤΩΣΗ ΑΡΧΕΙΟΥ
                         <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                      </label>
                   </div>
                </div>
             </div>

             {/* EO-11 AUTO-FORM CARD */}
             <div className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col justify-between min-h-[260px]">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   <ClipboardCheck size={14} className="text-green-600" /> EO-11 AUTO-GENERATION
                </h4>
                
                <div className="flex-grow flex flex-col items-center justify-center text-center gap-4">
                    <div className={`p-6 rounded-full transition-all duration-500 ${lists.fruitInspectionEnabled ? 'bg-green-100 text-green-600 scale-105 shadow-md shadow-green-200/50' : 'bg-gray-100 text-gray-300'}`}>
                        <ClipboardCheck size={50} />
                    </div>
                    <div className="px-4">
                       <p className={`text-[10px] font-black uppercase tracking-tight ${lists.fruitInspectionEnabled ? 'text-green-800' : 'text-gray-400'}`}>
                          {lists.fruitInspectionEnabled ? 'Αυτόματη δημιουργία αντιγράφου ΕΟ-11 στο PDF' : 'Το EO-11 είναι απενεργοποιημένο'}
                       </p>
                    </div>
                </div>

                <div 
                  onClick={() => onUpdateLists({ ...lists, fruitInspectionEnabled: !lists.fruitInspectionEnabled })}
                  className={`flex items-center justify-between p-4 rounded-[1.8rem] border-2 transition-all cursor-pointer ${lists.fruitInspectionEnabled ? 'bg-white border-green-500 shadow-lg shadow-green-100' : 'bg-gray-50 border-gray-200'}`}
                >
                   <span className={`text-[11px] font-black uppercase ${lists.fruitInspectionEnabled ? 'text-green-700' : 'text-gray-400'}`}>
                      {lists.fruitInspectionEnabled ? 'ΕΝΕΡΓΟΠΟΙΗΜΕΝΟ' : 'ΑΠΕΝΕΡΓΟΠΟΙΗΜΕΝΟ'}
                   </span>
                   <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${lists.fruitInspectionEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${lists.fruitInspectionEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                   </div>
                </div>
             </div>

             {/* SYSTEM BACKUP CARD - NOW MORE PROMINENT */}
             <div className="bg-blue-900 p-6 rounded-[2.5rem] shadow-2xl flex flex-col gap-5 relative overflow-hidden transition-all hover:scale-[1.02] min-h-[260px] text-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full"></div>
                
                {isProcessing && (
                  <div className="absolute inset-0 bg-blue-900/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                     <Loader2 size={32} className="animate-spin text-white mb-2" />
                     <span className="text-[10px] font-black uppercase">Επεξεργασία...</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center relative z-10">
                   <div className="flex items-center gap-2">
                      <Save size={18} className="text-blue-300" />
                      <h4 className="text-[11px] font-black text-blue-200 uppercase tracking-widest">ΑΝΤΙΓΡΑΦΑ ΑΣΦΑΛΕΙΑΣ (BACKUP)</h4>
                   </div>
                   <div className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">ΚΡΙΣΙΜΟ</div>
                </div>

                <div className="bg-blue-950/50 p-4 rounded-3xl flex flex-col gap-4 border border-white/5 shadow-inner relative z-10">
                   <div className="text-[10px] font-black text-blue-300 uppercase tracking-widest text-center mb-1">ΤΥΠΟΣ ΕΞΑΓΩΓΗΣ ΔΕΔΟΜΕΝΩΝ</div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => setIncludeImagesInBackup(false)}
                        className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all ${!includeImagesInBackup ? 'bg-blue-600 text-white shadow-lg ring-2 ring-white/20' : 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50'}`}
                      >
                          <Zap size={20} />
                          <span className="text-[9px] font-black uppercase">ΜΟΝΟ ΚΕΙΜΕΝΑ</span>
                      </button>
                      <button 
                        onClick={() => setIncludeImagesInBackup(true)}
                        className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all ${includeImagesInBackup ? 'bg-blue-600 text-white shadow-lg ring-2 ring-white/20' : 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50'}`}
                      >
                          <ImageIcon size={20} />
                          <span className="text-[9px] font-black uppercase">ΠΛΗΡΕΣ (MΕ ΦΩΤΟ)</span>
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3 relative z-10">
                   <button 
                    onClick={handleBackup}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 bg-white text-blue-900 rounded-2xl py-3.5 transition-all hover:bg-blue-50 shadow-xl active:scale-95 text-[11px] font-black uppercase tracking-tight"
                   >
                      <Download size={16} /> ΕΞΑΓΩΓΗ
                   </button>
                   <label className="flex items-center justify-center gap-2 bg-blue-700 text-white rounded-2xl py-3.5 transition-all hover:bg-blue-600 cursor-pointer border border-white/10 active:scale-95 text-[11px] font-black uppercase tracking-tight shadow-xl">
                      <Database size={16} /> ΕΙΣΑΓΩΓΗ
                      <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                   </label>
                </div>
                
                <div className="flex items-center gap-2 px-1 relative z-10">
                   <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                   <p className="text-[9px] text-blue-100/70 font-bold uppercase leading-tight italic">
                    {includeImagesInBackup 
                      ? "Full Backup: Περιλαμβάνει όλες τις αναφορές με τις φωτογραφίες τους." 
                      : "Light Backup: Περιλαμβάνει μόνο τις λίστες και τα κείμενα των αναφορών."}
                   </p>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
