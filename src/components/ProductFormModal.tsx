import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product, Brand, Category } from '../types';
import { X, Upload, Loader2, Image as ImageIcon, Link as LinkIcon, Check } from 'lucide-react';

export default function ProductFormModal({ onClose, onSave, product, companyId }: { onClose: () => void, onSave: () => void, product?: Product, companyId: string | null }) {
  const [formData, setFormData] = useState<Partial<Product>>(product || { 
    nome: '', 
    sku: '', 
    preco_unitario: 0, 
    preco_box: 0,
    qtd_box: 1,
    venda_somente_box: false,
    has_box_discount: false,
    is_last_units: false,
    multiplo_venda: 1,
    imagem: '',
    brand_id: undefined,
    category_id: undefined
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!supabase || !companyId) return;
      const { data: bData } = await supabase.from('brands').select('*').eq('company_id', companyId).order('name');
      setBrands(bData || []);
      
      if (formData.brand_id) {
        const { data: cData } = await supabase.from('categories').select('*').eq('brand_id', formData.brand_id).order('nome');
        setCategories(cData || []);
      }
    }
    fetchData();
  }, [companyId, formData.brand_id]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert('Configurações do Cloudinary não encontradas.');
      return;
    }

    setIsUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formDataUpload,
      });
      const data = await response.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, imagem: data.secure_url }));
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!companyId) {
      alert('Erro: Empresa não identificada. Por favor, recarregue a página.');
      return;
    }
    setLoading(true);
    
    const dataToSave = { ...formData, company_id: companyId };
    
    try {
      let error;
      if (product) {
        const { id, created_at, ...updateData } = dataToSave as any;
        const { error: updateError } = await supabase.from('products').update(updateData).eq('id', product.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('products').insert([dataToSave]);
        error = insertError;
      }

      if (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto: ' + error.message);
      } else {
        alert('Produto salvo com sucesso!');
        onSave();
        onClose();
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao salvar produto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
            <p className="text-slate-500 text-sm">Preencha os detalhes do item no catálogo.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Image Column */}
            <div className="space-y-4">
              <div className="relative group">
                <div 
                  className="aspect-square bg-slate-50 rounded-3xl flex items-center justify-center overflow-hidden border border-slate-200 shadow-inner cursor-zoom-in"
                  onClick={() => formData.imagem && setZoomImage(formData.imagem)}
                >
                  {formData.imagem ? (
                    <img src={formData.imagem} alt="Produto" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-slate-300" size={48} />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Loader2 className="animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-3 -right-3 bg-primary text-white p-3 rounded-2xl shadow-xl hover:scale-110 transition-transform flex items-center gap-2"
                >
                  <Upload size={18} />
                </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL da Imagem</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="https://..."
                    value={formData.imagem || ''}
                    onChange={e => setFormData({...formData, imagem: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Form Column */}
            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome do Produto</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Camiseta Básica" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">SKU / Código</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: PROD-001" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Marca</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    value={formData.brand_id || ''}
                    onChange={e => setFormData({...formData, brand_id: e.target.value, category_id: undefined})}
                    required
                  >
                    <option value="">Selecionar Marca</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    value={formData.category_id || ''}
                    onChange={e => setFormData({...formData, category_id: e.target.value})}
                    disabled={!formData.brand_id}
                  >
                    <option value="">Selecionar Categoria</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Preço Unitário (R$)</label>
                  <input type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-primary" value={formData.preco_unitario} onChange={e => setFormData({...formData, preco_unitario: parseFloat(e.target.value)})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Preço Box (R$)</label>
                  <input type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" value={formData.preco_box} onChange={e => setFormData({...formData, preco_box: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Qtd por Box</label>
                  <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" value={formData.qtd_box} onChange={e => setFormData({...formData, qtd_box: parseInt(e.target.value)})} />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.multiplo_venda && formData.multiplo_venda > 1 ? 'bg-primary border-primary' : 'border-slate-200 group-hover:border-primary/50'}`}>
                    {formData.multiplo_venda && formData.multiplo_venda > 1 && <Check size={14} className="text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={!!(formData.multiplo_venda && formData.multiplo_venda > 1)} 
                    onChange={e => setFormData({...formData, multiplo_venda: e.target.checked ? 2 : 1})} 
                  />
                  <span className="text-sm font-bold text-slate-700">Vender em Múltiplos</span>
                </label>

                {formData.multiplo_venda && formData.multiplo_venda > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500">Múltiplo de:</span>
                    <input 
                      type="number" 
                      className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-center font-bold" 
                      value={formData.multiplo_venda} 
                      onChange={e => setFormData({...formData, multiplo_venda: parseInt(e.target.value) || 2})} 
                      min="2"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.venda_somente_box ? 'bg-primary border-primary' : 'border-slate-200 group-hover:border-primary/50'}`}>
                    {formData.venda_somente_box && <Check size={14} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={formData.venda_somente_box} onChange={e => setFormData({...formData, venda_somente_box: e.target.checked})} />
                  <span className="text-sm font-bold text-slate-700">Somente no Box</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.has_box_discount ? 'bg-primary border-primary' : 'border-slate-200 group-hover:border-primary/50'}`}>
                    {formData.has_box_discount && <Check size={14} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={formData.has_box_discount} onChange={e => setFormData({...formData, has_box_discount: e.target.checked})} />
                  <span className="text-sm font-bold text-slate-700">Desconto no Box</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.is_last_units ? 'bg-rose-500 border-rose-500' : 'border-slate-200 group-hover:border-rose-500/50'}`}>
                    {formData.is_last_units && <Check size={14} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={formData.is_last_units} onChange={e => setFormData({...formData, is_last_units: e.target.checked})} />
                  <span className="text-sm font-bold text-slate-700">Últimas Unidades</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.status_estoque === 'esgotado' ? 'bg-slate-800 border-slate-800' : 'border-slate-200 group-hover:border-slate-800/50'}`}>
                    {formData.status_estoque === 'esgotado' && <Check size={14} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={formData.status_estoque === 'esgotado'} onChange={e => setFormData({...formData, status_estoque: e.target.checked ? 'esgotado' : 'normal'})} />
                  <span className="text-sm font-bold text-slate-700">Esgotado</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95">
              Cancelar
            </button>
            <button type="submit" className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50" disabled={loading || isUploading}>
              {loading ? <Loader2 className="animate-spin mx-auto" /> : (product ? 'Salvar Alterações' : 'Cadastrar Produto')}
            </button>
          </div>
        </form>
      </div>

      {zoomImage && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <img 
            src={zoomImage} 
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            alt="Zoom"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
