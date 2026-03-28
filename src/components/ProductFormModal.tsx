import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product, Brand, Category } from '../types';
import { X, Upload, Loader2, Image as ImageIcon, Link as LinkIcon, Check, Wand2, Package, ChevronDown, Trash2, AlertCircle, Plus } from 'lucide-react';
import { removeImageBackground } from '../services/aiService';

export default function ProductFormModal({ onClose, onSave, product, companyId }: { onClose: () => void, onSave: () => void, product?: Product, companyId: string | null }) {
  const [formData, setFormData] = useState<Partial<Product>>(product ? {
    ...product,
    preco_unitario: (product as any).base_price ?? product.preco_unitario,
    preco_box: (product as any).base_box_price ?? product.preco_box
  } : { 
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
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
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

  const handleRemoveBackground = async () => {
    if (!formData.imagem) return;
    
    setIsRemovingBackground(true);
    try {
      let base64Data = '';
      let mimeType = 'image/png';
      
      if (formData.imagem.startsWith('data:')) {
        const parts = formData.imagem.split(',');
        base64Data = parts[1];
        mimeType = parts[0].split(':')[1].split(';')[0];
      } else {
        // Fetch URL and convert to base64
        // Note: This might fail due to CORS for some external URLs
        const response = await fetch(formData.imagem);
        const blob = await response.blob();
        mimeType = blob.type;
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      
      const processedImage = await removeImageBackground(base64Data, mimeType);
      
      // Upload the processed image to Cloudinary to get a permanent URL
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (cloudName && uploadPreset) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', processedImage);
        formDataUpload.append('upload_preset', uploadPreset);

        try {
          const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formDataUpload,
          });
          const data = await response.json();
          if (data.secure_url) {
            setFormData(prev => ({ ...prev, imagem: data.secure_url }));
          } else {
            setFormData(prev => ({ ...prev, imagem: processedImage }));
          }
        } catch (uploadError) {
          console.error('Erro ao subir imagem processada para Cloudinary:', uploadError);
          setFormData(prev => ({ ...prev, imagem: processedImage }));
        }
      } else {
        setFormData(prev => ({ ...prev, imagem: processedImage }));
      }
    } catch (error) {
      console.error('Erro ao remover fundo:', error);
      alert('Erro ao processar imagem. Isso pode ocorrer devido a restrições de segurança (CORS) do link da imagem ou erro na IA.');
    } finally {
      setIsRemovingBackground(false);
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
    
    const dataToSave = { 
      ...formData, 
      sku: formData.sku?.trim().toUpperCase(),
      company_id: companyId,
      categoria_pendente: !formData.category_id,
      imagem_pendente: !formData.imagem
    };
    
    try {
      let error;
      if (product) {
        const { 
          id, 
          created_at, 
          base_price, 
          base_box_price, 
          brand_nome, 
          brand, 
          margin_percentage,
          categoria_nome,
          ...updateData 
        } = dataToSave as any;
        const { error: updateError } = await supabase.from('products').update(updateData).eq('id', product.id);
        error = updateError;
      } else {
        const { 
          base_price, 
          base_box_price, 
          brand_nome, 
          brand, 
          margin_percentage,
          categoria_nome,
          ...insertData 
        } = dataToSave as any;
        const { error: insertError } = await supabase.from('products').insert([insertData]);
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
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-white p-6 md:p-10 rounded-[14px] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl neumorphic-shadow border border-white/20">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-[10px] flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <Package size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
              <p className="text-slate-500 text-[12px] font-medium">Preencha os detalhes do item no catálogo.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600"><X size={24} strokeWidth={2.5} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Image Column */}
            <div className="space-y-6">
              <div className="relative group">
                <div 
                  className="aspect-square bg-slate-50 rounded-[10px] flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner cursor-zoom-in group-hover:border-primary/20 transition-colors"
                  onClick={() => formData.imagem && setZoomImage(formData.imagem)}
                >
                  {formData.imagem ? (
                    <img src={formData.imagem} alt="Produto" className="w-full h-full object-contain p-4 bg-white transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <ImageIcon className="text-slate-200" size={64} strokeWidth={1} />
                  )}
                  {(isUploading || isRemovingBackground) && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center flex-col gap-3">
                      <Loader2 className="animate-spin text-primary" size={32} strokeWidth={3} />
                      {isRemovingBackground && <span className="text-[8px] font-black text-primary uppercase tracking-[2px]">Processando...</span>}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-3 -right-3 flex flex-col gap-2">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-primary text-white p-4 rounded-[6px] shadow-2xl shadow-primary/40 hover:scale-110 transition-transform flex items-center justify-center border-4 border-white active:scale-95"
                    title="Upload de Imagem"
                  >
                    <Upload size={20} strokeWidth={3} />
                  </button>
                  {formData.imagem && (
                    <button 
                      type="button"
                      onClick={handleRemoveBackground}
                      disabled={isRemovingBackground}
                      className="bg-amber-500 text-white p-4 rounded-[6px] shadow-2xl shadow-amber-500/40 hover:scale-110 transition-transform flex items-center justify-center border-4 border-white active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                      title="Remover Fundo com IA"
                    >
                      <Wand2 size={20} strokeWidth={3} />
                    </button>
                  )}
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] ml-2">URL da Imagem</label>
                <div className="relative group">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} strokeWidth={2.5} />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-[6px] text-[12px] outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-inner"
                    placeholder="https://..."
                    value={formData.imagem || ''}
                    onChange={e => setFormData({...formData, imagem: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Form Column */}
            <div className="md:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] ml-2">Nome do Produto</label>
                  <input className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-[6px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-bold text-[12px] text-slate-700 placeholder:text-slate-300 shadow-inner" placeholder="Ex: Batom Matte" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] ml-2">SKU / Código</label>
                  <input className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-[6px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black uppercase tracking-widest text-[12px] text-slate-700 placeholder:text-slate-300 shadow-inner" placeholder="Ex: JB-001" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] ml-2">Marca</label>
                  <div className="relative group">
                    <select 
                      className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-[6px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none appearance-none transition-all font-black uppercase tracking-widest text-[11px] text-slate-600 cursor-pointer shadow-inner"
                      value={formData.brand_id || ''}
                      onChange={e => setFormData({...formData, brand_id: e.target.value, category_id: undefined})}
                      required
                    >
                      <option value="">Selecionar Marca</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] ml-2">Categoria</label>
                  <div className="relative group">
                    <select 
                      className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-[6px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none appearance-none transition-all font-black uppercase tracking-widest text-[11px] text-slate-600 cursor-pointer shadow-inner disabled:opacity-50"
                      value={formData.category_id || ''}
                      onChange={e => setFormData({...formData, category_id: e.target.value})}
                      disabled={!formData.brand_id}
                    >
                      <option value="">Selecionar Categoria</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] ml-2">Preço Unitário</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px]">R$</span>
                    <input type="number" step="0.01" className="w-full pl-10 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-[6px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-[12px] text-slate-900 shadow-inner" value={formData.preco_unitario || 0} onChange={e => setFormData({...formData, preco_unitario: parseFloat(e.target.value)})} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] ml-2">Preço Box</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px]">R$</span>
                    <input type="number" step="0.01" className="w-full pl-10 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-[6px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-[12px] text-slate-900 shadow-inner" value={formData.preco_box || 0} onChange={e => setFormData({...formData, preco_box: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] ml-2">Qtd por Box</label>
                  <input type="number" className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-[6px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-[12px] text-slate-900 shadow-inner text-center" value={formData.qtd_box || 0} onChange={e => setFormData({...formData, qtd_box: parseInt(e.target.value)})} />
                </div>
              </div>

              <div className="flex flex-wrap gap-8 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-[6px] border-2 flex items-center justify-center transition-all ${formData.multiplo_venda && formData.multiplo_venda > 1 ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'border-slate-200 group-hover:border-primary/50'}`}>
                    {formData.multiplo_venda && formData.multiplo_venda > 1 && <Check size={14} strokeWidth={4} className="text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={!!(formData.multiplo_venda && formData.multiplo_venda > 1)} 
                    onChange={e => setFormData({...formData, multiplo_venda: e.target.checked ? 2 : 1})} 
                  />
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Vender em Múltiplos</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-[6px] border-2 flex items-center justify-center transition-all ${formData.tipo_variacao === 'variedades' ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'border-slate-200 group-hover:border-primary/50'}`}>
                    {formData.tipo_variacao === 'variedades' && <Check size={14} strokeWidth={4} className="text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.tipo_variacao === 'variedades'} 
                    onChange={e => setFormData({...formData, tipo_variacao: e.target.checked ? 'variedades' : undefined})} 
                  />
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Variedades</span>
                </label>

                {formData.multiplo_venda && formData.multiplo_venda > 1 && (
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-[6px] border border-slate-100 shadow-inner">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Múltiplo de:</span>
                    <input 
                      type="number" 
                      className="w-16 bg-transparent outline-none text-center font-black text-primary" 
                      value={formData.multiplo_venda} 
                      onChange={e => setFormData({...formData, multiplo_venda: parseInt(e.target.value) || 2})} 
                      min="2"
                    />
                  </div>
                )}

                {formData.tipo_variacao === 'variedades' && (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lista de Variedades</p>
                      <button 
                        type="button" 
                        onClick={() => {
                          const current = formData.variacoes_flat || [];
                          setFormData({
                            ...formData, 
                            variacoes_flat: [...current, { sku: '', nome: '' }]
                          });
                        }}
                        className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
                      >
                        <Plus size={10} /> Adicionar
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {(formData.variacoes_flat || []).map((v, idx) => (
                        <div key={idx} className="flex gap-3 items-start">
                          <div className="flex-1 space-y-1">
                            <input 
                              placeholder="SKU" 
                              className="w-full p-2 bg-white border border-slate-200 rounded-md text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary/30"
                              value={v.sku}
                              onChange={e => {
                                const newList = [...(formData.variacoes_flat || [])];
                                newList[idx] = { ...newList[idx], sku: e.target.value };
                                setFormData({ ...formData, variacoes_flat: newList });
                              }}
                            />
                          </div>
                          <div className="flex-[2] space-y-1">
                            <input 
                              placeholder="Cor/Tamanho/Diferencial" 
                              className="w-full p-2 bg-white border border-slate-200 rounded-md text-[10px] font-bold outline-none focus:border-primary/30"
                              value={v.nome}
                              onChange={e => {
                                const newList = [...(formData.variacoes_flat || [])];
                                newList[idx] = { ...newList[idx], nome: e.target.value };
                                setFormData({ ...formData, variacoes_flat: newList });
                              }}
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              const newList = (formData.variacoes_flat || []).filter((_, i) => i !== idx);
                              setFormData({ ...formData, variacoes_flat: newList });
                            }}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {(formData.variacoes_flat || []).length === 0 && (
                        <p className="text-[9px] text-slate-400 text-center py-2 italic">Nenhuma variedade adicionada.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer group bg-slate-50/50 p-2.5 rounded-[6px] border border-slate-100 hover:border-primary/20 transition-all">
                  <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all shrink-0 ${formData.venda_somente_box ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'border-slate-200 group-hover:border-primary/50'}`}>
                    {formData.venda_somente_box && <Check size={12} strokeWidth={4} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={formData.venda_somente_box} onChange={e => setFormData({...formData, venda_somente_box: e.target.checked})} />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight leading-none">Somente Box</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group bg-slate-50/50 p-2.5 rounded-[6px] border border-slate-100 hover:border-primary/20 transition-all">
                  <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all shrink-0 ${formData.has_box_discount ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'border-slate-200 group-hover:border-primary/50'}`}>
                    {formData.has_box_discount && <Check size={12} strokeWidth={4} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={formData.has_box_discount} onChange={e => setFormData({...formData, has_box_discount: e.target.checked})} />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight leading-none">Desc. Box</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group bg-slate-50/50 p-2.5 rounded-[6px] border border-slate-100 hover:border-rose-500/20 transition-all">
                  <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all shrink-0 ${formData.is_last_units ? 'bg-rose-500 border-rose-500 shadow-lg shadow-rose-500/20' : 'border-slate-200 group-hover:border-rose-500/50'}`}>
                    {formData.is_last_units && <Check size={12} strokeWidth={4} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={formData.is_last_units} onChange={e => setFormData({...formData, is_last_units: e.target.checked})} />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight leading-none">Últimas</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group bg-slate-50/50 p-2.5 rounded-[6px] border border-slate-100 hover:border-slate-800/20 transition-all">
                  <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all shrink-0 ${formData.status_estoque === 'esgotado' ? 'bg-slate-800 border-slate-800 shadow-lg shadow-slate-800/20' : 'border-slate-200 group-hover:border-slate-800/50'}`}>
                    {formData.status_estoque === 'esgotado' && <Check size={12} strokeWidth={4} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={formData.status_estoque === 'esgotado'} onChange={e => setFormData({...formData, status_estoque: e.target.checked ? 'esgotado' : 'normal'})} />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight leading-none">Esgotado</span>
                </label>
              </div>
            </div>
          </div>

          {/* Price preview — igual ao catálogo */}
          {(formData.preco_unitario || 0) > 0 && (
            <div className="pt-4 border-t border-slate-50 space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pré-visualização no catálogo</p>
              <div className="flex items-end justify-between">
                <div className="space-y-0.5">
                  <p className="text-[7px] font-black text-slate-300 uppercase tracking-wider">Preço Unitário</p>
                  <p className="text-lg font-black text-slate-900 tracking-tighter">R$ {(formData.preco_unitario || 0).toFixed(2)}</p>
                </div>
              </div>
              {((formData.has_box_discount || formData.venda_somente_box) && (formData.preco_box || 0) > 0 && (formData.qtd_box || 0) > 0) && (
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-[8px] font-black text-emerald-600 text-center uppercase tracking-wider flex items-center justify-center gap-1">
                  <span>
                    {!formData.venda_somente_box
                      ? `A partir de ${formData.qtd_box} un: R$ ${(formData.preco_box || 0).toFixed(2)}`
                      : `Box com ${formData.qtd_box} un: R$ ${(formData.preco_box || 0).toFixed(2)}`}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-50">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-black text-[11px] uppercase tracking-[2px] hover:bg-slate-200 transition-all active:scale-95 shadow-sm">
              Cancelar
            </button>
            <button type="submit" className="flex-[2] bg-primary text-white py-3 rounded-lg font-black text-[11px] uppercase tracking-[2px] shadow-xl shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3" disabled={loading || isUploading}>
              {loading ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : (
                <>
                  <Check size={20} strokeWidth={3} />
                  {product ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </>
              )}
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
