import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product, Category } from '../types';
import { AlertTriangle, Edit, Check, X, Image as ImageIcon, Tag, Upload, Loader2, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Pendencias({ companyId, onRefresh }: { companyId: string | null, onRefresh?: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchPendencies() {
    if (!supabase || companyId === null) return;
    const { data, error } = await supabase.from('products').select('*').eq('company_id', companyId);
    const { data: bData } = await supabase.from('brands').select('*').eq('company_id', companyId);
    if (!error) {
      const brandsData = bData || [];
      const pending = (data || []).filter(p => !p.category_id || !p.imagem).map(p => {
        const brand = brandsData.find(b => b.id === p.brand_id);
        const margin = brand?.margin_percentage || 0;
        return { ...p, categoria_pendente: !p.category_id, imagem_pendente: !p.imagem, preco_unitario: margin > 0 ? p.preco_unitario * (1 + margin / 100) : p.preco_unitario, preco_box: margin > 0 ? p.preco_box * (1 + margin / 100) : p.preco_box };
      }).sort((a, b) => {
        if (a.imagem_pendente && !b.imagem_pendente) return -1;
        if (!a.imagem_pendente && b.imagem_pendente) return 1;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      setProducts(pending);
    }
    const { data: catData } = await supabase.from('categories').select('*').eq('company_id', companyId);
    setCategories(catData || []);
    setLoading(false);
  }

  useEffect(() => { fetchPendencies(); }, [companyId]);

  const handleSave = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('products').update({ category_id: editData.category_id, imagem: editData.imagem, categoria_pendente: !editData.category_id, imagem_pendente: !editData.imagem }).eq('id', id);
    if (!error) { setEditingId(null); fetchPendencies(); if (onRefresh) onRefresh(); }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) setEditData(prev => ({ ...prev, imagem: data.secure_url }));
    } catch (error) { console.error('Erro no upload:', error); }
    finally { setIsUploading(false); }
  };

  if (loading && products.length === 0) return (
    <div className="p-6 flex items-center justify-center min-h-[300px]">
      <Loader2 className="animate-spin text-amber-500" size={24} />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 border border-amber-100">
            <AlertTriangle size={16} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">Pendências de Revisão</h1>
            <p className="text-xs text-slate-400">Produtos que precisam de atenção</p>
          </div>
        </div>
        {products.length > 0 && (
          <span className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black border border-amber-100">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            {products.length} aguardando
          </span>
        )}
      </div>

      {/* List */}
      <AnimatePresence mode="popLayout">
        {products.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl border-2 border-dashed border-slate-100 p-12 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
              <Check className="text-emerald-500" size={24} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-bold text-slate-400">Tudo revisado! Nenhuma pendência no momento.</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {products.map((product, index) => (
              <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} key={product.id}
                className={`bg-white rounded-xl border transition-all duration-300 ${editingId === product.id ? 'border-primary/30 shadow-md shadow-primary/5' : 'border-slate-100 shadow-sm hover:border-slate-200'}`}>

                {/* Compact row */}
                <div className="flex items-center gap-3 p-3">
                  {/* Image */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100">
                      {(editData.imagem && editingId === product.id) || product.imagem ? (
                        <img src={editingId === product.id ? (editData.imagem || product.imagem) : product.imagem} alt={product.nome} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon className="text-slate-200" size={22} strokeWidth={1} />
                      )}
                      {isUploading && editingId === product.id && (
                        <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                          <Loader2 className="animate-spin text-primary" size={16} />
                        </div>
                      )}
                    </div>
                    {editingId === product.id && (
                      <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white shadow-md" title="Upload imagem">
                        <Upload size={9} strokeWidth={3} />
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 uppercase truncate leading-tight">{product.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-slate-400 font-mono">SKU: {product.sku}</span>
                      <span className="text-[9px] font-black text-primary">R$ {(product.preco_unitario || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      {product.categoria_pendente && (
                        <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-black border border-amber-100 flex items-center gap-0.5">
                          <Tag size={8} strokeWidth={3} /> Categoria
                        </span>
                      )}
                      {product.imagem_pendente && (
                        <span className="text-[8px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-md font-black border border-rose-100 flex items-center gap-0.5">
                          <ImageIcon size={8} strokeWidth={3} /> Imagem
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {editingId === product.id ? (
                      <>
                        <button onClick={() => setEditingId(null)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                          <X size={14} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => handleSave(product.id)} className="w-7 h-7 flex items-center justify-center text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-all shadow-sm">
                          <Check size={14} strokeWidth={3} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => { setEditingId(product.id); setEditData({ category_id: product.category_id, imagem: product.imagem }); }}
                        className="px-3 py-1.5 text-primary bg-primary/5 hover:bg-primary hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                        <Edit size={11} strokeWidth={3} /> Revisar
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded edit form */}
                <AnimatePresence>
                  {editingId === product.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Categoria</label>
                          <div className="relative">
                            <Tag size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                            <select
                              className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary/40 appearance-none"
                              value={editData.category_id || ''} onChange={e => setEditData({ ...editData, category_id: e.target.value })}>
                              <option value="">Selecionar categoria</option>
                              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">URL da Imagem</label>
                          <div className="relative">
                            <LinkIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input type="text" className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary/40 placeholder:text-slate-300"
                              placeholder="https://cloudinary.com/..." value={editData.imagem || ''} onChange={e => setEditData({ ...editData, imagem: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </motion.div>
  );
}
