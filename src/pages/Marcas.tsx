import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Brand, Category } from '../types';
import { Edit, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import BrandFormModal from '../components/BrandFormModal';

export default function Marcas({ companyId }: { companyId: number | null }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>();
  const [expandedBrands, setExpandedBrands] = useState<number[]>([]);

  async function fetchData() {
    if (!supabase || !companyId) return;
    const { data: bData } = await supabase.from('brands').select('*').eq('company_id', companyId);
    const { data: cData } = await supabase.from('categories').select('*').eq('company_id', companyId);
    setBrands(bData || []);
    setCategories(cData || []);
  }

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const toggleExpand = (id: number) => {
    setExpandedBrands(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Marcas e Categorias</h1>
        <button onClick={() => { setEditingBrand(undefined); setIsModalOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={20} /> Nova Marca
        </button>
      </div>
      
      <div className="space-y-4">
        {brands.map(brand => (
          <div key={brand.id} className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 flex justify-between items-center bg-slate-50 border-b">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleExpand(brand.id)}>
                {expandedBrands.includes(brand.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                <span className="font-bold">{brand.nome}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingBrand(brand); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-primary"><Edit size={18} /></button>
              </div>
            </div>
            {expandedBrands.includes(brand.id) && (
              <div className="p-4 bg-white">
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-slate-600">
                    <p><strong>Margem:</strong> {brand.margin_percentage}%</p>
                    <p><strong>Pedido Mínimo:</strong> R$ {brand.minimum_order_value}</p>
                    <p><strong>Frete Grátis:</strong> R$ {brand.free_shipping_threshold}</p>
                    <p><strong>Política:</strong> {brand.shipping_policy}</p>
                </div>
                <h4 className="font-bold mb-2">Categorias</h4>
                <div className="space-y-2">
                  {categories.filter(c => c.brand_id === brand.id).map(cat => (
                    <div key={cat.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span>{cat.nome}</span>
                      <button className="text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <button className="text-primary text-sm flex items-center gap-1"><Plus size={16} /> Adicionar Categoria</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <BrandFormModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={() => { fetchData(); setIsModalOpen(false); }} 
          brand={editingBrand}
        />
      )}
    </div>
  );
}
