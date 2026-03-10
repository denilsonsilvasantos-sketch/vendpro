import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Brand, Category } from '../types';
import { Edit, Trash2, Plus, ChevronDown, ChevronUp, Tag, Info, AlertCircle, Loader2 } from 'lucide-react';
import BrandFormModal from '../components/BrandFormModal';

export default function Marcas({ companyId }: { companyId: number | null }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>();
  const [expandedBrands, setExpandedBrands] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState<{ [brandId: number]: string }>({});

  async function fetchData() {
    if (!supabase || companyId === null) return;
    setLoading(true);
    try {
      const { data: bData, error: bError } = await supabase.from('brands').select('*').eq('company_id', companyId).order('name');
      const { data: cData, error: cError } = await supabase.from('categories').select('*').eq('company_id', companyId).order('nome');
      
      if (bError) throw bError;
      if (cError) throw cError;
      
      setBrands(bData || []);
      setCategories(cData || []);
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      alert("Erro ao carregar marcas: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const toggleExpand = (id: number) => {
    setExpandedBrands(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDeleteBrand = async (id: number) => {
    if (!supabase || !confirm('Tem certeza que deseja excluir esta marca? Todos os produtos vinculados serão afetados.')) return;
    await supabase.from('brands').delete().eq('id', id);
    fetchData();
  };

  const handleAddCategory = async (brandId: number) => {
    const nome = newCategoryName[brandId];
    if (!supabase || !nome || !companyId) return;

    try {
      const { error } = await supabase.from('categories').insert([{
        company_id: companyId,
        brand_id: brandId,
        nome: nome,
        ativo: true
      }]);

      if (error) {
        console.error('Erro ao adicionar categoria:', error);
        alert('Erro ao adicionar categoria: ' + error.message);
      } else {
        setNewCategoryName(prev => ({ ...prev, [brandId]: '' }));
        fetchData();
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao adicionar categoria.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!supabase || !confirm('Excluir esta categoria?')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchData();
  };

  if (loading && brands.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-slate-500 font-medium">Carregando marcas e categorias...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Marcas e Categorias</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie as marcas que você representa e suas categorias de produtos.</p>
        </div>
        <button 
          onClick={() => { setEditingBrand(undefined); setIsModalOpen(true); }} 
          className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95"
        >
          <Plus size={20} /> Nova Marca
        </button>
      </div>
      
      {brands.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <Tag className="text-slate-300" size={40} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Nenhuma marca cadastrada</h2>
            <p className="text-slate-500 max-w-xs mx-auto">Comece cadastrando as marcas que você trabalha para organizar seu catálogo.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-primary font-bold hover:underline"
          >
            Cadastrar minha primeira marca
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {brands.map(brand => (
            <div key={brand.id} className={`bg-white rounded-3xl shadow-sm border transition-all ${expandedBrands.includes(brand.id) ? 'border-primary ring-4 ring-primary/5' : 'border-slate-100'}`}>
              <div className="p-5 flex justify-between items-center">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleExpand(brand.id)}>
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Tag className="text-slate-300" size={20} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{brand.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1"><Tag size={12} /> {categories.filter(c => c.brand_id === brand.id).length} categorias</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>Margem: {brand.margin_percentage}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingBrand(brand); setIsModalOpen(true); }} 
                    className="p-3 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    title="Editar Marca"
                  >
                    <Edit size={20} />
                  </button>
                  <button 
                    onClick={() => handleDeleteBrand(brand.id)}
                    className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    title="Excluir Marca"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    onClick={() => toggleExpand(brand.id)}
                    className="p-3 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                  >
                    {expandedBrands.includes(brand.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>
              
              {expandedBrands.includes(brand.id) && (
                <div className="px-5 pb-6 space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pedido Mínimo</p>
                      <p className="text-lg font-bold text-slate-900">R$ {brand.minimum_order_value.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Margem de Venda</p>
                      <p className="text-lg font-bold text-slate-900">{brand.margin_percentage}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2"><Info size={16} className="text-primary" /> Políticas</h4>
                      <div className="space-y-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Pagamento</p>
                          <p className="text-slate-600 leading-relaxed">{brand.payment_policy || 'Não definida'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Frete e Envio</p>
                          <p className="text-slate-600 leading-relaxed">{brand.shipping_policy || 'Não definida'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Estoque</p>
                          <p className="text-slate-600 leading-relaxed">{brand.stock_policy || 'Não definida'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2"><Tag size={16} className="text-primary" /> Categorias</h4>
                      <div className="space-y-2">
                        {categories.filter(c => c.brand_id === brand.id).map(cat => (
                          <div key={cat.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl group hover:border-primary/20 transition-all">
                            <span className="text-sm font-medium text-slate-700">{cat.nome}</span>
                            <button 
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="text-slate-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        
                        <div className="pt-2">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Nova categoria..."
                              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                              value={newCategoryName[brand.id] || ''}
                              onChange={(e) => setNewCategoryName(prev => ({ ...prev, [brand.id]: e.target.value }))}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory(brand.id)}
                            />
                            <button 
                              onClick={() => handleAddCategory(brand.id)}
                              className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary-dark transition-all active:scale-95"
                            >
                              <Plus size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <BrandFormModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={() => { fetchData(); setIsModalOpen(false); }} 
          brand={editingBrand}
          companyId={companyId}
        />
      )}
    </div>
  );
}
