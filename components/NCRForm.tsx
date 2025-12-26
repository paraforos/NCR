
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppLists, ReportData, initialReportData } from '../types';
import { 
  Camera, X, Printer, Settings as SettingsIcon, Eye, AlertCircle, 
  ClipboardList, Search, ChevronDown, CheckCircle2, Info, 
  AlertTriangle, Hammer, ClipboardCheck, Image as ImageIcon,
  LayoutDashboard, Check, Archive, Save, Plus, CloudUpload
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

const ToggleSwitch: React.FC<{ label: string, checked: boolean, onChange: (e: any) => void }> = ({ label, checked, onChange }) => (
  <label className={`
    flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all select-none shadow-sm
    ${checked ? 'border-blue-900 bg-blue-50 ring-2 ring-blue-900/10' : 'border-gray-200 hover:bg-gray-50 bg-white'}
  `}>
    <span className={`text-sm font-bold ${checked ? 'text-blue-900' : 'text-gray-600'}`}>
      {label}
    </span>
    <div className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
    </div>
  </label>
);

const SearchableSelect: React.FC<{ 
  label: string, 
  value: string, 
  options: string[], 
  onChange: (val: string) => void,
  placeholder?: string,
  isMandatory?: boolean
}> = ({ label, value, options, onChange, placeholder = "Αναζήτηση...", isMandatory = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasValue = value.trim() !== "";
  const statusClasses = isMandatory 
    ? (hasValue ? 'bg-green-50/50 border-green-500 ring-green-500/10' : 'bg-red-50/50 border-red-200')
    : 'bg-white border-gray-300';

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between p-2.5 border rounded-xl cursor-pointer transition-all duration-200 shadow-sm ${statusClasses} ${isOpen ? 'ring-4 border-blue-900 scale-[1.01]' : 'hover:border-blue-400'}`}
      >
        <span className={`text-sm truncate pr-2 ${value ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
          {value || "Επιλέξτε..."}
        </span>
        <div className="flex items-center gap-1.5">
           {isMandatory && hasValue && <Check size={16} className="text-green-600 animate-in zoom-in duration-300" />}
           <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-sm bg-white/95">
          <div className="p-2 border-b bg-gray-50/80 flex items-center gap-2">
            <Search size={14} className="text-gray-400" />
            <input 
              autoFocus
              type="text" 
              className="w-full text-sm bg-transparent border-none focus:ring-0 p-1" 
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-200">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <li 
                  key={i}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-900 hover:text-white transition-all flex items-center justify-between ${value === opt ? 'bg-blue-50 text-blue-900 font-black' : 'text-gray-700'}`}
                >
                  {opt}
                  {value === opt && <CheckCircle2 size={14} />}
                </li>
              ))
            ) : (
              <li className="px-3 py-6 text-sm text-gray-400 text-center italic">Δεν βρέθηκαν αποτελέσματα</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const NCRForm: React.FC<NCRFormProps> = ({ data, setData, lists, onOpenSettings, onOpenArchive, lastAutoSave, onNewReport }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const sectionRefs = [
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
  ];

  const normalizeGreek = (text: string) => {
    return text.toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[ΆΑ]/g, 'Α')
      .replace(/[ΈΕ]/g, 'Ε')
      .replace(/[ΉΗ]/g, 'Η')
      .replace(/[ΊΙΪ]/g, 'Ι')
      .replace(/[ΌΟ]/g, 'Ο')
      .replace(/[ΎΥΫ]/g, 'Υ')
      .replace(/[ΏΩ]/g, 'Ω');
  };

  const isEO11Selected = useMemo(() => {
    return data.attachmentType.some(t => {
      const normalized = normalizeGreek(t);
      return normalized.includes('ΕΠΙΘΕΩΡΗΣΗΣ') || normalized.includes('ΕΟ-11') || normalized.includes('EO-11');
    });
  }, [data.attachmentType]);

  const isPhotosSelected = useMemo(() => {
    return data.attachmentType.some(t => {
      const normalized = normalizeGreek(t);
      return normalized === 'ΦΩΤΟΓΡΑΦΙΕΣ' || normalized === 'PHOTOS';
    });
  }, [data.attachmentType]);

  const getStepStatus = (index: number) => {
    switch (index) {
      case 0:
        const hMandatory = [data.reportDate, data.supplier, data.vehicle, data.product, data.batch, data.quantity];
        const hComplete = hMandatory.every(v => v && v.toString().trim() !== "");
        return { complete: hComplete, missing: !hComplete };
      case 1:
        const dMandatory = [data.ncrDescription, data.reporter];
        if (isEO11Selected) dMandatory.push(data.unsuitableFruitPercentage);
        const dComplete = dMandatory.every(v => v && v.toString().trim() !== "");
        return { complete: dComplete, missing: !dComplete };
      case 2:
        const cMandatory = [data.correctionResponsible, data.correctionDeadline];
        const cComplete = cMandatory.every(v => v && v.toString().trim() !== "");
        return { complete: cComplete, missing: !cComplete };
      default:
        return { complete: true, missing: false };
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowSummary(window.scrollY > 300);
      const scrollPos = window.scrollY + 200;
      sectionRefs.forEach((ref, idx) => {
        if (ref.current && scrollPos >= ref.current.offsetTop && scrollPos < ref.current.offsetTop + ref.current.offsetHeight) {
          setActiveStep(idx);
        }
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (index: number) => {
    if (sectionRefs[index].current) {
      window.scrollTo({
        top: sectionRefs[index].current!.offsetTop - 140,
        behavior: 'smooth'
      });
    }
  };

  const updateData = (key: keyof ReportData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const updateNested = (parent: keyof ReportData, key: string, value: any) => {
    setData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as object),
        [key]: value
      }
    }));
  };

  const toggleAttachment = (type: string, checked: boolean) => {
    setData(prev => {
      const current = prev.attachmentType || [];
      if (checked) {
        if (!current.includes(type)) return { ...prev, attachmentType: [...current, type] };
        return prev;
      } else {
        return { ...prev, attachmentType: current.filter(t => t !== type) };
      }
    });
  };

  const handleSatisfactoryChange = (field: 'yes' | 'no', checked: boolean) => {
    setData(prev => ({
      ...prev,
      satisfactory: {
        yes: field === 'yes' ? checked : (checked ? false : prev.satisfactory.yes),
        no: field === 'no' ? checked : (checked ? false : prev.satisfactory.no)
      }
    }));
  };

  const handleCapaChange = (field: 'yes' | 'no', checked: boolean) => {
    setData(prev => ({
      ...prev,
      capaRequired: {
        yes: field === 'yes' ? checked : (checked ? false : prev.capaRequired.yes),
        no: field === 'no' ? checked : (checked ? false : prev.capaRequired.no)
      }
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const MAX_IMAGES = 6;
      const remainingSlots = MAX_IMAGES - data.images.length;
      if (remainingSlots <= 0) {
        alert(`Έχετε φτάσει το μέγιστο όριο των ${MAX_IMAGES} φωτογραφιών.`);
        return;
      }
      const filesToProcess = filesArray.slice(0, remainingSlots);
      const newImagesPromises = filesToProcess.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const originalBase64 = reader.result as string;
            const compressed = await compressImage(originalBase64);
            resolve(compressed);
          };
          reader.readAsDataURL(file as Blob);
        });
      });
      const newImages = await Promise.all(newImagesPromises);
      updateData('images', [...data.images, ...newImages]);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    updateData('images', data.images.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const missingFields = [];
    if (!data.supplier) missingFields.push("Προμηθευτής");
    if (!data.vehicle) missingFields.push("Όχημα");
    if (!data.product) missingFields.push("Προϊόν");
    if (!data.batch) missingFields.push("Παρτίδα");
    if (!data.quantity) missingFields.push("Ποσότητα");
    if (!data.ncrDescription) missingFields.push("Περιγραφή Μη Συμμόρφωσης");
    if (!data.correctionResponsible) missingFields.push("Υπεύθυνος Διόρθωσης");
    if (!data.correctionDeadline) missingFields.push("Προθεσμία Διόρθωσης");
    if (isEO11Selected && !data.unsuitableFruitPercentage) missingFields.push("% Ποσοστό Ακατάλληλων Φρούτων");

    if (missingFields.length > 0) {
      alert("Παρακαλώ συμπληρώστε τα υποχρεωτικά πεδία: \n- " + missingFields.join("\n- "));
      return false;
    }
    return true;
  };

  const handleArchiveSave = async () => {
    if (validateForm()) {
      setIsSaving(true);
      try {
        await saveReport(data);
        alert('Η αναφορά αποθηκεύτηκε επιτυχώς στο αρχείο!');
      } catch (err) {
        alert('Σφάλμα κατά την αποθήκευση.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handlePreview = async () => {
    if (validateForm()) {
      await generatePDF(data, lists, 'preview');
    }
  };

  const handleNewReportClick = () => {
    if (window.confirm('Είστε σίγουροι ότι θέλετε να ξεκινήσετε νέα αναφορά; Το τρέχον προσχέδιο θα διαγραφεί.')) {
      onNewReport();
      setActiveStep(0);
      window.scrollTo(0, 0);
    }
  };

  const CATEGORY_LABELS: Record<string, string> = {
    quality: 'Ποιότητα/Προδιαγραφές',
    packaging: 'Συσκευασία',
    transport: 'Μεταφορά',
    storage: 'Αποθήκευση',
    production: 'Παραγωγική Διαδ.',
    equipment: 'Εξοπλισμός',
    foodSafety: 'Ασφάλεια Τροφίμου',
    environment: 'Περιβάλλον',
    healthSafety: 'Υγεία & Ασφάλεια',
  };

  const CORRECTION_LABELS: Record<string, string> = {
    return: 'Επιστροφή ειδών',
    destroy: 'Καταστροφή ειδών',
    rework: 'Επανακατεργασία',
    rejectService: 'Όχι παραλαβή',
    sorting: 'Διαλογή υλικών',
    useWithInstruction: 'Χρήση με οδηγίες',
    recall: 'Ανάκληση',
    repeatWork: 'Επανάληψη εργασίας',
    notifyCustomer: 'Ενημέρωση πελάτη',
    notifySupplier: 'Ενημέρωση προμηθευτή'
  };

  const steps = [
    { label: 'Στοιχεία', icon: <Info size={16} /> },
    { label: 'Λεπτομέρειες', icon: <AlertTriangle size={16} /> },
    { label: 'Διόρθωση', icon: <Hammer size={16} /> },
    { label: 'Αξιολόγηση', icon: <ClipboardCheck size={16} /> },
    { label: 'Media', icon: <ImageIcon size={16} /> },
  ];

  const getInputClass = (val: any, isMandatory: boolean) => {
    const hasVal = val && val.toString().trim() !== "";
    const base = "w-full p-2.5 border rounded-xl focus:ring-4 transition-all shadow-sm font-medium";
    if (isMandatory) {
      return hasVal 
        ? `${base} border-green-500 bg-green-50/50 focus:ring-green-500/10 focus:border-green-600`
        : `${base} border-red-200 bg-red-50/30 focus:ring-blue-900/10 focus:border-blue-900`;
    }
    return `${base} border-gray-300 bg-white focus:ring-blue-900/10 focus:border-blue-900`;
  };

  const sectionCardClass = "bg-white rounded-2xl p-6 border border-gray-100 shadow-xl relative transition-all duration-300 hover:shadow-2xl hover:border-blue-100";
  const verticalBarClass = "absolute top-6 bottom-6 left-0 w-[4px] bg-blue-900 rounded-r-full shadow-[0_0_10px_rgba(30,58,138,0.3)]";

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* STICKY HEADER & STEPPER */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg px-4 pt-4 pb-2 -mx-4 md:rounded-b-3xl">
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="flex items-center gap-3">
             <div className="bg-blue-900 p-2 rounded-xl text-white shadow-lg">
                <LayoutDashboard size={20} />
             </div>
             <div>
                <h1 className="text-xl font-black text-blue-900 uppercase tracking-tighter leading-none">
                  NON-CONFORMITY REPORT SYSTEM
                  <span className="text-blue-500 text-sm ml-1 font-bold">(EA-28:E1)</span>
                </h1>
                {lastAutoSave && (
                   <div className="flex items-center gap-1.5 mt-1.5 animate-in fade-in slide-in-from-left-2 duration-700">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                         Draft Saved: {lastAutoSave.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                   </div>
                )}
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleNewReportClick} 
              className="p-2.5 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors border border-green-200"
              title="Νέα Αναφορά"
            >
              <Plus size={20} />
            </button>
            <button 
              onClick={onOpenArchive} 
              className="p-2.5 bg-blue-50 text-blue-900 rounded-xl hover:bg-blue-100 transition-colors border border-blue-200"
              title="Αρχείο"
            >
              <Archive size={20} />
            </button>
            <button onClick={onOpenSettings} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200">
              <SettingsIcon size={20} />
            </button>
            <button onClick={handlePreview} className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-900 text-blue-900 font-black rounded-xl hover:bg-blue-50 transition-all active:scale-95 shadow-sm">
              <Eye size={18} /> <span className="hidden sm:inline">Preview</span>
            </button>
            <button 
              onClick={handleArchiveSave} 
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-900 text-white font-black rounded-xl hover:bg-blue-800 transition-all active:scale-95 shadow-lg disabled:opacity-50"
            >
              {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={18} />}
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>
        </div>

        {/* PROGRESS STEPPER */}
        <div className="flex justify-between items-center max-w-3xl mx-auto px-4 py-2">
          {steps.map((step, idx) => {
            const status = getStepStatus(idx);
            const isActive = activeStep === idx;
            return (
              <React.Fragment key={idx}>
                <div 
                  onClick={() => scrollToSection(idx)}
                  className={`flex flex-col items-center gap-1 cursor-pointer group transition-all ${isActive ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md relative
                    ${isActive ? 'bg-blue-900 text-white ring-4 ring-blue-100' : (status.complete ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500')}
                    ${status.missing ? 'animate-pulse' : ''}
                  `}>
                    {status.complete && !isActive ? <Check size={14} /> : step.icon}
                    {status.missing && (
                       <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                       </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-tight ${isActive ? 'text-blue-900' : (status.complete ? 'text-green-700' : 'text-gray-400')}`}>
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-[2px] mx-2 bg-gray-100 relative top-[-8px]">
                     <div className={`h-full transition-all duration-500 ${status.complete ? 'bg-green-500' : (activeStep > idx ? 'bg-blue-900' : 'bg-gray-100')} ${status.complete ? 'w-full' : (activeStep > idx ? 'w-full' : 'w-0')}`}></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* FLOATING SUMMARY CARD - WIDTH INCREASED BY 30% */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 transform ${showSummary ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="bg-blue-900 text-white p-4 rounded-2xl shadow-2xl border border-blue-800 min-w-[312px] backdrop-blur-sm bg-blue-900/90">
           <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-800">
              <div className="bg-white/20 p-1 rounded-md">
                 <Info size={14} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Σύνοψη Αναφοράς</span>
           </div>
           <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] text-blue-300 font-bold uppercase">Προμηθευτής:</span>
                 <span className="text-xs font-black truncate max-w-[180px]">{data.supplier || '---'}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-[10px] text-blue-300 font-bold uppercase">Προϊόν:</span>
                 <span className="text-xs font-black truncate max-w-[180px]">{data.product || '---'}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-[10px] text-blue-300 font-bold uppercase">Ημ/νία:</span>
                 <span className="text-xs font-black">{data.reportDate ? new Date(data.reportDate).toLocaleDateString('el-GR') : '---'}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="mt-8 space-y-10 px-2">
        {/* SECTION 1: HEADER */}
        <section ref={sectionRefs[0]} className={sectionCardClass}>
            <div className={verticalBarClass}></div>
            <div className="flex items-center gap-3 mb-6">
               <div className="bg-blue-50 p-2 rounded-xl text-blue-900 border border-blue-100">
                  <Info size={22} />
               </div>
               <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">1. Στοιχεία Αναφοράς <span className="block text-xs font-bold text-gray-400 mt-0.5 tracking-normal">Header Details</span></h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="relative">
                    <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">Ημερομηνία / Date *</label>
                    <div className="relative">
                       <input type="date" value={data.reportDate} onChange={e => updateData('reportDate', e.target.value)} className={getInputClass(data.reportDate, true)} />
                       {data.reportDate && <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 pointer-events-none" />}
                    </div>
                </div>
                <SearchableSelect 
                  label="Προμηθευτής / Supplier *" 
                  value={data.supplier} 
                  options={lists.suppliers} 
                  onChange={(val) => updateData('supplier', val)}
                  isMandatory={true}
                />
                <SearchableSelect 
                  label="Όχημα / Vehicle *" 
                  value={data.vehicle} 
                  options={lists.vehicles} 
                  onChange={(val) => updateData('vehicle', val)}
                  isMandatory={true}
                />
                <SearchableSelect 
                  label="Προϊόν / Product *" 
                  value={data.product} 
                  options={lists.products} 
                  onChange={(val) => updateData('product', val)}
                  isMandatory={true}
                />
                <SearchableSelect 
                  label="Παρτίδα / Lot *" 
                  value={data.batch} 
                  options={lists.batches} 
                  onChange={(val) => updateData('batch', val)}
                  isMandatory={true}
                />
                <div className="relative">
                    <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">Ποσότητα / Quantity *</label>
                    <div className="relative">
                        <input 
                          type="number" 
                          min="1" 
                          max="120"
                          value={data.quantity} 
                          onChange={e => updateData('quantity', e.target.value)} 
                          className={getInputClass(data.quantity, true)} 
                          placeholder="Αριθμός Bins ή παλετών" 
                        />
                        {data.quantity && <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 pointer-events-none" />}
                    </div>
                </div>
            </div>
            <div className="mt-8 bg-gray-50/50 p-5 rounded-2xl border border-gray-200/50 backdrop-blur-sm">
                <label className="block text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.2em]">Κατηγορία (Επιλογή):</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ToggleSwitch label="Παραλαβή" checked={!!data.type.receivedItem} onChange={e => updateNested('type', 'receivedItem', e.target.checked)} />
                    <ToggleSwitch label="Υπηρεσία" checked={!!data.type.service} onChange={e => updateNested('type', 'service', e.target.checked)} />
                    <ToggleSwitch label="Επιστροφή" checked={!!data.type.returnedProduct} onChange={e => updateNested('type', 'returnedProduct', e.target.checked)} />
                    <ToggleSwitch label="Παραγωγή" checked={!!data.type.producedProduct} onChange={e => updateNested('type', 'producedProduct', e.target.checked)} />
                </div>
            </div>
        </section>

        {/* SECTION 2: NCR DETAILS */}
        <section ref={sectionRefs[1]} className={sectionCardClass}>
            <div className={verticalBarClass}></div>
            <div className="flex items-center gap-3 mb-6">
               <div className="bg-red-50 p-2 rounded-xl text-red-700 border border-red-100">
                  <AlertTriangle size={22} />
               </div>
               <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">2. Λεπτομέρειες Μη Συμμόρφωσης <span className="block text-xs font-bold text-gray-400 mt-0.5 tracking-normal">No conformity details</span></h2>
            </div>
            <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.keys(CATEGORY_LABELS).map((key) => (
                        <ToggleSwitch
                            key={key}
                            label={CATEGORY_LABELS[key]}
                            checked={!!(data.ncrCategory as any)[key]}
                            onChange={e => updateNested('ncrCategory', key, e.target.checked)}
                        />
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
                <div className="relative">
                    <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">Περιγραφή / Description *</label>
                    <div className="flex flex-col gap-3">
                         <div className="flex items-center gap-2">
                             <select onChange={e => { if(e.target.value) updateData('ncrDescription', data.ncrDescription + (data.ncrDescription ? ', ' : '') + e.target.value) }} className="flex-1 p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold text-blue-900 focus:ring-4 focus:ring-blue-900/5 outline-none">
                                <option value="">+ Γρήγορη προσθήκη λόγου...</option>
                                {lists.ncrReasons.map(r => <option key={r} value={r}>{r}</option>)}
                             </select>
                             <button onClick={() => updateData('ncrDescription', '')} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Καθαρισμός">
                                <X size={20} />
                             </button>
                         </div>
                         <div className="relative">
                            <textarea value={data.ncrDescription} onChange={e => updateData('ncrDescription', e.target.value)} className={`${getInputClass(data.ncrDescription, true)} h-32 resize-none`} placeholder="Αναλυτική περιγραφή της μη συμμόρφωσης..." />
                            {data.ncrDescription && <Check size={18} className="absolute right-4 bottom-4 text-green-600 pointer-events-none" />}
                         </div>
                    </div>
                </div>
                {isEO11Selected && (
                  <div className="space-y-0 mt-4 overflow-hidden rounded-3xl border border-blue-200 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-900 to-blue-800">
                       <div className="bg-white/20 p-2 rounded-xl text-white">
                          <ClipboardList size={22} />
                       </div>
                       <div className="flex flex-col">
                          <h3 className="text-base font-black text-white uppercase tracking-wider">ΣΤΟΙΧΕΙΑ ΕΠΙΘΕΩΡΗΣΗΣ (ΕΟ-11)</h3>
                          <span className="text-[10px] text-blue-200 font-bold">Πρόλσθετα δεδομένα για το δελτίο παραλαβής φρούτων</span>
                       </div>
                    </div>
                    <div className="bg-blue-50/50 p-6 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[11px] font-black text-blue-900 mb-3 uppercase tracking-widest flex items-center gap-1.5">
                                   <AlertCircle size={14} className="text-blue-500" /> % ΠΟΣΟΣΤΟ ΑΚΑΤΑΛΛΗΛΩΝ ΦΡΟΥΤΩΝ *
                                </label>
                                <div className="relative">
                                    <input type="text" value={data.unsuitableFruitPercentage} onChange={e => updateData('unsuitableFruitPercentage', e.target.value)} className={`w-full p-5 border-2 rounded-2xl focus:ring-8 font-black text-3xl transition-all shadow-lg ${data.unsuitableFruitPercentage ? 'bg-green-50/30 border-green-500 text-green-900' : 'bg-white border-blue-200 text-blue-900 focus:border-blue-900'}`} placeholder="5%" />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                       {data.unsuitableFruitPercentage && <Check size={28} className="text-green-600" />}
                                       <span className="text-2xl font-black text-blue-200">%</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-blue-900 mb-3 uppercase tracking-widest">ΚΑΤΑΣΤΑΣΗ ΠΟΙΟΤΗΤΑΣ/ΚΑΘΑΡΙΟΤΗΤΑΣ ΠΕΡΙΕΚΤΩΝ *</label>
                                <div className="flex gap-4 h-[78px]">
                                    <button onClick={() => updateData('containersQuality', 'acceptable')} className={`flex-1 flex flex-col items-center justify-center border-2 rounded-2xl font-black text-xs transition-all shadow-md gap-1 ${data.containersQuality === 'acceptable' ? 'bg-blue-900 border-blue-950 text-white ring-8 ring-blue-900/10 scale-[1.02]' : 'bg-white border-blue-100 text-blue-900 hover:bg-blue-50'}`}><CheckCircle2 size={20} />ΑΠΟΔΕΚΤΗ</button>
                                    <button onClick={() => updateData('containersQuality', 'non-acceptable')} className={`flex-1 flex flex-col items-center justify-center border-2 rounded-2xl font-black text-xs transition-all shadow-md gap-1 ${data.containersQuality === 'non-acceptable' ? 'bg-red-700 border-red-800 text-white ring-8 ring-red-900/10 scale-[1.02]' : 'bg-white border-blue-100 text-blue-900 hover:bg-blue-50'}`}><AlertTriangle size={20} />ΜΗ ΑΠΟΔΕΚΤΗ</button>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                    <div className="space-y-4">
                        <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">Συνημμένα / Attachments</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 shadow-inner">
                             {lists.attachmentTypes.map(t => (
                               <ToggleSwitch key={t} label={t} checked={data.attachmentType.includes(t)} onChange={e => toggleAttachment(t, e.target.checked)} />
                             ))}
                        </div>
                    </div>
                    <div className="flex flex-col justify-end">
                        <SearchableSelect label="Υπεύθυνος Αναφοράς / Submitted by *" value={data.reporter} options={lists.managers} onChange={(val) => updateData('reporter', val)} isMandatory={true} />
                    </div>
                </div>
            </div>
        </section>

        {/* SECTION 3: CORRECTION */}
        <section ref={sectionRefs[2]} className={sectionCardClass}>
            <div className={verticalBarClass}></div>
            <div className="flex items-center gap-3 mb-6">
               <div className="bg-orange-50 p-2 rounded-xl text-orange-700 border border-orange-100">
                  <Hammer size={22} />
               </div>
               <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">3. Διορθωτικές Ενέργειες <span className="block text-xs font-bold text-gray-400 mt-0.5 tracking-normal">Correction Actions</span></h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {Object.keys(CORRECTION_LABELS).map((key) => (
                    <ToggleSwitch key={key} label={CORRECTION_LABELS[key]} checked={!!(data.correctionAction as any)[key]} onChange={e => updateNested('correctionAction', key, e.target.checked)} />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-blue-50/30 p-6 rounded-2xl border border-blue-100 shadow-inner">
                 <SearchableSelect label="Υπεύθυνος Διόρθωσης / Responsible *" value={data.correctionResponsible} options={lists.managers} onChange={(val) => updateData('correctionResponsible', val)} isMandatory={true} />
                <div className="relative">
                    <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">Προθεσμία / Deadline *</label>
                    <div className="relative">
                        <input type="date" value={data.correctionDeadline} onChange={e => updateData('correctionDeadline', e.target.value)} className={getInputClass(data.correctionDeadline, true)} />
                        {data.correctionDeadline && <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 pointer-events-none" />}
                    </div>
                </div>
            </div>
        </section>

        {/* SECTION 4: EVALUATION */}
        <section ref={sectionRefs[3]} className={sectionCardClass}>
            <div className={verticalBarClass}></div>
            <div className="flex items-center gap-3 mb-6">
               <div className="bg-green-50 p-2 rounded-xl text-green-700 border border-green-100">
                  <ClipboardCheck size={22} />
               </div>
               <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">4. Έλεγχος & Αξιολόγηση <span className="block text-xs font-bold text-gray-400 mt-0.5 tracking-normal">Checking & Evaluation</span></h2>
            </div>
             <div className="mb-10">
                 <h3 className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2"><div className="w-4 h-[1px] bg-gray-200"></div> Έλεγχος / Checking</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">Περιγραφή Ελέγχου / Checking Desc.</label>
                        <textarea rows={10} value={data.controlDescription} onChange={e => updateData('controlDescription', e.target.value)} className={`${getInputClass(data.controlDescription, false)} resize-none`} placeholder="Περιγράψτε το αποτέλεσμα του ελέγχου..." />
                    </div>
                    <SearchableSelect label="Υπεύθυνος Ελέγχου / QC Resp." value={data.qcResponsible} options={lists.managers} onChange={(val) => updateData('qcResponsible', val)} />
                    <div>
                        <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">Ημ. Ελέγχου / Date</label>
                        <input type="date" value={data.controlDate} onChange={e => updateData('controlDate', e.target.value)} className={getInputClass(data.controlDate, false)} />
                    </div>
                 </div>
             </div>
             <div className="bg-blue-50/20 p-6 rounded-3xl border border-blue-100/50">
                 <h3 className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2"><div className="w-4 h-[1px] bg-gray-200"></div> Αξιολόγηση / Evaluation</h3>
                 <div className="mb-8">
                    <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">Αιτίες / Root Causes</label>
                    <div className="flex flex-col md:flex-row gap-3">
                        <select onChange={e => { if(e.target.value) updateData('analysisRootCause', data.analysisRootCause + (data.analysisRootCause ? ', ' : '') + e.target.value) }} className="w-full md:w-1/3 p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold text-blue-900 focus:ring-4 focus:ring-blue-900/5 outline-none">
                            <option value="">+ Επιλογή Αιτίας...</option>
                            {lists.rootCauses.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <textarea value={data.analysisRootCause} onChange={e => updateData('analysisRootCause', e.target.value)} className="w-full md:w-2/3 p-3 border border-gray-300 rounded-xl h-24 bg-white focus:ring-4 focus:ring-blue-900/10 focus:border-blue-900 transition-all font-medium" placeholder="Περιγράψτε τα αίτια..." />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                      <span className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Αποτελεσματικότητα</span>
                      <div className="flex flex-col gap-3">
                        <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${data.satisfactory.yes ? 'bg-blue-900 border-blue-900 text-white shadow-lg scale-[1.02]' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-blue-200'}`}>
                            <span className="text-xs font-black">ΝΑΙ / YES (Ικανοποιητική)</span>
                            <input type="checkbox" checked={data.satisfactory.yes} onChange={e => handleSatisfactoryChange('yes', e.target.checked)} className="sr-only" />
                            {data.satisfactory.yes && <CheckCircle2 size={16} />}
                        </label>
                        <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${data.satisfactory.no ? 'bg-red-700 border-red-700 text-white shadow-lg scale-[1.02]' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-red-200'}`}>
                            <span className="text-xs font-black">ΟΧΙ / NO (Μη Ικανοποιητική)</span>
                            <input type="checkbox" checked={data.satisfactory.no} onChange={e => handleSatisfactoryChange('no', e.target.checked)} className="sr-only" />
                            {data.satisfactory.no && <AlertTriangle size={16} />}
                        </label>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 shadow-sm border border-gray-100 space-y-4">
                      <span className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Απαίτηση CAPA</span>
                      <div className="flex flex-col gap-3">
                        <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${data.capaRequired.yes ? 'bg-blue-900 border-blue-900 text-white shadow-lg scale-[1.02]' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-blue-200'}`}>
                            <span className="text-xs font-black">ΝΑΙ / YES (Απαιτείται CAPA)</span>
                            <input type="checkbox" checked={data.capaRequired.yes} onChange={e => handleCapaChange('yes', e.target.checked)} className="sr-only" />
                            {data.capaRequired.yes && <CheckCircle2 size={16} />}
                        </label>
                        <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${data.capaRequired.no ? 'bg-gray-800 border-gray-800 text-white shadow-lg scale-[1.02]' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-300'}`}>
                            <span className="text-xs font-black">ΟΧΙ / NO (Δεν απαιτείται)</span>
                            <input type="checkbox" checked={data.capaRequired.no} onChange={e => handleCapaChange('no', e.target.checked)} className="sr-only" />
                            {data.capaRequired.no && <CheckCircle2 size={16} />}
                        </label>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">Παρατηρήσεις: / Comments</label>
                        <textarea rows={4} value={data.remarks} onChange={e => updateData('remarks', e.target.value)} className={`${getInputClass(data.remarks, false)} resize-none mb-4`} placeholder="Συμπληρώστε τυχόν παρατηρήσεις..." />
                    </div>
                    <div className="md:col-span-2">
                        <SearchableSelect label="Υπεύθυνος Ποιότητας / Quality Manager" value={data.finalQcResponsible} options={lists.managers} onChange={(val) => updateData('finalQcResponsible', val)} />
                    </div>
                 </div>
             </div>
        </section>

        {/* SECTION 5: MEDIA */}
        {isPhotosSelected && (
          <section ref={sectionRefs[4]} className={sectionCardClass}>
              <div className={verticalBarClass}></div>
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                     <div className="bg-purple-50 p-2 rounded-xl text-purple-700 border border-purple-100">
                        <ImageIcon size={22} />
                     </div>
                     <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">5. Φωτογραφίες <span className="text-sm font-bold text-gray-400 ml-2">({data.images.length}/6)</span></h2>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-blue-900 text-white px-5 py-2.5 rounded-2xl font-black text-sm transition-all hover:bg-blue-800 shadow-xl active:scale-95">
                      <Camera size={18} /> Προσθήκη
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {data.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square bg-gray-100 rounded-3xl overflow-hidden border border-gray-200 group shadow-lg ring-1 ring-black/5 transition-all hover:scale-[1.02] hover:shadow-2xl">
                          <img src={img} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <button onClick={() => removeImage(idx)} className="absolute top-3 right-3 bg-red-600/90 backdrop-blur-sm text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-red-700"><X size={18} /></button>
                      </div>
                  ))}
                  {data.images.length === 0 && (
                      <div className="col-span-full py-20 text-center border-4 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center gap-4 bg-gray-50/30">
                          <div className="p-4 bg-white rounded-3xl shadow-sm text-gray-200"><Camera size={48} /></div>
                          <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Δεν έχουν προστεθεί φωτογραφίες</p>
                      </div>
                  )}
              </div>
          </section>
        )}

        {/* BOTTOM ACTIONS BAR */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-center z-50 md:hidden">
           <button onClick={handlePreview} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-blue-900 text-blue-900 font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-wider"><Eye size={20} /> Preview</button>
           <button onClick={handleArchiveSave} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-wider"><Save size={20} /> Save Archive</button>
        </div>

        <div className="hidden md:flex flex-col md:flex-row gap-6 pt-12 pb-20 border-t border-gray-200">
           <button onClick={handlePreview} className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-white border-2 border-blue-900 text-blue-900 font-black rounded-3xl hover:bg-blue-50 shadow-xl transition-all active:scale-[0.98] uppercase tracking-wider text-xl"><Eye size={28} /> ΠΡΟΕΠΙΣΚΟΠΗΣΗ</button>
           <button onClick={handleArchiveSave} className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-blue-900 text-white font-black rounded-3xl hover:bg-blue-800 shadow-2xl transition-all active:scale-[0.98] uppercase tracking-wider text-xl"><Save size={28} /> ΑΠΟΘΗΚΕΥΣΗ ΣΤΟ ΑΡΧΕΙΟ</button>
        </div>
      </div>
    </div>
  );
};

export default NCRForm;
