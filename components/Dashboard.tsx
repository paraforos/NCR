
import React, { useState, useEffect, useMemo } from 'react';
import { getAllReports } from '../services/dbService';
import { ReportData, AppLists } from '../types';
import { 
  BarChart3, TrendingUp, AlertTriangle, Users, 
  Package, Calendar, ChevronRight, ArrowUpRight,
  Target, ShieldAlert, CheckCircle2, AlertCircle,
  Filter, X, LayoutGrid, Info
} from 'lucide-react';

interface DashboardProps {
  onOpenForm: () => void;
  lists: AppLists;
}

const StatCard: React.FC<{ title: string, value: string | number, sub: string, icon: React.ReactNode, color: string }> = ({ title, value, sub, icon, color }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:scale-150 transition-transform ${color}`}></div>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} text-white shadow-lg transition-transform group-hover:rotate-12`}>
        {icon}
      </div>
      <div className="bg-gray-50 px-3 py-1 rounded-full flex items-center gap-1">
        <ArrowUpRight size={12} className="text-green-500" />
        <span className="text-[10px] font-black text-gray-400 uppercase">Live</span>
      </div>
    </div>
    <div className="space-y-1">
      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">{title}</h4>
      <div className="text-3xl font-black text-blue-950 tracking-tighter">{value}</div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate">{sub}</p>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onOpenForm, lists }) => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllReports();
        setReports(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filteredReports = useMemo(() => {
    if (!selectedProduct) return reports;
    return reports.filter(r => r.product === selectedProduct);
  }, [reports, selectedProduct]);

  const stats = useMemo(() => {
    const total = filteredReports.length;
    const uniqueSuppliers = new Set(filteredReports.map(r => r.supplier)).size;
    
    // Calculate average unsuitable %
    const unsuitableValues = filteredReports
      .map(r => parseFloat(r.unsuitableFruitPercentage))
      .filter(v => !isNaN(v));
    const avgUnsuitable = unsuitableValues.length > 0 
      ? (unsuitableValues.reduce((a, b) => a + b, 0) / unsuitableValues.length).toFixed(1) 
      : "0";

    // Dynamic Status Calculation
    const unsatisfactoryCount = filteredReports.filter(r => r.satisfactory && r.satisfactory.no).length;
    const statusLabel = unsatisfactoryCount > 0 ? "Attention" : "Healthy";
    const statusSubtext = unsatisfactoryCount > 0 
      ? `${unsatisfactoryCount} ΜΗ ΙΚΑΝΟΠΟΙΗΤΙΚΕΣ` 
      : "ΠΛΗΡΗΣ ΣΥΜΜΟΡΦΩΣΗ";
    const statusColor = unsatisfactoryCount > 0 ? "bg-amber-500" : "bg-green-600";
    const statusIcon = unsatisfactoryCount > 0 ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />;

    // Supplier distribution
    const supplierCounts: Record<string, number> = {};
    filteredReports.forEach(r => {
      if (r.supplier) {
        supplierCounts[r.supplier] = (supplierCounts[r.supplier] || 0) + 1;
      }
    });
    const sortedSuppliers = Object.entries(supplierCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Product distribution (For full analysis)
    const productCounts: Record<string, number> = {};
    reports.forEach(r => { // Use all reports for the product overview chart
      if (r.product) {
        productCounts[r.product] = (productCounts[r.product] || 0) + 1;
      }
    });
    const sortedProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Category counts for filtered set
    const categories: Record<string, number> = {
      'Ποιότητα': 0,
      'Συσκευασία': 0,
      'Μεταφορά': 0,
      'Ασφάλεια': 0,
    };
    filteredReports.forEach(r => {
      if (r.ncrCategory.quality) categories['Ποιότητα']++;
      if (r.ncrCategory.packaging) categories['Συσκευασία']++;
      if (r.ncrCategory.transport) categories['Μεταφορά']++;
      if (r.ncrCategory.foodSafety) categories['Ασφάλεια']++;
    });

    return { total, uniqueSuppliers, avgUnsuitable, sortedSuppliers, sortedProducts, categories, statusLabel, statusSubtext, statusColor, statusIcon };
  }, [filteredReports, reports]);

  if (isLoading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-8 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-xs uppercase tracking-[0.2em] text-blue-950">Υπολογισμός Δεδομένων...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* WELCOME BANNER & FILTER BAR */}
      <div className="bg-blue-950 rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-900/50 to-transparent pointer-events-none"></div>
         <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-2 flex-1">
               <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600/30 border border-blue-400/20 rounded-full">
                  <TrendingUp size={12} className="text-blue-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest">ADVANCED ANALYTICS V2.0</span>
               </div>
               <h2 className="text-2xl md:text-4xl font-black tracking-tighter leading-none uppercase">
                  ΕΠΙΣΚΟΠΗΣΗ <span className="text-blue-400">ΣΥΜΜΟΡΦΩΣΗΣ.</span>
               </h2>
               <p className="text-blue-200/70 font-bold text-xs uppercase tracking-wide">
                  Ανάλυση απόδοσης και τάσεων ανά προϊόν και προμηθευτή.
               </p>
            </div>

            {/* FILTER COMPONENT */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/5 p-3 rounded-[2rem] border border-white/10 backdrop-blur-sm">
               <div className="flex items-center gap-3 px-3">
                  <Filter size={18} className="text-blue-400" />
                  <span className="text-[10px] font-black uppercase text-blue-200">Φίλτρο Προϊόντος</span>
               </div>
               <div className="relative flex-1 sm:w-64">
                  <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                  <select 
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-blue-900/40 border border-white/10 rounded-2xl text-xs font-black text-white outline-none focus:ring-4 focus:ring-blue-600/30 appearance-none cursor-pointer"
                  >
                     <option value="" className="bg-blue-950">ΟΛΑ ΤΑ ΦΡΟΥΤΑ</option>
                     {lists.products.map(p => <option key={p} value={p} className="bg-blue-950">{p.toUpperCase()}</option>)}
                  </select>
               </div>
               {selectedProduct && (
                 <button 
                  onClick={() => setSelectedProduct('')}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-blue-300"
                 >
                    <X size={18} />
                 </button>
               )}
               <button 
                onClick={onOpenForm}
                className="bg-white text-blue-950 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-tighter shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 group whitespace-nowrap"
              >
                 ΝΕΑ ΑΝΑΦΟΡΑ <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
         </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={`Σύνολο NCR ${selectedProduct ? `(${selectedProduct})` : ''}`} 
          value={stats.total} 
          sub="Καταγεγραμμένες περιπτώσεις" 
          icon={<AlertTriangle size={24} />} 
          color="bg-red-600" 
        />
        <StatCard 
          title="Προμηθευτές" 
          value={stats.uniqueSuppliers} 
          sub="Ενεργές καταχωρήσεις" 
          icon={<Users size={24} />} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Avg. Loss %" 
          value={`${stats.avgUnsuitable}%`} 
          sub="Μέσος όρος ακατάλληλων (EO-11)" 
          icon={<Target size={24} />} 
          color="bg-orange-500" 
        />
        <StatCard 
          title="Health Status" 
          value={stats.statusLabel} 
          sub={stats.statusSubtext} 
          icon={stats.statusIcon} 
          color={stats.statusColor} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FRUIT IMPACT ANALYSIS (NEW SECTION) */}
        {!selectedProduct && (
          <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col animate-in slide-in-from-left-4">
             <div className="flex items-center gap-3 mb-8">
                <div className="bg-orange-50 p-2 rounded-xl text-orange-600 border border-orange-100">
                   <Package size={22} />
                </div>
                <h3 className="text-xl font-black text-blue-950 uppercase tracking-tight">Fruit Performance</h3>
             </div>
             
             <div className="flex-1 space-y-6">
                {stats.sortedProducts.length > 0 ? stats.sortedProducts.map(([product, count], idx) => (
                  <div key={product} className="space-y-2 group cursor-pointer" onClick={() => setSelectedProduct(product)}>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-blue-950 uppercase">{product}</span>
                        <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">{count} NCRs</span>
                     </div>
                     <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-1000" 
                          style={{ width: reports.length > 0 ? `${(count / reports.length) * 100}%` : '0%' }}
                        ></div>
                     </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                     <LayoutGrid size={48} />
                     <p className="text-[10px] font-black uppercase mt-2">No product data</p>
                  </div>
                )}
             </div>
             <div className="mt-8 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                <p className="text-[9px] font-bold text-orange-900/60 uppercase leading-tight">
                   Εμφάνιση των 5 προϊόντων με το μεγαλύτερο πλήθος μη συμμορφώσεων.
                </p>
             </div>
          </div>
        )}

        {/* SUPPLIER LEADERBOARD */}
        <div className={`${selectedProduct ? 'lg:col-span-2' : 'lg:col-span-1'} bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col transition-all duration-500`}>
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <div className="bg-blue-50 p-2 rounded-xl text-blue-900 border border-blue-100">
                    <BarChart3 size={22} />
                 </div>
                 <h3 className="text-xl font-black text-blue-950 uppercase tracking-tight">Supplier Impact</h3>
              </div>
           </div>

           <div className="flex-1 space-y-6">
              {stats.sortedSuppliers.length > 0 ? stats.sortedSuppliers.map(([supplier, count], idx) => (
                <div key={supplier} className="space-y-2">
                   <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                         <span className="text-lg font-black text-blue-900/10">0{idx + 1}</span>
                         <span className="text-[11px] font-black text-blue-950 uppercase truncate max-w-[140px]">{supplier}</span>
                      </div>
                      <span className="text-[10px] font-black text-blue-900">{count} NCRs</span>
                   </div>
                   <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-900 rounded-full transition-all duration-1000" 
                        style={{ width: stats.total > 0 ? `${(count / stats.total) * 100}%` : '0%' }}
                      ></div>
                   </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                   <Users size={48} />
                   <p className="text-[10px] font-black uppercase mt-2">No supplier data</p>
                </div>
              )}
           </div>
        </div>

        {/* FAULT ANALYSIS */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-red-50 p-2 rounded-xl text-red-600 border border-red-100">
                <ShieldAlert size={22} />
              </div>
              <h3 className="text-xl font-black text-blue-950 uppercase tracking-tight">Fault Breakdown</h3>
            </div>

            <div className="space-y-6">
               {(Object.entries(stats.categories) as [string, number][]).map(([cat, count]) => (
                 <div key={cat} className="flex items-center gap-4 group">
                    <div className="flex-1">
                       <div className="flex justify-between mb-1">
                          <span className="text-[11px] font-black text-gray-500 uppercase">{cat}</span>
                          <span className="text-xs font-black text-blue-950">{count}</span>
                       </div>
                       <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${count > 5 ? 'bg-red-500' : 'bg-blue-900'}`} 
                            style={{ width: stats.total > 0 ? `${(count / stats.total) * 100}%` : '0%' }}
                          ></div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>

            <div className="mt-10 p-6 bg-blue-50 rounded-3xl border border-blue-100">
               <div className="flex items-center gap-2 mb-2">
                  <Info size={14} className="text-blue-900" />
                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Συμπέρασμα</span>
               </div>
               <p className="text-[10px] font-bold text-blue-900/60 leading-tight uppercase">
                  {selectedProduct 
                    ? `Ανάλυση σφαλμάτων αποκλειστικά για ${selectedProduct}.`
                    : "Γενική ανάλυση σφαλμάτων για όλα τα προϊόντα."}
               </p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
