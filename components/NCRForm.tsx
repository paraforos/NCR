
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppLists, ReportData, initialReportData } from '../types';
import { 
  Camera, X, Eye, AlertCircle, 
  ClipboardList, Search, ChevronDown, CheckCircle2, Info, 
  AlertTriangle, Hammer, ClipboardCheck, Image as ImageIcon,
  Check, Save, Plus, UploadCloud
} from 'lucide-react';
import { generatePDF } from '../services/pdfService';
import { compressImage } from '../utils/imageUtils';
import { saveReport } from '../services/dbService';

interface NCRFormProps {
  data: ReportData;
  setData: React.Dispatch<React.SetStateAction<ReportData>>;
  lists: AppLists;
  onOpenSettings: () => void;
  onOpenArchive: () => void;
  lastAutoSave: Date | null;
  onNewReport: () => void;
}

const SearchableSelect: React.FC<{ 
  label: string, 
  value: string, 
  options: string[], 
  onChange: (val: string) => void,
  isMandatory?: boolean
}> = ({ label, value, options, onChange, isMandatory = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasValue = value.trim() !== "";

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between p-3.5 border rounded-2xl bg-white shadow-sm transition-all active:scale-[0.99] ${isMandatory && !hasValue ? 'border-red-200' : hasValue ? 'border-green-400' : 'border-gray-200'}`}
      >
        <span className={`text-xs truncate pr-2 ${value ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
          {value || "Επιλογή..."}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
          <div className="p-3 border-b bg-gray-50 flex items-center gap-2">
            <Search size={14} className="text-gray-400" />
            <input 
              autoFocus
              type="text" 
              className="w-full text-sm bg-transparent border-none focus:ring-0 p-1 font-bold" 
              placeholder="Αναζήτηση..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.map((opt, i) => (
              <li 
                key={i}
                onClick={() => { onChange(opt); setIsOpen(false); setSearchTerm(""); }}
                className={`px-4 py-4 text-xs font-bold border-b border-gray-50 last:border-0 active:bg-blue-900 active:text-white ${value === opt ? 'bg-blue-50 text-blue-900' : 'text-gray-700'}`}
              >
                {opt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const NCRForm: React.FC<NCRFormProps> = ({ data, setData, lists, onOpenSettings, onOpenArchive, lastAutoSave, onNewReport }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'eval' | 'media'>('details');

  const updateData = (key: keyof ReportData, value: any) => setData(prev => ({ ...prev, [key]: value }));

  const handleArchiveSave = async () => {
    setIsSaving(true);
    try {
      await saveReport(data);
      alert('Η αναφορά αποθηκεύτηκε επιτυχώς!');
    } catch (err) {
      alert('Σφάλμα αποθήκευσης.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, 6 - data.images.length);
      const newImages = await Promise.all(filesArray.map(file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => resolve(await compressImage(reader.result as string));
        reader.readAsDataURL(file);
      })));
      updateData('images', [...data.images, ...newImages]);
    }
  };

  const isEO11 = useMemo(() => data.attachmentType.some(t => t.toUpperCase().includes('ΕΟ-11')), [data.attachmentType]);

  return (
    <div className="flex flex-col min-h-screen animate-in fade-in duration-500">
      {/* QUICK ACTIONS BAR */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-[53px] z-40">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Τρέχουσα Φόρμα</span>
          <span className="text-sm font-black text-blue-900 uppercase truncate max-w-[140px]">{data.supplier || 'Νέα Αναφορά'}</span>
        </div>
        <div className="flex gap-2">
           <button onClick={onNewReport} className="p-2.5 bg-green-50 text-green-700 rounded-xl border border-green-100 active:scale-90 shadow-sm"><Plus size={20} /></button>
           <button onClick={() => generatePDF(data, lists, 'preview')} className="p-2.5 bg-blue-50 text-blue-900 rounded-xl border border-blue-100 active:scale-90 shadow-sm"><Eye size={20} /></button>
           <button onClick={handleArchiveSave} disabled={isSaving} className="px-5 py-2.5 bg-blue-900 text-white rounded-xl font-black text-[11px] uppercase flex items-center gap-1.5 active:scale-95 shadow-md">
             {isSaving ? '...' : <><Save size={16} /> ΑΠΟΘΗΚΕΥΣΗ</>}
           </button>
        </div>
      </div>

      {/* INNER TABS - OPTIMIZED FOR A22 */}
      <div className="flex border-b border-gray-200 bg-white shadow-sm">
        {(['details', 'eval', 'media'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-[11px] font-black uppercase transition-all border-b-4 ${activeTab === tab ? 'border-blue-900 text-blue-900 bg-blue-50/20' : 'border-transparent text-gray-400'}`}
          >
            {tab === 'details' ? 'Στοιχεία' : tab === 'eval' ? 'Έλεγχος' : 'Φωτο'}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-6">
        {activeTab === 'details' && (
          <div className="space-y-6 animate-in slide-in-from-left-2">
            <div className="grid grid-cols-1 gap-5">
              <div className="relative">
                <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">Ημερομηνία</label>
                <input type="date" value={data.reportDate} onChange={e => updateData('reportDate', e.target.value)} className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-bold outline-none bg-white shadow-sm" />
              </div>
              <SearchableSelect label="Προμηθευτής *" value={data.supplier} options={lists.suppliers} onChange={v => updateData('supplier', v)} isMandatory />
              <SearchableSelect label="Προϊόν *" value={data.product} options={lists.products} onChange={v => updateData('product', v)} isMandatory />
              
              <div className="grid grid-cols-2 gap-4">
                <SearchableSelect label="Όχημα" value={data.vehicle} options={lists.vehicles} onChange={v => updateData('vehicle', v)} />
                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">Ποσότητα</label>
                  <input type="number" value={data.quantity} onChange={e => updateData('quantity', e.target.value)} className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-bold outline-none shadow-sm" placeholder="BINS/PAL" />
                </div>
              </div>

              <div className="relative">
                <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">Περιγραφή Μη Συμμόρφωσης</label>
                <textarea 
                  value={data.ncrDescription} 
                  onChange={e => updateData('ncrDescription', e.target.value)} 
                  className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-bold h-32 outline-none resize-none shadow-sm"
                  placeholder="Αναφέρετε το πρόβλημα..."
                />
              </div>

              {isEO11 && (
                <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100 space-y-4 animate-in zoom-in duration-300">
                  <div className="flex items-center gap-2 text-blue-900 font-black text-[10px] uppercase">
                    <ClipboardList size={16} /> Στοιχεία ΕΟ-11
                  </div>
                  <div className="relative">
                    <label className="block text-[9px] font-black text-blue-900/40 mb-1 uppercase">% Ακατάλληλα</label>
                    <input type="text" value={data.unsuitableFruitPercentage} onChange={e => updateData('unsuitableFruitPercentage', e.target.value)} className="w-full p-4 border border-blue-200 rounded-xl text-xs font-bold shadow-sm" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'eval' && (
          <div className="space-y-6 animate-in slide-in-from-right-2">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm space-y-5">
               <h3 className="text-xs font-black text-blue-950 uppercase border-b pb-3 flex items-center gap-2">
                 <ClipboardCheck size={16} /> Αξιολόγηση & Κλείσιμο
               </h3>
               <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase italic">Ημ. Ελέγχου (Ολοκλήρωση)</label>
                  <input type="date" value={data.controlDate} onChange={e => updateData('controlDate', e.target.value)} className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-bold outline-none bg-blue-50/30" />
                  <p className="mt-2 text-[9px] text-red-500 font-bold uppercase italic leading-tight">Συμπληρώστε ημερομηνία μόνο εάν η αναφορά έχει ελεγχθεί και πρόκειται να "κλείσει".</p>
               </div>
               <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">Περιγραφή Ελέγχου</label>
                  <textarea value={data.controlDescription} onChange={e => updateData('controlDescription', e.target.value)} className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-bold h-40 outline-none resize-none shadow-sm" />
               </div>
               <SearchableSelect label="Υπεύθυνος Ελέγχου" value={data.qcResponsible} options={lists.managers} onChange={v => updateData('qcResponsible', v)} />
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center px-2">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Φωτογραφίες ({data.images.length}/6)</span>
                <label className="p-4 bg-blue-900 text-white rounded-full shadow-2xl active:scale-90 transition-transform">
                   <Camera size={24} />
                   <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
             </div>
             <div className="grid grid-cols-2 gap-4">
                {data.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-[2rem] overflow-hidden border border-gray-200 shadow-md">
                     <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                     <button 
                       onClick={() => updateData('images', data.images.filter((_, i) => i !== idx))}
                       className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-xl shadow-xl active:scale-90"
                     >
                       <X size={16} />
                     </button>
                  </div>
                ))}
                {data.images.length === 0 && (
                   <div className="col-span-2 py-24 border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center gap-3 text-gray-300">
                      <ImageIcon size={40} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Καμία Φωτογραφία</span>
                   </div>
                )}
             </div>
          </div>
        )}
      </div>
      
      {/* BOTTOM SPACING FOR TAB BAR */}
      <div className="h-24"></div>
    </div>
  );
};

export default NCRForm;
