import React, { useState, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Brand } from '../types';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

export default function BrandFormModal({ onClose, onSave, brand, companyId }: { onClose: () => void, onSave: () => void, brand?: Brand, companyId: number | null }) {
  const [formData, setFormData] = useState<Partial<Brand>>(brand || { 
    nome: '', 
    margin_percentage: 0, 
    minimum_order_value: 0, 
    shipping_policy: '', 
    payment_policy: '',
    stock_policy: '',
    free_shipping_threshold: 0, 
    logo_url: ''
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
      alert('Erro ao fazer upload do logo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setLoading(true);
    
    const dataToSave = { ...formData, company_id: companyId };

    if (!supabase) return;

    if (brand) {
      await supabase.from('brands').update(dataToSave).eq('id', brand.id);
    } else {
      await supabase.from('brands').insert([dataToSave]);
    }
    setLoading(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">{brand ? 'Editar Marca' : 'Nova Marca'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="relative group">
              <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <ImageIcon className="text-slate-300" size={32} />
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
                className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
              >
                <Upload size={16} />
              </button>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logo da Marca</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome da Marca</label>
              <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Nike, Adidas..." value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
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

          <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading || isUploading}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (brand ? 'Atualizar Marca' : 'Cadastrar Marca')}
          </button>
        </form>
      </div>
    </div>
  );
}
