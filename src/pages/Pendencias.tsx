import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product, Category } from '../types';
import { AlertTriangle, Edit, Check, X, Image as ImageIcon, Tag, Upload, Loader2, Link as LinkIcon } from 'lucide-react';

export default function Pendencias({ companyId }: { companyId: string | null }) {
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
      .eq('company_id', companyId)
      .or('categoria_pendente.eq.true,imagem_pendente.eq.true');
    
    if (error) {
      console.error(error);
    } else {
      const sortedData = (data || []).sort((a, b) => {
        if (a.imagem_pendente && !b.imagem_pendente) return -1;
        if (!a.imagem_pendente && b.imagem_pendente) return 1;
        
        // Secondary sort: newest first
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
    
    const updates: any = { ...editData };
    if (editData.category_id) updates.categoria_pendente = false;
    if (editData.imagem) updates.imagem_pendente = false;

    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      setEditingId(null);
      fetchPendencies();
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert('Configurações do Cloudinary não encontradas no .env (VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET)');
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
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="p-6 flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div> Carregando pendências...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="text-yellow-500" /> Pendências de Revisão
        </h1>
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
          {products.length} itens aguardando
        </span>
      </div>
      
      {products.length === 0 ? (
        <div className="bg-green-50 p-12 rounded-2xl text-center border border-green-100 shadow-inner">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-500" size={40} />
          </div>
          <h2 className="text-xl font-bold text-green-800">Tudo revisado!</h2>
          <p className="text-green-600">Não há produtos pendentes de revisão no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {products.map(product => (
            <div key={product.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${editingId === product.id ? 'border-primary ring-4 ring-primary/5' : 'border-slate-200'} flex flex-col md:flex-row gap-6`}>
              <div className="relative group">
                <div className="w-32 h-32 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                  {(editData.imagem && editingId === product.id) || product.imagem ? (
                    <img src={editingId === product.id ? (editData.imagem || product.imagem) : product.imagem} alt={product.nome} className="w-full h-full object-contain p-2 bg-white" />
                  ) : (
                    <ImageIcon className="text-slate-300" size={32} />
                  )}
                  {isUploading && editingId === product.id && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Loader2 className="animate-spin text-primary" />
                    </div>
                  )}
                </div>
                {editingId === product.id && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                    title="Upload para Cloudinary"
                  >
                    <Upload size={16} />
                  </button>
                )}
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 leading-tight">
                      {product.nome}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">SKU: {product.sku}</span>
                      <span className="text-xs font-bold text-primary">R$ {product.preco_unitario.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {product.categoria_pendente && <span className="text-[10px] uppercase tracking-wider bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md font-bold border border-yellow-200">Categoria Pendente</span>}
                    {product.imagem_pendente && <span className="text-[10px] uppercase tracking-wider bg-red-100 text-red-800 px-2 py-1 rounded-md font-bold border border-red-200">Imagem Pendente</span>}
                  </div>
                </div>

                {editingId === product.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-left-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Definir Categoria</label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select 
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm appearance-none"
                          value={editData.category_id || ''}
                          onChange={e => setEditData({...editData, category_id: e.target.value})}
                        >
                          <option value="">Selecionar Categoria</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL da Imagem (ou use o botão de upload)</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                          placeholder="https://cloudinary.com/..."
                          value={editData.imagem || ''}
                          onChange={e => setEditData({...editData, imagem: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-slate-400" />
                      <span className="font-medium">{categories.find(c => c.id === product.category_id)?.nome || <span className="italic text-slate-400">Não definida</span>}</span>
                    </div>
                    {product.descricao && (
                      <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                        <span className="text-xs text-slate-400 line-clamp-1">{product.descricao}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                {editingId === product.id ? (
                  <>
                    <button 
                      onClick={() => handleSave(product.id)}
                      className="flex-1 md:flex-none p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                    >
                      <Check size={18} /> Salvar
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="flex-1 md:flex-none p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                    >
                      <X size={18} /> Cancelar
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      setEditingId(product.id);
                      setEditData({ category_id: product.category_id, imagem: product.imagem });
                    }}
                    className="w-full p-3 text-primary bg-primary/5 hover:bg-primary hover:text-white rounded-xl transition-all flex items-center justify-center gap-2 font-bold text-sm"
                  >
                    <Edit size={18} /> Revisar Item
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />
    </div>
  );
}
