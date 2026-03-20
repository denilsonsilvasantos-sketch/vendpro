import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Seller, Brand } from '../types';
import { X, Save, Loader2, Tag } from 'lucide-react';
import { motion } from 'motion/react';

export default function SellerFormModal({ onClose, onSave, seller, companyId }: { onClose: () => void, onSave: () => void, seller?: Seller, companyId: string | null }) {
  const [formData, setFormData] = useState<Partial<Seller>>(seller || { 
    nome: '', 
    codigo_vinculo: '', 
    whatsapp: '', 
    ativo: true 
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(true);

  useEffect(() => {
    async function fetchBrands() {
      if (!supabase || !companyId) return;
      setLoadingBrands(true);
      try {
        // Fetch all brands for the company
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('*')
          .eq('company_id', companyId)
          .order('name');
        
        if (brandsError) throw brandsError;
        setBrands(brandsData || []);

        // If editing, fetch selected brands for this seller
        if (seller?.id) {
          const { data: sellerBrandsData, error: sellerBrandsError } = await supabase
            .from('seller_brands')
            .select('brand_id')
            .eq('seller_id', seller.id);
          
          if (sellerBrandsError) throw sellerBrandsError;
          setSelectedBrands(sellerBrandsData?.map(sb => sb.brand_id) || []);
        }
      } catch (error: any) {
        console.error("Erro ao buscar marcas:", error);
      } finally {
        setLoadingBrands(false);
      }
    }

    fetchBrands();
  }, [companyId, seller?.id]);

  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId) 
        : [...prev, brandId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    if (!companyId) {
      alert("Erro: Empresa não identificada. Por favor, recarregue a página.");
      return;
    }

    setLoading(true);
    try {
      const dataToSave = { ...formData, company_id: companyId };
      let sellerId = seller?.id;
      
      if (sellerId) {
        const { error } = await supabase.from('sellers').update(dataToSave).eq('id', sellerId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('sellers').insert([dataToSave]).select();
        if (error) throw error;
        sellerId = data[0].id;
      }

      // Update seller_brands
      if (sellerId) {
        // Delete existing relations
        await supabase.from('seller_brands').delete().eq('seller_id', sellerId);
        
        // Insert new relations
        if (selectedBrands.length > 0) {
          const relations = selectedBrands.map(brandId => ({
            seller_id: sellerId,
            brand_id: brandId
          }));
          const { error: brandsError } = await supabase.from('seller_brands').insert(relations);
          if (brandsError) throw brandsError;
        }
      }
      
      alert(seller?.id ? "Vendedor atualizado com sucesso!" : "Vendedor cadastrado com sucesso!");
      onSave();
    } catch (error: any) {
      console.error("Erro ao salvar vendedor:", error);
      alert("Erro ao salvar vendedor: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">{seller ? 'Editar Vendedor' : 'Novo Vendedor'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="seller-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome do Vendedor</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: João Silva" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Código de Acesso</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-mono uppercase" placeholder="Ex: JOAO123" value={formData.codigo_vinculo} onChange={e => setFormData({...formData, codigo_vinculo: e.target.value.toUpperCase()})} required />
                <p className="text-[10px] text-slate-400 mt-1">Este código será usado pelo vendedor para acessar o sistema.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="(00) 00000-0000" value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input type="checkbox" id="ativo" className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary" checked={formData.ativo} onChange={e => setFormData({...formData, ativo: e.target.checked})} />
                <label htmlFor="ativo" className="font-medium text-slate-700 cursor-pointer select-none">Vendedor Ativo</label>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Tag size={14} /> Marcas Liberadas
                </label>
                
                {loadingBrands ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                    <Loader2 size={16} className="animate-spin" />
                    Carregando marcas...
                  </div>
                ) : brands.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-2">Nenhuma marca cadastrada.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {brands.map(brand => (
                      <label key={brand.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary" 
                          checked={selectedBrands.includes(brand.id)}
                          onChange={() => toggleBrand(brand.id)}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {brand.logo_url && (
                            <img src={brand.logo_url} alt={brand.name} className="w-6 h-6 rounded object-contain bg-white p-0.5 border border-slate-100" />
                          )}
                          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{brand.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
          <button type="submit" form="seller-form" disabled={loading} className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {loading ? 'Salvando...' : 'Salvar Vendedor'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
