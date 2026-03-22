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
      className="p-4 md:p-6 lg:p-8 max-w-6xl xl:max-w-7xl mx-auto space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100 shadow-inner">
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Pendências de Revisão</h1>
              <p className="text-sm md:text-base text-slate-500 font-medium">Produtos que precisam de atenção antes de irem ao catálogo</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 text-amber-600 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-amber-100 shadow-lg shadow-amber-500/5 flex items-center gap-3 self-start md:self-center">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          {products.length} itens aguardando
        </div>
      </div>
      
      <AnimatePresence mode="popLayout">
        {products.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-20 rounded-[40px] border-2 border-dashed border-slate-100 text-center space-y-8 shadow-inner neumorphic-shadow"
          >
            <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
              <Check className="text-emerald-500" size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Tudo revisado!</h2>
              <p className="text-slate-400 max-w-sm mx-auto font-medium text-sm">Não há produtos pendentes de revisão no momento. Seu catálogo está pronto para brilhar.</p>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((product, index) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                key={product.id} 
                className={`bg-white h-[70px] rounded-[10px] shadow-sm transition-all duration-300 border flex items-center px-3 gap-4 ${editingId === product.id ? 'border-primary/40 ring-4 ring-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="relative shrink-0">
                  <div className="w-14 h-14 bg-slate-50 rounded-[8px] flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">
                    {(editData.imagem && editingId === product.id) || product.imagem ? (
                      <img 
                        src={editingId === product.id ? (editData.imagem || product.imagem) : product.imagem} 
                        alt={product.nome} 
                        className="w-full h-full object-contain p-1 bg-white" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ImageIcon className="text-slate-200" size={24} strokeWidth={1} />
                    )}
                  </div>
                  {editingId === product.id && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-[6px] shadow-lg hover:scale-110 transition-transform border-2 border-white"
                    >
                      <Upload size={10} strokeWidth={3} />
                    </button>
                  )}
                </div>
                
                <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
                  <div className="flex flex-col justify-center min-w-0">
                    <h3 className="font-black text-[11px] text-slate-900 leading-tight tracking-tight uppercase truncate">
                      {product.nome}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SKU: {product.sku}</span>
                      <span className="text-[11px] font-black text-primary">R$ {(product.preco_unitario || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:flex gap-1">
                      {product.categoria_pendente && (
                        <span className="text-[8px] uppercase tracking-widest bg-amber-50 text-amber-600 px-[6px] py-[2px] rounded-[20px] font-black border border-amber-100 flex items-center gap-1">
                          <Tag size={8} strokeWidth={3} /> CAT
                        </span>
                      )}
                      {product.imagem_pendente && (
                        <span className="text-[8px] uppercase tracking-widest bg-rose-50 text-rose-600 px-[6px] py-[2px] rounded-[20px] font-black border border-rose-100 flex items-center gap-1">
                          <ImageIcon size={8} strokeWidth={3} /> IMG
                        </span>
                      )}
                    </div>

                    {editingId === product.id ? (
                      <div className="flex items-center gap-2">
                        <select 
                          className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-[6px] outline-none font-black uppercase tracking-widest text-[8px] text-slate-600 cursor-pointer"
                          value={editData.category_id || ''}
                          onChange={e => setEditData({...editData, category_id: e.target.value})}
                        >
                          <option value="">Categoria</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nome}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => handleSave(product.id)}
                          className="px-[10px] py-[5px] bg-emerald-500 text-white rounded-[6px] shadow-lg hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center"
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="px-[10px] py-[5px] bg-slate-100 text-slate-600 rounded-[6px] hover:bg-slate-200 transition-all flex items-center justify-center"
                        >
                          <X size={14} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingId(product.id);
                          setEditData({ category_id: product.category_id, imagem: product.imagem });
                        }}
                        className="px-[10px] py-[5px] text-primary bg-primary/5 hover:bg-primary hover:text-white rounded-[6px] transition-all flex items-center gap-2 font-black text-[9px] uppercase tracking-widest active:scale-95"
                      >
                        <Edit size={10} strokeWidth={3} /> Revisar
                      </button>
                    )}
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

