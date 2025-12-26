
import React, { useState, useEffect, useMemo } from 'react';
import { ReportData, AppLists } from '../types';
import { getAllReports, deleteReport } from '../services/dbService';
import { generatePDF } from '../services/pdfService';
import { 
  Search, Trash2, Printer, Edit3, 
  ArrowLeft, Clock, AlertTriangle
} from 'lucide-react';

interface ReportArchiveProps {
  lists: AppLists;
  onEdit: (report: ReportData) => void;
  onClose: () => void;
}

const ReportArchive: React.FC<ReportArchiveProps> = ({ lists, onEdit, onClose }) => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await getAllReports();
      // Εμφάνιση ΜΟΝΟ των εκκρεμοτήτων (κενό controlDate)
      const pending = data.filter(r => !r.controlDate || r.controlDate.trim() === "");
      setReports(pending.sort((a, b) => (b.id || 0) - (a.id || 0)));
    } catch (err) {
      console.error("Failed to load pending list", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return reports;
    const s = searchTerm.toLowerCase();
    return reports.filter(r => 
      r.supplier.toLowerCase().includes(s) || 
      r.product.toLowerCase().includes(s)
    );
  }, [reports, searchTerm]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Διαγραφή αυτής της εκκρεμότητας;')) {
      await deleteReport(id);
      loadReports();
    }
  };

  const handlePrint = async (report: ReportData, e: React.MouseEvent) => {
    e.stopPropagation();
    await generatePDF(report, lists, 'save');
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col animate-in fade-in duration-300">
      <header className="bg-blue-900 p-5 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onClose} className="p-2 bg-white/10 rounded-xl active:scale-90">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">Εκκρεμότητες</h2>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Ανοιχτές Αναφορές</p>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
          <input 
            type="text"
            placeholder="Αναζήτηση..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/10 rounded-2xl text-sm placeholder:text-blue-300/50 text-white outline-none"
          />
        </div>
      </header>

      <main className="flex-1 p-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
             <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
             <p className="font-black text-[10px] uppercase">Φόρτωση...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredReports.map((report) => (
              <div 
                key={report.id}
                onClick={() => onEdit(report)}
                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">ID: #{report.id}</span>
                    <h3 className="text-sm font-black text-blue-950 uppercase leading-tight truncate max-w-[200px]">
                      {report.supplier}
                    </h3>
                  </div>
                  <div className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[9px] font-black border border-red-100 flex items-center gap-1">
                    <Clock size={10} /> ΕΚΚΡΕΜΕΙ
                  </div>
                </div>

                <div className="flex gap-2">
                   <div className="bg-gray-100 px-2 py-1 rounded-md text-[9px] font-bold text-gray-600 uppercase">{report.product}</div>
                   <div className="bg-gray-100 px-2 py-1 rounded-md text-[9px] font-bold text-gray-600 uppercase">{new Date(report.reportDate).toLocaleDateString('el-GR')}</div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                   <button onClick={(e) => handleDelete(report.id!, e)} className="p-2.5 text-gray-300 hover:text-red-600 transition-all">
                     <Trash2 size={18} />
                   </button>
                   <div className="flex-1"></div>
                   <button onClick={(e) => handlePrint(report, e)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 active:scale-95">
                     <Printer size={14} /> PDF
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); onEdit(report); }} className="px-4 py-2 bg-blue-50 text-blue-900 rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 active:scale-95">
                     <Edit3 size={14} /> ΕΠΕΞΕΡΓΑΣΙΑ
                   </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center gap-4 text-center opacity-20">
             <AlertTriangle size={48} />
             <h4 className="text-sm font-black text-blue-900 uppercase">Καμία Εκκρεμότητα</h4>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportArchive;
