import React, { useState, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Brand } from '../types';
import { X, Upload, Loader2, Image as ImageIcon, Wand2, Sparkles, Tag, DollarSign, Percent, Truck, CreditCard, Package } from 'lucide-react';
import { removeImageBackground } from '../services/aiService';
import { motion, AnimatePresence } from 'motion/react';

export default function BrandFormModal({ onClose, onSave, brand, companyId }: { onClose: () => void, onSave: () => void, brand?: Brand, companyId: string | null }) {
  const [formData, setFormData] = useState<Partial<Brand>>(brand || { 
    name: '', 
    margin_percentage: 0, 
    minimum_order_value: 0, 
    shipping_policy: '', 
    payment_policy: '',
    stock_policy: ''
  });
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setFormData(prev => ({ ...prev, logo_url: data.secure_url }));
      }
    } catch (error) {
      console.error('Erro no upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!formData.logo_url) return;
    
    setIsRemovingBackground(true);
    try {
      let base64Data = '';
      let mimeType = 'image/png';
      
      if (formData.logo_url.startsWith('data:')) {
        const parts = formData.logo_url.split(',');
        base64Data = parts[1];
        mimeType = parts[0].split(':')[1].split(';')[0];
      } else {
        const response = await fetch(formData.logo_url);
        const blob = await response.blob();
        mimeType = blob.type;
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      
      const processedImage = await removeImageBackground(base64Data, mimeType);
      
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (cloudName && uploadPreset) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', processedImage);
        formDataUpload.append('upload_preset', uploadPreset);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formDataUpload,
        });
        const data = await response.json();
        setFormData(prev => ({ ...prev, logo_url: data.secure_url || processedImage }));
      } else {
        setFormData(prev => ({ ...prev, logo_url: processedImage }));
      }
    } catch (error) {
      console.error('Erro ao remover fundo:', error);
    } finally {
      setIsRemovingBackground(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!companyId) return;
    setLoading(true);
    
    const dataToSave = { ...formData, company_id: companyId };
    
    try {
      let error;
      if (brand) {
        const { id, created_at, ...updateData } = dataToSave as any;
        const { error: updateError } = await supabase.from('brands').update(updateData).eq('id', brand.id);
        error = updateError;
      } else {
        const { data: existingBrands } = await supabase.from('brands').select('order_index').eq('company_id', companyId);
        const nextIndex = existingBrands && existingBrands.length > 0 
          ? Math.max(...existingBrands.map(b => b.order_index || 0)) + 1 
          : 0;
          
        const insertData: any = { ...dataToSave, order_index: nextIndex };
        const { error: insertError } = await supabase.from('brands').insert([insertData]);
        
        if (insertError && insertError.message?.includes('order_index does not exist')) {
          delete insertData.order_index;
          const retry = await supabase.from('brands').insert([insertData]);
          error = retry.error;
        } else {
          error = insertError;
        }
      }

      if (error) {
        if (error.message.includes('column "logo_url" of relation "brands" does not exist')) {
          const { logo_url, ...retryData } = dataToSave as any;
          if (brand) {
            const { id, created_at, ...updateData } = retryData;
            const { error: retryError } = await supabase.from('brands').update(updateData).eq('id', brand.id);
            error = retryError;
          } else {
            const { error: retryError } = await supabase.from('brands').insert([retryData]);
            error = retryError;
          }
        } else {
          console.error('Erro ao salvar marca:', error);
        }
      }

      if (!error) {
        onSave();
        onClose();
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[100] p-4 md:p-8 backdrop-blur-xl overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white p-8 md:p-12 rounded-[40px] w-full max-w-2xl shadow-2xl relative my-auto"
      >
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 p-3 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all"
        >
          <X size={24} strokeWidth={3} />
        </button>

        <div className="flex items-center gap-6 mb-12">
          <div className="w-16 h-16 bg-primary/10 rounded-[24px] flex items-center justify-center text-primary border border-primary/20 shadow-inner">
            <Sparkles size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{brand ? 'Editar Marca' : 'Nova Marca'}</h2>
            <p className="text-slate-500 font-medium">Configure as informações comerciais da marca</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="flex flex-col items-center gap-6">
            <div 
              className="w-32 h-32 bg-slate-50 rounded-[40px] flex items-center justify-center border-2 border-dashed border-slate-200 cursor-pointer overflow-hidden group relative shadow-inner hover:border-primary/30 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <ImageIcon className="text-slate-200" size={48} strokeWidth={1.5} />
              )}
              <AnimatePresence>
                {(isUploading || isRemovingBackground) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/90 flex items-center justify-center flex-col gap-3"
                  >
                    <Loader2 className="animate-spin text-primary" size={32} strokeWidth={3} />
                    {isRemovingBackground && <span className="text-[10px] font-black text-primary uppercase tracking-widest">IA Processando...</span>}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute inset-0 bg-primary/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="text-white" size={32} strokeWidth={3} />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Logo da Marca</p>
              {formData.logo_url && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemoveBackground(); }}
                  disabled={isRemovingBackground}
                  className="text-[10px] font-black text-amber-500 hover:text-amber-600 flex items-center gap-2 disabled:opacity-50 bg-amber-50 px-4 py-2 rounded-full border border-amber-100 transition-all hover:-translate-y-0.5"
                >
                  <Wand2 size={14} strokeWidth={2.5} />
                  Remover Fundo com IA
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3 md:col-span-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                <Tag size={14} /> Nome da Marca
              </label>
              <input 
                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-slate-700 placeholder:text-slate-300" 
                placeholder="Ex: Nike, Adidas..." 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                <Percent size={14} /> Margem de Venda (%)
              </label>
              <input 
                type="number" 
                step="0.01" 
                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-slate-700 placeholder:text-slate-300" 
                placeholder="0.00" 
                value={formData.margin_percentage} 
                onChange={e => setFormData({...formData, margin_percentage: parseFloat(e.target.value)})} 
              />
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                <DollarSign size={14} /> Pedido Mínimo (R$)
              </label>
              <input 
                type="number" 
                step="0.01" 
                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-slate-700 placeholder:text-slate-300" 
                placeholder="0.00" 
                value={formData.minimum_order_value} 
                onChange={e => setFormData({...formData, minimum_order_value: parseFloat(e.target.value)})} 
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                <Truck size={14} /> Política de Frete
              </label>
              <textarea 
                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-slate-700 placeholder:text-slate-300 min-h-[100px] resize-none" 
                placeholder="Descreva as condições de frete..." 
                value={formData.shipping_policy} 
                onChange={e => setFormData({...formData, shipping_policy: e.target.value})} 
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                <CreditCard size={14} /> Política de Pagamento
              </label>
              <textarea 
                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-slate-700 placeholder:text-slate-300 min-h-[100px] resize-none" 
                placeholder="Ex: 30/60/90 dias, à vista 5% desconto..." 
                value={formData.payment_policy} 
                onChange={e => setFormData({...formData, payment_policy: e.target.value})} 
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                <Package size={14} /> Política de Estoque
              </label>
              <textarea 
                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-slate-700 placeholder:text-slate-300 min-h-[100px] resize-none" 
                placeholder="Ex: Pronta entrega, sob encomenda..." 
                value={formData.stock_policy} 
                onChange={e => setFormData({...formData, stock_policy: e.target.value})} 
              />
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-primary text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-primary/30 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center gap-3" 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : (brand ? 'Atualizar Marca' : 'Cadastrar Marca')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

