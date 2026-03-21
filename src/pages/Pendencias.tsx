import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product, Category } from '../types';
import { AlertTriangle, Edit, Check, X, Image as ImageIcon, Tag, Upload, Loader2, Link as LinkIcon, ChevronDown, Sparkles, Search, Filter } from 'lucide-react';
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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId);
      
    const { data: bData } = await supabase.from('brands').select('*').eq('company_id', companyId);
    
    if (error) {
      console.error(error);
    } else {
      const brandsData = bData || [];
      const pendingProducts = (data || []).filter(p => !p.category_id || !p.imagem);
      const productsWithMargin = pendingProducts.map(p => {
        const brand = brandsData.find(b => b.id === p.brand_id);
        const margin = brand?.margin_percentage || 0;
        return {
          ...p,
          categoria_pendente: !p.category_id,
          imagem_pendente: !p.imagem,
          preco_unitario: margin > 0 ? p.preco_unitario * (1 + margin / 100) : p.preco_unitario,
          preco_box: margin > 0 ? p.preco_box * (1 + margin / 100) : p.preco_box,
        };
      });

      const sortedData = productsWithMargin.sort((a, b) => {
        if (a.imagem_pendente && !b.imagem_pendente) return -1;
        if (!a.imagem_pendente && b.imagem_pendente) return 1;
        
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      setProducts(sortedData);
    }
    
    const { data: catData } = await supabase.from('categories').select('*').eq('company_id', companyId);
    setCategories(catData || []);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchPendencies();
  }, [companyId]);

  const handleSave = async (id: string) => {
    if (!supabase) return;
    
    const updates = {
      category_id: editData.category_id,
      imagem: editData.imagem,
      categoria_pendente: !editData.category_id,
      imagem_pendente: !editData.imagem
    };

    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (error) {
      console.error('Erro ao salvar:', error.message);
    } else {
      setEditingId(null);
      fetchPendencies();
      if (onRefresh) onRefresh();
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error('Configurações do Cloudinary não encontradas.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.secure_url) {
        setEditData(prev => ({ ...prev, imagem: data.secure_url }));
      }
    } catch (error) {
      console.error('Erro no upload para Cloudinary:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-6 animate-pulse">
        <div className="w-16 h-16 bg-amber-50 rounded-[24px] flex items-center justify-center text-amber-500 border border-amber-100 shadow-inner">
          <Loader2 className="animate-spin" size={32} />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Analisando pendências...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-12"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-50 rounded-[24px] flex items-center justify-center text-amber-500 border border-amber-100 shadow-inner">
              <AlertTriangle size={32} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Pendências de Revisão</h1>
              <p className="text-slate-500 font-medium text-lg">Produtos que precisam de atenção antes de irem ao catálogo</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 text-amber-600 px-10 py-6 rounded-[32px] text-xs font-black uppercase tracking-[0.2em] border border-amber-100 shadow-xl shadow-amber-500/5 flex items-center gap-4 self-start md:self-center">
          <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
          {products.length} itens aguardando
        </div>
      </div>
      
      <AnimatePresence mode="popLayout">
        {products.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-40 rounded-[56px] border-2 border-dashed border-slate-100 text-center space-y-10 shadow-inner"
          >
            <div className="w-40 h-40 bg-emerald-50 rounded-[48px] flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
              <Check className="text-emerald-500" size={80} strokeWidth={1.5} />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Tudo revisado!</h2>
              <p className="text-slate-400 max-w-sm mx-auto font-medium text-lg">Não há produtos pendentes de revisão no momento. Seu catálogo está pronto para brilhar.</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-10">
            {products.map((product, index) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={product.id} 
                className={`bg-white p-10 rounded-[56px] shadow-2xl transition-all duration-500 border ${editingId === product.id ? 'border-primary/40 shadow-primary/10 ring-[12px] ring-primary/5' : 'border-slate-100 shadow-slate-200/40 hover:border-slate-200 hover:-translate-y-1'} flex flex-col md:flex-row gap-12`}
              >
                <div className="relative group shrink-0 self-center md:self-start">
                  <div className="w-56 h-56 bg-slate-50 rounded-[48px] flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner group-hover:scale-105 transition-transform duration-500">
                    {(editData.imagem && editingId === product.id) || product.imagem ? (
                      <img 
                        src={editingId === product.id ? (editData.imagem || product.imagem) : product.imagem} 
                        alt={product.nome} 
                        className="w-full h-full object-contain p-8 bg-white transition-transform duration-700 group-hover:scale-110" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ImageIcon className="text-slate-200" size={80} strokeWidth={1} />
                    )}
                    <AnimatePresence>
                      {isUploading && editingId === product.id && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center flex-col gap-4"
                        >
                          <Loader2 className="animate-spin text-primary" size={48} strokeWidth={3} />
                          <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Enviando...</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {editingId === product.id && (
                    <motion.button 
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-4 -right-4 bg-primary text-white p-5 rounded-[24px] shadow-2xl shadow-primary/40 hover:scale-110 transition-transform active:scale-95 border-8 border-white group/btn"
                      title="Upload para Cloudinary"
                    >
                      <Upload size={28} strokeWidth={3} className="group-hover/btn:animate-bounce" />
                    </motion.button>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-between py-2 space-y-10">
                  <div className="space-y-8">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                      <div className="space-y-4">
                        <h3 className="font-black text-3xl text-slate-900 leading-none tracking-tight uppercase">
                          {product.nome}
                        </h3>
                        <div className="flex flex-wrap items-center gap-6">
                          <span className="text-[10px] font-black bg-slate-50 text-slate-400 px-4 py-2 rounded-xl border border-slate-100 uppercase tracking-[0.2em] shadow-sm">SKU: {product.sku}</span>
                          <span className="w-2 h-2 bg-slate-200 rounded-full" />
                          <span className="text-2xl font-black text-primary tracking-tighter">R$ {(product.preco_unitario || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {product.categoria_pendente && (
                          <span className="text-[10px] uppercase tracking-[0.3em] bg-amber-50 text-amber-600 px-5 py-3 rounded-full font-black border border-amber-100 shadow-xl shadow-amber-500/5 flex items-center gap-3">
                            <Tag size={14} strokeWidth={3} /> Categoria Pendente
                          </span>
                        )}
                        {product.imagem_pendente && (
                          <span className="text-[10px] uppercase tracking-[0.3em] bg-rose-50 text-rose-600 px-5 py-3 rounded-full font-black border border-rose-100 shadow-xl shadow-rose-500/5 flex items-center gap-3">
                            <ImageIcon size={14} strokeWidth={3} /> Imagem Pendente
                          </span>
                        )}
                      </div>
                    </div>

                    {editingId === product.id ? (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-6"
                      >
                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Definir Categoria</label>
                          <div className="relative group">
                            <Tag className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={24} strokeWidth={2.5} />
                            <select 
                              className="w-full pl-16 pr-12 py-6 bg-slate-50 border border-slate-100 rounded-[32px] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/40 transition-all appearance-none font-black uppercase tracking-[0.2em] text-[11px] text-slate-600 cursor-pointer shadow-inner"
                              value={editData.category_id || ''}
                              onChange={e => setEditData({...editData, category_id: e.target.value})}
                            >
                              <option value="">Selecionar Categoria</option>
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.nome}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={24} />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">URL da Imagem</label>
                          <div className="relative group">
                            <LinkIcon className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={24} strokeWidth={2.5} />
                            <input 
                              type="text"
                              className="w-full pl-16 pr-8 py-6 bg-slate-50 border border-slate-100 rounded-[32px] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/40 transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-inner"
                              placeholder="https://cloudinary.com/..."
                              value={editData.imagem || ''}
                              onChange={e => setEditData({...editData, imagem: e.target.value})}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col lg:flex-row lg:items-center gap-10 text-sm text-slate-600 bg-slate-50/50 p-8 rounded-[40px] border border-slate-100 shadow-inner">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-white rounded-[20px] flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                            <Tag size={24} strokeWidth={2.5} className="text-primary" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Categoria</p>
                            <span className="font-black text-slate-700 uppercase tracking-tight text-base">{categories.find(c => c.id === product.category_id)?.nome || <span className="italic text-slate-300 font-medium">Não definida</span>}</span>
                          </div>
                        </div>
                        {product.descricao && (
                          <div className="flex items-center gap-5 lg:border-l lg:border-slate-200 lg:pl-10">
                            <div className="w-14 h-14 bg-white rounded-[20px] flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                              <Sparkles size={24} strokeWidth={2.5} className="text-amber-500" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Descrição</p>
                              <span className="text-sm text-slate-500 font-bold line-clamp-1">{product.descricao}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-6 pt-8 border-t border-slate-50">
                    <AnimatePresence mode="wait">
                      {editingId === product.id ? (
                        <motion.div 
                          key="editing-actions"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto"
                        >
                          <button 
                            onClick={() => setEditingId(null)}
                            className="flex-1 sm:flex-none px-12 py-5 bg-slate-100 text-slate-600 rounded-[32px] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={() => handleSave(product.id)}
                            className="flex-1 sm:flex-none px-12 py-5 bg-emerald-500 text-white rounded-[32px] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-600 shadow-2xl shadow-emerald-500/40 transition-all flex items-center justify-center gap-4 active:scale-95"
                          >
                            <Check size={24} strokeWidth={3} /> Salvar Alterações
                          </button>
                        </motion.div>
                      ) : (
                        <motion.button 
                          key="review-action"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          onClick={() => {
                            setEditingId(product.id);
                            setEditData({ category_id: product.category_id, imagem: product.imagem });
                          }}
                          className="w-full sm:w-auto px-14 py-6 text-primary bg-primary/5 hover:bg-primary hover:text-white rounded-[32px] transition-all flex items-center justify-center gap-5 font-black text-[11px] uppercase tracking-[0.3em] active:scale-95 shadow-sm hover:shadow-2xl hover:shadow-primary/40 group"
                        >
                          <Edit size={24} strokeWidth={3} className="group-hover:rotate-12 transition-transform" /> Revisar Item
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />
    </motion.div>
  );
}

