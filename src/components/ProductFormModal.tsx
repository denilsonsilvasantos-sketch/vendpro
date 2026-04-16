import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product, Brand, Category } from '../types';
import { X, Upload, Loader2, Image as ImageIcon, Link as LinkIcon, Check, Wand2, Package, ChevronDown, Trash2, AlertCircle, Plus } from 'lucide-react';
import { removeImageBackground } from '../services/aiService';

import { motion, AnimatePresence } from 'motion/react';

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
    is_promo: false,
    promo_price_unit: 0,
    promo_price_box: 0,
    promo_box_qty: 0,
    promo_sellers: [],
    promo_customers: [],
    multiplo_venda: 1,
    imagem: '',
    imagens: [],
    brand_id: undefined,
    category_id: undefined
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSellers, setAllSellers] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMaster = companyId === '273c5bbc-631b-44dc-b286-1b07de720222';

  useEffect(() => {
    async function fetchData() {
      if (!supabase || !companyId) return;
      const { data: bData } = await supabase.from('brands').select('*').eq('company_id', companyId).order('name');
      setBrands(bData || []);
      
      const { data: sData } = await supabase.from('sellers').select('id, nome').eq('company_id', companyId).eq('ativo', true).order('nome');
      setAllSellers(sData || []);

      const { data: cstData } = await supabase.from('customers').select('id, nome, nome_empresa').eq('company_id', companyId).eq('ativo', true).order('nome');
      setAllCustomers(cstData || []);

      if (formData.brand_id) {
        const { data: cData } = await supabase.from('categories').select('*').eq('brand_id', formData.brand_id).order('nome');
        setCategories(cData || []);
      }
    }
    fetchData();
  }, [companyId, formData.brand_id]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    
    if ('files' in event.target && event.target.files) {
      file = event.target.files[0];
    } else if ('dataTransfer' in event && event.dataTransfer.files) {
      file = event.dataTransfer.files[0];
    }

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
        setFormData(prev => ({ 
          ...prev, 
          imagem: data.secure_url, 
          imagens: [data.secure_url, ...(prev.imagens || [])] 
        }));
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageUpload(e);
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
            setFormData(prev => ({ 
              ...prev, 
              imagem: data.secure_url,
              imagens: prev.imagens ? [...prev.imagens, data.secure_url] : [data.secure_url]
            }));
          } else {
            setFormData(prev => ({ 
              ...prev, 
              imagem: processedImage,
              imagens: prev.imagens ? [...prev.imagens, processedImage] : [processedImage]
            }));
          }
        } catch (uploadError) {
          console.error('Erro ao subir imagem processada para Cloudinary:', uploadError);
          setFormData(prev => ({ 
            ...prev, 
            imagem: processedImage,
            imagens: prev.imagens ? [...prev.imagens, processedImage] : [processedImage]
          }));
        }
      } else {
        setFormData(prev => ({ 
          ...prev, 
          imagem: processedImage,
          imagens: prev.imagens ? [...prev.imagens, processedImage] : [processedImage]
        }));
      }
    } catch (error) {
      console.error('Erro ao remover fundo:', error);
      alert('Erro ao processar imagem. Isso pode ocorrer devido a restrições de segurança (CORS) do link da imagem ou erro na IA.');
    } finally {
      setIsRemovingBackground(false);
    }
  };

  useEffect(() => {
    if (formData.venda_somente_box && (formData.preco_box || 0) > 0 && (formData.qtd_box || 0) > 0) {
      const calculatedUnit = (formData.preco_box || 0) / (formData.qtd_box || 1);
      if (formData.preco_unitario !== calculatedUnit) {
        setFormData(prev => ({ ...prev, preco_unitario: calculatedUnit }));
      }
    }
    
    if (formData.venda_somente_box && formData.is_promo && (formData.promo_price_box || 0) > 0 && (formData.promo_box_qty || 0) > 0) {
      const calculatedPromoUnit = (formData.promo_price_box || 0) / (formData.promo_box_qty || 1);
      if (formData.promo_price_unit !== calculatedPromoUnit) {
        setFormData(prev => ({ ...prev, promo_price_unit: calculatedPromoUnit }));
      }
    }
  }, [formData.venda_somente_box, formData.preco_box, formData.qtd_box, formData.is_promo, formData.promo_price_box, formData.promo_box_qty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!companyId) {
      alert('Erro: Empresa não identificada. Por favor, recarregue a página.');
      return;
    }
    setLoading(true);
    
    const skuToSave = formData.sku?.trim().toUpperCase();
    const isMaster = companyId === '273c5bbc-631b-44dc-b286-1b07de720222';
    
    // Check for duplicate SKU within the same brand
    if (skuToSave && formData.brand_id) {
      const { data: existingSku } = await supabase
        .from('products')
        .select('id, nome')
        .eq('company_id', companyId)
        .eq('brand_id', formData.brand_id)
        .eq('sku', skuToSave)
        .maybeSingle();

      if (existingSku && (!product || existingSku.id !== product.id)) {
        alert(`Já existe um produto com este SKU (${skuToSave}) nesta marca: ${existingSku.nome}`);
        setLoading(false);
        return;
      }
    }

    const dataToSave = { 
      ...formData, 
      sku: skuToSave,
      company_id: companyId,
      categoria_pendente: !formData.category_id,
      imagem_pendente: !formData.imagem,
      // Se não for variedades, limpar campos relacionados
      tipo_variacao: formData.tipo_variacao || null,
      variacoes_flat: formData.tipo_variacao === 'variedades' ? formData.variacoes_flat : null,
      variacoes_disponiveis: formData.tipo_variacao === 'escolha_livre' ? formData.variacoes_disponiveis : null
    };
    
    try {
      let error;
      const finalDataToSave = dataToSave;

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
          sync_to_master,
          master_product_id,
          master_product,
          ...updateData 
        } = finalDataToSave as any;
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
          sync_to_master,
          master_product_id,
          master_product,
          ...insertData 
        } = finalDataToSave as any;
        const { error: insertError } = await supabase.from('products').insert([insertData]);
        error = insertError;
      }

      if (error) {
        console.error('Erro ao salvar produto:', error);
        if (error.message.includes('unique_sku_per_brand') || error.message.includes('duplicate key value violates unique constraint')) {
          alert('Erro de duplicidade: Já existe um produto com este SKU nesta marca. Se você está tentando usar o mesmo SKU em marcas diferentes, certifique-se de que a restrição de banco de dados correta foi aplicada.');
        } else {
          alert('Erro ao salvar produto: ' + error.message);
        }
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white p-6 md:p-10 rounded-[14px] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl neumorphic-shadow border border-white/20"
      >
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
                  className={`aspect-square rounded-[10px] flex items-center justify-center overflow-hidden border-2 transition-all cursor-zoom-in group-hover:border-primary/20 relative ${
                    isDragging ? 'border-primary bg-primary/5 scale-[0.98]' : 'bg-slate-50 border-slate-100 shadow-inner'
                  }`}
                  onClick={() => formData.imagem && setZoomImage(formData.imagem)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
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
              
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[2px]">Galeria de Imagens</label>
                  <span className="text-[8px] font-bold text-slate-300">{(formData.imagens || []).length} fotos</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {(formData.imagens || []).map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-100 group/img">
                      <img src={img} className="w-full h-full object-cover" alt={`Galeria ${idx}`} />
                      <button 
                        type="button"
                        onClick={() => {
                          const newImgs = (formData.imagens || []).filter((_, i) => i !== idx);
                          setFormData({ 
                            ...formData, 
                            imagens: newImgs,
                            imagem: formData.imagem === img ? (newImgs[0] || '') : formData.imagem
                          });
                        }}
                        className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                      {formData.imagem === img && (
                        <div className="absolute top-1 left-1 bg-primary text-white p-0.5 rounded-full shadow-sm">
                          <Check size={8} strokeWidth={4} />
                        </div>
                      )}
                      {formData.imagem !== img && (
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, imagem: img })}
                          className="absolute bottom-1 right-1 bg-white/90 text-slate-600 p-1 rounded shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity text-[8px] font-black uppercase"
                        >
                          Capa
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-primary/30 hover:text-primary transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

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
                    <input 
                      type="number" 
                      step="0.01" 
                      className={`w-full pl-10 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-[6px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-[12px] text-slate-900 shadow-inner ${formData.venda_somente_box ? 'opacity-70 cursor-not-allowed' : ''}`} 
                      value={formData.preco_unitario || 0} 
                      onChange={e => setFormData({...formData, preco_unitario: parseFloat(e.target.value)})} 
                      required 
                      readOnly={formData.venda_somente_box}
                    />
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
                    className="sr-only" 
                    checked={!!(formData.multiplo_venda && formData.multiplo_venda > 1)} 
                    onChange={e => setFormData({...formData, multiplo_venda: e.target.checked ? 2 : 1})} 
                  />
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Vender em Múltiplos</span>
                </label>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-6 h-6 rounded-[6px] border-2 flex items-center justify-center transition-all ${formData.tipo_variacao === 'variedades' ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'border-slate-200 group-hover:border-primary/50'}`}>
                      {formData.tipo_variacao === 'variedades' && <Check size={14} strokeWidth={4} className="text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={formData.tipo_variacao === 'variedades'} 
                      onChange={(e) => setFormData({...formData, tipo_variacao: e.target.checked ? 'variedades' : undefined, variacoes_disponiveis: [], variacoes_flat: e.target.checked ? (formData.variacoes_flat || []) : []})} 
                    />
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Variedades (Grade)</span>
                  </label>
                </div>

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
                          <div className="flex flex-col items-center gap-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Esgotado</label>
                            <button 
                              type="button"
                              onClick={() => {
                                const newList = [...(formData.variacoes_flat || [])];
                                newList[idx] = { ...newList[idx], esgotado: !v.esgotado };
                                setFormData({ ...formData, variacoes_flat: newList });
                              }}
                              className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${v.esgotado ? 'bg-rose-500 border-rose-500' : 'border-slate-200'}`}
                            >
                              {v.esgotado && <Check size={12} strokeWidth={4} className="text-white" />}
                            </button>
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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer group bg-slate-50/50 p-2.5 rounded-[6px] border border-slate-100 hover:border-primary/20 transition-all">
                  <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all shrink-0 ${formData.is_new ? 'bg-amber-500 border-amber-500 shadow-lg shadow-amber-500/20' : 'border-slate-200 group-hover:border-amber-500/50'}`}>
                    {formData.is_new && <Check size={12} strokeWidth={4} className="text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.is_new || false} 
                    onChange={e => {
                      const isChecked = e.target.checked;
                      const now = new Date();
                      const until = new Date(now.setDate(now.getDate() + 7)).toISOString();
                      setFormData({
                        ...formData, 
                        is_new: isChecked,
                        new_until: isChecked ? until : undefined,
                        is_back_in_stock: isChecked ? false : formData.is_back_in_stock,
                        back_in_stock_until: isChecked ? undefined : formData.back_in_stock_until
                      });
                    }} 
                  />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight leading-none">Novo</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group bg-slate-50/50 p-2.5 rounded-[6px] border border-slate-100 hover:border-primary/20 transition-all">
                  <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all shrink-0 ${formData.is_back_in_stock ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-slate-200 group-hover:border-emerald-500/50'}`}>
                    {formData.is_back_in_stock && <Check size={12} strokeWidth={4} className="text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.is_back_in_stock || false} 
                    onChange={e => {
                      const isChecked = e.target.checked;
                      const now = new Date();
                      const until = new Date(now.setDate(now.getDate() + 7)).toISOString();
                      setFormData({
                        ...formData, 
                        is_back_in_stock: isChecked,
                        back_in_stock_until: isChecked ? until : undefined,
                        is_new: isChecked ? false : formData.is_new,
                        new_until: isChecked ? undefined : formData.new_until
                      });
                    }} 
                  />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight leading-none">Reposição</span>
                </label>

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
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.is_last_units || false} 
                    onChange={e => {
                      const isChecked = e.target.checked;
                      setFormData({
                        ...formData, 
                        is_last_units: isChecked,
                        status_estoque: isChecked ? 'normal' : formData.status_estoque
                      });
                    }} 
                  />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight leading-none">Últimas</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group bg-slate-50/50 p-2.5 rounded-[6px] border border-slate-100 hover:border-slate-800/20 transition-all">
                  <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all shrink-0 ${formData.status_estoque === 'esgotado' ? 'bg-slate-800 border-slate-800 shadow-lg shadow-slate-800/20' : 'border-slate-200 group-hover:border-slate-800/50'}`}>
                    {formData.status_estoque === 'esgotado' && <Check size={12} strokeWidth={4} className="text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.status_estoque === 'esgotado'} 
                    onChange={e => {
                      const isChecked = e.target.checked;
                      setFormData({
                        ...formData, 
                        status_estoque: isChecked ? 'esgotado' : 'normal',
                        is_last_units: isChecked ? false : formData.is_last_units
                      });
                    }} 
                  />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight leading-none">Esgotado</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group bg-slate-50/50 p-2.5 rounded-[6px] border border-slate-100 hover:border-amber-500/20 transition-all">
                  <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all shrink-0 ${formData.is_promo ? 'bg-amber-500 border-amber-500 shadow-lg shadow-amber-500/20' : 'border-slate-200 group-hover:border-amber-500/50'}`}>
                    {formData.is_promo && <Check size={12} strokeWidth={4} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={formData.is_promo || false} onChange={e => setFormData({...formData, is_promo: e.target.checked})} />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight leading-none">Promoção</span>
                </label>
              </div>

              <AnimatePresence>
                {formData.is_promo && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-4 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                        <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Configurações da Promoção</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-amber-600 uppercase tracking-[2px] ml-2">Vendedores Específicos</label>
                          <div className="p-3 bg-white border border-amber-100 rounded-xl max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
                            <p className="text-[8px] text-slate-400 italic mb-2">Se nenhum for selecionado, a promoção vale para todos.</p>
                            {allSellers.map(s => (
                              <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${formData.promo_sellers?.includes(s.id) ? 'bg-amber-500 border-amber-500' : 'border-slate-200'}`}>
                                  {formData.promo_sellers?.includes(s.id) && <Check size={10} strokeWidth={4} className="text-white" />}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden" 
                                  checked={formData.promo_sellers?.includes(s.id) || false} 
                                  onChange={e => {
                                    const current = formData.promo_sellers || [];
                                    if (e.target.checked) {
                                      setFormData({ ...formData, promo_sellers: [...current, s.id] });
                                    } else {
                                      setFormData({ ...formData, promo_sellers: current.filter(id => id !== s.id) });
                                    }
                                  }}
                                />
                                <span className="text-[10px] font-bold text-slate-600">{s.nome}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-amber-600 uppercase tracking-[2px] ml-2">Clientes Específicos</label>
                          <div className="p-3 bg-white border border-amber-100 rounded-xl max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
                            <p className="text-[8px] text-slate-400 italic mb-2">Se nenhum for selecionado, a promoção vale para todos.</p>
                            {allCustomers.map(c => (
                              <label key={c.id} className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${formData.promo_customers?.includes(c.id) ? 'bg-amber-500 border-amber-500' : 'border-slate-200'}`}>
                                  {formData.promo_customers?.includes(c.id) && <Check size={10} strokeWidth={4} className="text-white" />}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden" 
                                  checked={formData.promo_customers?.includes(c.id) || false} 
                                  onChange={e => {
                                    const current = formData.promo_customers || [];
                                    if (e.target.checked) {
                                      setFormData({ ...formData, promo_customers: [...current, c.id] });
                                    } else {
                                      setFormData({ ...formData, promo_customers: current.filter(id => id !== c.id) });
                                    }
                                  }}
                                />
                                <span className="text-[10px] font-bold text-slate-600">{c.nome_empresa || c.nome}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest ml-1">Preço Promo Unit.</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-300 font-black text-[9px]">R$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              className={`w-full pl-8 pr-3 py-2.5 bg-white border border-amber-200 rounded-lg text-xs font-black text-amber-900 outline-none focus:ring-2 focus:ring-amber-500/20 ${formData.venda_somente_box ? 'opacity-70 cursor-not-allowed' : ''}`}
                              value={formData.promo_price_unit || 0}
                              onChange={e => setFormData({...formData, promo_price_unit: parseFloat(e.target.value)})}
                              readOnly={formData.venda_somente_box}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest ml-1">Preço Promo Box</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-300 font-black text-[9px]">R$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-full pl-8 pr-3 py-2.5 bg-white border border-amber-200 rounded-lg text-xs font-black text-amber-900 outline-none focus:ring-2 focus:ring-amber-500/20"
                              value={formData.promo_price_box || 0}
                              onChange={e => setFormData({...formData, promo_price_box: parseFloat(e.target.value)})}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest ml-1">Qtd Box Promo</label>
                          <input 
                            type="number" 
                            className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-lg text-xs font-black text-amber-900 outline-none focus:ring-2 focus:ring-amber-500/20 text-center"
                            value={formData.promo_box_qty || 0}
                            onChange={e => setFormData({...formData, promo_box_qty: parseInt(e.target.value)})}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest ml-1">Duração (Dias)</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-lg text-xs font-black text-amber-900 outline-none focus:ring-2 focus:ring-amber-500/20 text-center"
                              placeholder="0 = Indefinido"
                              onChange={e => {
                                const days = parseInt(e.target.value);
                                if (days > 0) {
                                  const date = new Date();
                                  date.setDate(date.getDate() + days);
                                  setFormData({...formData, promo_until: date.toISOString()});
                                } else {
                                  setFormData({...formData, promo_until: undefined});
                                }
                              }}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-amber-300 uppercase">Dias</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[8px] text-amber-600/60 italic font-medium">
                        * O preço promocional aparecerá em destaque no catálogo. Se a duração for definida, a promoção expirará automaticamente.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
      </motion.div>

      <AnimatePresence>
        {zoomImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md cursor-zoom-out"
            onClick={() => setZoomImage(null)}
          >
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={zoomImage} 
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
              alt="Zoom"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
