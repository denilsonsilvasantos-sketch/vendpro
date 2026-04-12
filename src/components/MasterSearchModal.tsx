import React, { useState } from 'react';
import { Search, X, Package, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchMasterProducts } from '../services/productService';

interface MasterSearchModalProps {
  onClose: () => void;
  onSelect: (product: any) => void;
}

export default function MasterSearchModal({ onClose, onSelect }: MasterSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    const data = await searchMasterProducts(query);
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white p-6 md:p-8 rounded-[32px] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-white/20"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Package size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Buscar no Catálogo Mestre</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20} /></button>
        </div>

        <form onSubmit={handleSearch} className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Digite SKU ou Nome do produto..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-slate-900"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : 'Buscar'}
          </button>
        </form>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {results.map(product => (
            <div 
              key={product.id}
              className="flex items-center gap-4 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-primary/30 hover:bg-white transition-all group cursor-pointer"
              onClick={() => onSelect(product)}
            >
              <div className="w-16 h-16 bg-white rounded-xl border border-slate-100 overflow-hidden p-1">
                <img src={product.imagem} alt={product.nome} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/5 px-1.5 py-0.5 rounded">{product.brand_name}</span>
                  <span className="text-[9px] font-mono font-black text-slate-400">{product.sku}</span>
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase truncate">{product.nome}</h3>
              </div>
              <button className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>
          ))}

          {!loading && results.length === 0 && query && (
            <div className="text-center py-12 space-y-3">
              <Package className="mx-auto text-slate-200" size={48} strokeWidth={1} />
              <p className="text-slate-400 font-bold text-sm">Nenhum produto encontrado no mestre.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
