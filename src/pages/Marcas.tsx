import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Brand, Category } from '../types';
import { Edit, Trash2, Plus, ChevronDown, ChevronUp, Tag, Info, AlertCircle, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import BrandFormModal from '../components/BrandFormModal';

export default function Marcas({ companyId }: { companyId: string | null }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>();
  const [expandedBrands, setExpandedBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState<{ [brandId: string]: string }>({});

  async function fetchData() {
    if (!supabase || companyId === null) return;
    setLoading(true);
    try {
      const { data: bData, error: bError } = await supabase.from('brands').select('*').eq('company_id', companyId).order('name');
      const { data: cData, error: cError } = await supabase.from('categories').select('*').eq('company_id', companyId).order('nome');
      
      if (bError) throw bError;
      if (cError) throw cError;
      
      setBrands((bData || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
      setCategories((cData || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
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

  const toggleExpand = (id: string) => {
    setExpandedBrands(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDeleteBrand = async (id: string) => {
    if (!supabase || !confirm('Tem certeza que deseja excluir esta marca? Todos os produtos vinculados serão afetados.')) return;
    await supabase.from('brands').delete().eq('id', id);
    fetchData();
  };

  const handleAddCategory = async (brandId: string) => {
    const nome = newCategoryName[brandId];
    if (!supabase || !nome || !companyId) return;

    try {
      const brandCategories = categories.filter(c => c.brand_id === brandId);
      const nextIndex = brandCategories.length > 0 ? Math.max(...brandCategories.map(c => c.order_index || 0)) + 1 : 0;

      let insertData: any = {
        company_id: companyId,
        brand_id: brandId,
        nome: nome,
        ativo: true,
        order_index: nextIndex
      };

      let { error } = await supabase.from('categories').insert([insertData]);

      if (error && error.message?.includes('order_index does not exist')) {
        delete insertData.order_index;
        const retry = await supabase.from('categories').insert([insertData]);
        error = retry.error;
      }

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

  const handleDeleteCategory = async (id: string) => {
    if (!supabase || !confirm('Excluir esta categoria?')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchData();
  };

  const moveBrand = async (index: number, direction: 'up' | 'down') => {
    if (!supabase) return;
    const newBrands = [...brands];
    if (direction === 'up' && index > 0) {
      const temp = newBrands[index];
      newBrands[index] = newBrands[index - 1];
      newBrands[index - 1] = temp;
    } else if (direction === 'down' && index < newBrands.length - 1) {
      const temp = newBrands[index];
      newBrands[index] = newBrands[index + 1];
      newBrands[index + 1] = temp;
    } else {
      return;
    }

    setBrands(newBrands);
    
    // Update order_index in DB
    const updates = newBrands.map((b, i) => ({ id: b.id, order_index: i }));
    for (const update of updates) {
      const { error } = await supabase.from('brands').update({ order_index: update.order_index }).eq('id', update.id);
      if (error) console.warn('Could not update order_index:', error.message);
    }
  };

  const moveCategory = async (brandId: string, index: number, direction: 'up' | 'down') => {
    if (!supabase) return;
    const brandCategories = categories.filter(c => c.brand_id === brandId);
    if (direction === 'up' && index > 0) {
      const temp = brandCategories[index];
      brandCategories[index] = brandCategories[index - 1];
      brandCategories[index - 1] = temp;
    } else if (direction === 'down' && index < brandCategories.length - 1) {
      const temp = brandCategories[index];
      brandCategories[index] = brandCategories[index + 1];
      brandCategories[index + 1] = temp;
    } else {
      return;
    }

    // Update local state immediately for smooth UI
    const newCategories = categories.map(c => {
      const updatedCat = brandCategories.find(bc => bc.id === c.id);
      if (updatedCat) {
        return { ...c, order_index: brandCategories.indexOf(updatedCat) };
      }
      return c;
    });
    setCategories(newCategories.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));

    // Update order_index in DB
    const updates = brandCategories.map((c, i) => ({ id: c.id, order_index: i }));
    for (const update of updates) {
      const { error } = await supabase.from('categories').update({ order_index: update.order_index }).eq('id', update.id);
      if (error) console.warn('Could not update order_index:', error.message);
    }
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
          {brands.map((brand, brandIndex) => (
            <div key={brand.id} className={`bg-white rounded-3xl shadow-sm border transition-all ${expandedBrands.includes(brand.id) ? 'border-primary ring-4 ring-primary/5' : 'border-slate-100'}`}>
              <div className="p-5 flex justify-between items-center">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleExpand(brand.id)}>
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                    <Tag className="text-slate-300" size={20} />
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
                  <div className="flex flex-col mr-2">
                    <button onClick={() => moveBrand(brandIndex, 'up')} disabled={brandIndex === 0} className="text-slate-300 hover:text-primary disabled:opacity-30"><ArrowUp size={16} /></button>
                    <button onClick={() => moveBrand(brandIndex, 'down')} disabled={brandIndex === brands.length - 1} className="text-slate-300 hover:text-primary disabled:opacity-30"><ArrowDown size={16} /></button>
                  </div>
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
                        {categories.filter(c => c.brand_id === brand.id).map((cat, catIndex, arr) => (
                          <div key={cat.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl group hover:border-primary/20 transition-all">
                            <span className="text-sm font-medium text-slate-700">{cat.nome}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => moveCategory(brand.id, catIndex, 'up')} disabled={catIndex === 0} className="text-slate-300 hover:text-primary disabled:opacity-30 p-1"><ArrowUp size={14} /></button>
                              <button onClick={() => moveCategory(brand.id, catIndex, 'down')} disabled={catIndex === arr.length - 1} className="text-slate-300 hover:text-primary disabled:opacity-30 p-1"><ArrowDown size={14} /></button>
                              <button 
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="text-slate-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-all ml-2"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
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
