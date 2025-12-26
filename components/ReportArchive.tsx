
import React, { useState, useEffect, useMemo } from 'react';
import { ReportData, AppLists } from '../types';
import { getAllReports, deleteReport } from '../services/dbService';
import { generatePDF } from '../services/pdfService';
import { 
  Search, Trash2, FileText, Printer, Edit3, Calendar, 
  Users, Package, ChevronRight, Archive, ArrowLeft,
  AlertCircle, ImageOff, ImageIcon, CheckCircle, Clock,
  ChevronLeft, Filter, X, ShieldCheck, Activity
} from 'lucide-react';

interface ReportArchiveProps {
  lists: AppLists;
  onEdit: (report: ReportData) => void;
  onClose: () => void;
}

const ReportArchive: React.FC<ReportArchiveProps> = ({ lists, onEdit, onClose }) => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'closed'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await getAllReports();
      // Ταξινόμηση από το μεγαλύτερο ID στο μικρότερο
      setReports(data.sort((a, b) => (b.id || 0) - (a.id || 0)));
    } catch (err) {
      console.error("Failed to load archive", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    let filtered = reports;

    // Search Term Filter
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.supplier.toLowerCase().includes(s) || 
        r.product.toLowerCase().includes(s) ||
        r.vehicle.toLowerCase().includes(s) ||
        (r.id && r.id.toString().includes(s))
      );
    }

    // Product Filter
    if (filterProduct) {
      filtered = filtered.filter(r => r.product === filterProduct);
    }

    // Status Filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => {
        const isClosed = r.controlDate && r.controlDate.trim() !== "";
        return filterStatus === 'closed' ? isClosed : !isClosed;
      });
    }

    // Date Filters
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      filtered = filtered.filter(r => new Date(r.reportDate).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      filtered = filtered.filter(r => new Date(r.reportDate).getTime() <= to);
    }

    return filtered;
  }, [reports, searchTerm, filterProduct, filterStatus, dateFrom, dateTo]);

  // Handle reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterProduct, filterStatus, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την αναφορά;')) {
      await deleteReport(id);
      loadReports();
    }
  };

  const handlePrint = async (report: ReportData, e: React.MouseEvent) => {
    e.stopPropagation();
    await generatePDF(report, lists, 'save');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterProduct('');
    setFilterStatus('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="bg-slate-50 min-h-[85vh] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <header className="bg-blue-950 p-6 md:p-8 text-white">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                <ArrowLeft size={24} />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Archive size={20} className="text-blue-400" />
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Αρχείο Αναφορών</h2>
                </div>
                <p className="text-xs font-bold text-blue-300 uppercase tracking-widest">Report History & Advanced Filtering</p>
              </div>
            </div>

            <div className="relative w-full md:w-96">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
              <input 
                type="text"
                placeholder="Αναζήτηση (Προμηθευτής, ID...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-sm font-bold placeholder:text-blue-300/50 focus:bg-white/20 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-white"
              />
            </div>
          </div>

          {/* ADVANCED FILTERS ROW */}
          <div className="flex flex-wrap items-end gap-4 p-4 bg-white/5 rounded-3xl border border-white/5">
             {/* PRODUCT FILTER */}
             <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5 ml-1">Είδος Φρούτου</label>
                <div className="relative">
                  <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                  <select 
                    value={filterProduct} 
                    onChange={e => setFilterProduct(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-blue-900/40 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                  >
                    <option value="" className="bg-blue-950">Όλα τα προϊόντα</option>
                    {lists.products.map(p => <option key={p} value={p} className="bg-blue-950">{p}</option>)}
                  </select>
                </div>
             </div>

             {/* STATUS FILTER */}
             <div className="flex-1 min-w-[180px]">
                <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5 ml-1">Κατάσταση</label>
                <div className="relative">
                  <Activity size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                  <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value as any)}
                    className="w-full pl-9 pr-4 py-2.5 bg-blue-900/40 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                  >
                    <option value="all" className="bg-blue-950">Όλες οι Αναφορές</option>
                    <option value="pending" className="bg-blue-950">Σε Εκκρεμότητα</option>
                    <option value="closed" className="bg-blue-950">Κλειστές (Closed)</option>
                  </select>
                </div>
             </div>

             {/* DATE RANGE */}
             <div className="w-full md:w-auto flex items-center gap-2">
                <div>
                   <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5 ml-1">Από Ημ/νία</label>
                   <input 
                    type="date" 
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full px-4 py-2 bg-blue-900/40 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                   />
                </div>
                <div className="mt-6 text-blue-400">-</div>
                <div>
                   <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5 ml-1">Έως Ημ/νία</label>
                   <input 
                    type="date" 
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full px-4 py-2 bg-blue-900/40 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                   />
                </div>
             </div>

             <button 
               onClick={clearFilters}
               className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-blue-300 transition-all border border-white/5"
               title="Καθαρισμός Φίλτρων"
             >
                <X size={18} />
             </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4 text-gray-400">
             <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
             <p className="font-black text-xs uppercase tracking-widest">Φόρτωση...</p>
          </div>
        ) : paginatedReports.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4">
              {paginatedReports.map((report) => {
                const imageCount = report.images?.length || 0;
                const hasImages = imageCount > 0;
                const isClosed = report.controlDate && report.controlDate.trim() !== "";
                
                return (
                  <div 
                    key={report.id}
                    onClick={() => onEdit(report)}
                    className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group cursor-pointer flex flex-col md:flex-row items-start md:items-center gap-6 relative"
                  >
                    {/* DATE & ID BADGE */}
                    <div className="flex flex-col items-center justify-center bg-slate-50 border border-gray-100 p-3 rounded-2xl min-w-[85px] group-hover:bg-blue-900 group-hover:text-white transition-colors">
                       <span className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">ID: {report.id}</span>
                       <span className="text-xs font-black">
                        {new Date(report.reportDate).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })}
                       </span>
                       <span className="text-[10px] font-bold opacity-60 uppercase">{new Date(report.reportDate).getFullYear()}</span>
                    </div>

                    {/* INFO */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Users size={14} className="text-blue-600" />
                        <h3 className="text-lg font-black text-blue-950 uppercase tracking-tight truncate max-w-[300px]">
                          {report.supplier}
                        </h3>
                        
                        {/* STATUS BADGE */}
                        {isClosed ? (
                          <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-black border border-green-200 shadow-sm">
                             <CheckCircle size={12} /> Η Μη Συμμόρφωση έκλεισε στις {new Date(report.controlDate).toLocaleDateString('el-GR')}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black border border-red-200 shadow-sm">
                             <Clock size={12} className="animate-pulse" /> Μη Συμμόρφωση Σε Εκκρεμότητα
                          </div>
                        )}

                        {hasImages ? (
                          <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-lg text-[9px] font-black border border-purple-100">
                             <ImageIcon size={10} /> ΦΩΤΟΓΡΑΦΙΕΣ [{imageCount}]
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-[9px] font-black border border-amber-100">
                             <ImageOff size={10} /> NO MEDIA
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                         <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full">
                            <Package size={12} /> {report.product}
                         </div>
                         <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full">
                            <FileText size={12} /> {report.batch}
                         </div>
                         {report.correctionDeadline && (
                           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-gray-100 text-gray-500 border-transparent">
                             <Calendar size={12} /> Προθεσμία: {new Date(report.correctionDeadline).toLocaleDateString('el-GR')}
                           </div>
                         )}
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-50">
                       <button onClick={(e) => handleDelete(report.id!, e)} className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all">
                         <Trash2 size={18} />
                       </button>
                       <button onClick={(e) => handlePrint(report, e)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-blue-900 hover:text-white transition-all font-black text-xs uppercase">
                         <Printer size={16} /> <span className="md:hidden lg:inline">PDF</span>
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); onEdit(report); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-900 rounded-2xl hover:bg-blue-100 transition-all font-black text-xs uppercase">
                         <Edit3 size={16} /> <span className="md:hidden lg:inline">Επεξεργασία</span>
                       </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
               <div className="flex items-center justify-center gap-2 py-8">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-3 bg-white border border-gray-200 rounded-2xl text-blue-900 disabled:opacity-30 hover:bg-blue-50 transition-all shadow-sm"
                  >
                     <ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex items-center gap-1.5 px-4">
                     {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === page ? 'bg-blue-900 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                        >
                           {page}
                        </button>
                     ))}
                  </div>

                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-3 bg-white border border-gray-200 rounded-2xl text-blue-900 disabled:opacity-30 hover:bg-blue-50 transition-all shadow-sm"
                  >
                     <ChevronRight size={20} />
                  </button>
               </div>
            )}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center gap-6 text-center opacity-30">
             <Archive size={80} />
             <h4 className="text-xl font-black text-blue-900 uppercase">Δεν βρέθηκαν αποτελέσματα</h4>
             <button onClick={clearFilters} className="px-6 py-3 bg-blue-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Επαναφορά Φίλτρων</button>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="p-6 bg-white border-t border-gray-100 flex justify-between items-center">
         <div className="flex items-center gap-2 text-blue-900 font-black text-xs uppercase text-blue-900">
            <ShieldCheck size={16} /> Advanced Archive View
         </div>
         <span className="text-[10px] font-bold text-gray-400 uppercase">
            Προβολή {Math.min(filteredReports.length, (currentPage-1)*itemsPerPage+1)}-{Math.min(filteredReports.length, currentPage*itemsPerPage)} από {filteredReports.length} εγγραφές
         </span>
      </footer>
    </div>
  );
};

export default ReportArchive;
