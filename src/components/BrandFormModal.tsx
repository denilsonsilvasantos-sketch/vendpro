import React, { useState, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Brand } from '../types';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setFormData(prev => ({ ...prev, logo_url: data.secure_url }));
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
      if (brand) {
        const { id, created_at, ...updateData } = dataToSave as any;
        const { error: updateError } = await supabase.from('brands').update(updateData).eq('id', brand.id);
        error = updateError;
      } else {
        // Get max order_index
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
          // Fallback if logo_url doesn't exist in DB
          const { logo_url, ...retryData } = dataToSave as any;
          if (brand) {
            const { id, created_at, ...updateData } = retryData;
            const { error: retryError } = await supabase.from('brands').update(updateData).eq('id', brand.id);
            error = retryError;
          } else {
            const { error: retryError } = await supabase.from('brands').insert([retryData]);
            error = retryError;
          }
          if (!error) {
            alert('Marca salva com sucesso! (Logo não salvo no banco de dados)');
          }
        } else {
          console.error('Erro ao salvar marca:', error);
          alert('Erro ao salvar marca: ' + error.message);
        }
      } else {
        alert('Marca salva com sucesso!');
      }

      if (!error) {
        onSave();
        onClose();
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao salvar marca.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">{brand ? 'Editar Marca' : 'Nova Marca'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div 
              className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 cursor-pointer overflow-hidden group relative"
              onClick={() => fileInputRef.current?.click()}
            >
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <ImageIcon className="text-slate-300" size={32} />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="animate-spin text-primary" size={20} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="text-white" size={20} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logo da Marca</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome da Marca</label>
              <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Nike, Adidas..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Margem de Venda (%)</label>
                <input type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="0.00" value={formData.margin_percentage} onChange={e => setFormData({...formData, margin_percentage: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Pedido Mínimo (R$)</label>
                <input type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="0.00" value={formData.minimum_order_value} onChange={e => setFormData({...formData, minimum_order_value: parseFloat(e.target.value)})} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Política de Frete</label>
              <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]" placeholder="Descreva as condições de frete..." value={formData.shipping_policy} onChange={e => setFormData({...formData, shipping_policy: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Política de Pagamento</label>
              <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]" placeholder="Ex: 30/60/90 dias, à vista 5% desconto..." value={formData.payment_policy} onChange={e => setFormData({...formData, payment_policy: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Política de Estoque</label>
              <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]" placeholder="Ex: Pronta entrega, sob encomenda..." value={formData.stock_policy} onChange={e => setFormData({...formData, stock_policy: e.target.value})} />
            </div>
          </div>

          <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (brand ? 'Atualizar Marca' : 'Cadastrar Marca')}
          </button>
        </form>
      </div>
    </div>
  );
}
