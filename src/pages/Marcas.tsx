import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Brand, Category } from '../types';
import { Edit, Trash2, Plus, ChevronDown, ChevronUp, Tag, Info, AlertCircle, Loader2, ArrowUp, ArrowDown, AlertTriangle, X, LayoutGrid, Settings2, Sparkles } from 'lucide-react';
import BrandFormModal from '../components/BrandFormModal';
import { motion, AnimatePresence } from 'motion/react';

export default function Marcas({ companyId }: { companyId: string | null }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>();
  const [expandedBrands, setExpandedBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState<{ [brandId: string]: string }>({});
  const [deleteModal, setDeleteModal] = useState<{ type: 'brand' | 'category', id: string, name: string, brandId?: string } | null>(null);
  const [deleteAction, setDeleteAction] = useState<'delete' | 'transfer'>('delete');
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteBrand = (id: string, name: string) => {
    setDeleteModal({ type: 'brand', id, name });
    setDeleteAction('delete');
    setTransferTargetId('');
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
      } else {
        setNewCategoryName(prev => ({ ...prev, [brandId]: '' }));
        fetchData();
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
    }
  };

  const handleDeleteCategory = (id: string, name: string, brandId: string) => {
    setDeleteModal({ type: 'category', id, name, brandId });
    setDeleteAction('delete');
    setTransferTargetId('');
  };

  const confirmDelete = async () => {
    if (!supabase || !deleteModal) return;
    setIsDeleting(true);
    try {
      const { type, id } = deleteModal;
      const idField = type === 'brand' ? 'brand_id' : 'category_id';
      const table = type === 'brand' ? 'brands' : 'categories';

      if (deleteAction === 'transfer' && transferTargetId) {
        const updateData: any = { [idField]: transferTargetId };
        if (type === 'brand') {
          updateData.category_id = null;
        }
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq(idField, id);
        
        if (updateError) throw updateError;
      } else {
        const { error: deleteProductsError } = await supabase
          .from('products')
          .delete()
          .eq(idField, id);
        
        if (deleteProductsError) throw deleteProductsError;
      }

      if (type === 'brand') {
        const { error: deleteCatsError } = await supabase
          .from('categories')
          .delete()
          .eq('brand_id', id);
        if (deleteCatsError) throw deleteCatsError;
      }

      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;

      setDeleteModal(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
    } finally {
      setIsDeleting(false);
    }
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

    const newCategories = categories.map(c => {
      const updatedCat = brandCategories.find(bc => bc.id === c.id);
      if (updatedCat) {
        return { ...c, order_index: brandCategories.indexOf(updatedCat) };
      }
      return c;
    });
    setCategories(newCategories.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));

    const updates = brandCategories.map((c, i) => ({ id: c.id, order_index: i }));
    for (const update of updates) {
      const { error } = await supabase.from('categories').update({ order_index: update.order_index }).eq('id', update.id);
      if (error) console.warn('Could not update order_index:', error.message);
    }
  };

  if (loading && brands.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-6 animate-pulse">
        <div className="w-16 h-16 bg-primary/10 rounded-[24px] flex items-center justify-center text-primary border border-primary/20">
          <Loader2 className="animate-spin" size={32} />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Sincronizando marcas...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <Sparkles size={24} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Marcas e Categorias</h1>
              <p className="text-slate-500 font-medium text-sm">Estruture seu catálogo por marcas e segmentos</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => { setEditingBrand(undefined); setIsModalOpen(true); }} 
          className="bg-primary text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 shadow-xl shadow-primary/30 hover:-translate-y-1 active:translate-y-0 transition-all w-full md:w-auto justify-center group"
        >
          <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" /> Nova Marca
        </button>
      </div>
      
      <AnimatePresence mode="popLayout">
        {brands.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-20 rounded-[40px] border-2 border-dashed border-slate-100 text-center space-y-6 shadow-inner"
          >
            <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto shadow-inner border border-slate-100">
              <Tag className="text-slate-200" size={48} strokeWidth={1} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Nenhuma marca cadastrada</h2>
              <p className="text-slate-400 max-w-xs mx-auto font-medium text-sm">Comece cadastrando as marcas que você representa para organizar seu catálogo.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-primary font-black uppercase tracking-[0.3em] text-[10px] hover:underline underline-offset-8 transition-all"
            >
              Cadastrar minha primeira marca
            </button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {brands.map((brand, brandIndex) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={brand.id} 
                className={`bg-white rounded-[48px] shadow-2xl transition-all duration-500 overflow-hidden border ${expandedBrands.includes(brand.id) ? 'border-primary/40 shadow-primary/10 ring-[12px] ring-primary/5' : 'border-slate-100 shadow-slate-200/40'}`}
              >
                <div className="p-10 flex flex-col md:flex-row justify-between items-center gap-8 group">
                  <div className="flex items-center gap-8 cursor-pointer flex-1 w-full" onClick={() => toggleExpand(brand.id)}>
                    <div className="w-24 h-24 bg-slate-50 rounded-[28px] flex items-center justify-center overflow-hidden border border-slate-100 shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500">
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                      ) : (
                        <Tag className="text-slate-200" size={40} strokeWidth={1.5} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-3xl tracking-tight group-hover:text-primary transition-colors uppercase leading-none">{brand.name}</h3>
                      <div className="flex flex-wrap items-center gap-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-4">
                        <span className="flex items-center gap-2.5 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shadow-sm"><LayoutGrid size={16} /> {categories.filter(c => c.brand_id === brand.id).length} categorias</span>
                        <span className="w-2 h-2 bg-slate-200 rounded-full" />
                        <span className="text-primary bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 shadow-sm">Margem: {brand.margin_percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                    <div className="flex flex-col mr-6 bg-slate-50 p-1.5 rounded-[20px] border border-slate-100 shadow-inner">
                      <button onClick={(e) => { e.stopPropagation(); moveBrand(brandIndex, 'up'); }} disabled={brandIndex === 0} className="text-slate-300 hover:text-primary disabled:opacity-20 p-2.5 transition-all hover:bg-white rounded-xl"><ArrowUp size={22} strokeWidth={3} /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveBrand(brandIndex, 'down'); }} disabled={brandIndex === brands.length - 1} className="text-slate-300 hover:text-primary disabled:opacity-20 p-2.5 transition-all hover:bg-white rounded-xl"><ArrowDown size={22} strokeWidth={3} /></button>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingBrand(brand); setIsModalOpen(true); }} 
                      className="w-16 h-16 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 rounded-[24px] transition-all border border-transparent hover:border-primary/10 shadow-sm hover:shadow-xl"
                      title="Editar Marca"
                    >
                      <Edit size={28} strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand.id, brand.name); }}
                      className="w-16 h-16 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-[24px] transition-all border border-transparent hover:border-rose-100 shadow-sm hover:shadow-xl"
                      title="Excluir Marca"
                    >
                      <Trash2 size={28} strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleExpand(brand.id); }}
                      className={`w-16 h-16 flex items-center justify-center rounded-[24px] transition-all duration-500 ${expandedBrands.includes(brand.id) ? 'bg-primary text-white shadow-2xl shadow-primary/40 scale-110' : 'bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-100 shadow-sm'}`}
                    >
                      {expandedBrands.includes(brand.id) ? <ChevronUp size={28} strokeWidth={3} /> : <ChevronDown size={28} strokeWidth={3} />}
                    </button>
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedBrands.includes(brand.id) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-10 pb-12 space-y-12">
                        <div className="h-px bg-slate-100 w-full" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="p-10 bg-slate-50/50 rounded-[40px] border border-slate-100 space-y-4 group/stat hover:bg-white hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 shadow-inner">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-primary transition-colors">Pedido Mínimo</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">R$ {brand.minimum_order_value.toFixed(2)}</p>
                          </div>
                          <div className="p-10 bg-slate-50/50 rounded-[40px] border border-slate-100 space-y-4 group/stat hover:bg-white hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 shadow-inner">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-primary transition-colors">Margem de Venda</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">{brand.margin_percentage}%</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                          <div className="space-y-10">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-primary/10 rounded-[20px] flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                                <Settings2 size={28} strokeWidth={2.5} />
                              </div>
                              <h4 className="font-black text-slate-900 uppercase tracking-[0.3em] text-[11px]">Políticas Comerciais</h4>
                            </div>
                            <div className="space-y-8">
                              {[
                                { label: 'Pagamento', value: brand.payment_policy },
                                { label: 'Frete e Envio', value: brand.shipping_policy },
                                { label: 'Estoque', value: brand.stock_policy }
                              ].map((policy) => (
                                <div key={policy.label} className="space-y-4 p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500">
                                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">{policy.label}</p>
                                  <p className="text-slate-600 font-bold text-base leading-relaxed">{policy.value || 'Não definida'}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-10">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-primary/10 rounded-[20px] flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                                <LayoutGrid size={28} strokeWidth={2.5} />
                              </div>
                              <h4 className="font-black text-slate-900 uppercase tracking-[0.3em] text-[11px]">Categorias de Produtos</h4>
                            </div>
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 gap-4">
                                {categories.filter(c => c.brand_id === brand.id).map((cat, catIndex, arr) => (
                                  <motion.div 
                                    layout
                                    key={cat.id} 
                                    className="flex justify-between items-center p-6 bg-white border border-slate-100 rounded-[32px] group/cat hover:border-primary/40 transition-all shadow-sm hover:shadow-xl duration-500"
                                  >
                                    <span className="text-base font-black text-slate-700 group-hover/cat:text-primary transition-colors uppercase tracking-tight">{cat.nome}</span>
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center bg-slate-50 p-1.5 rounded-[18px] border border-slate-100 shadow-inner">
                                        <button onClick={() => moveCategory(brand.id, catIndex, 'up')} disabled={catIndex === 0} className="text-slate-300 hover:text-primary disabled:opacity-20 p-2.5 transition-all hover:bg-white rounded-xl"><ArrowUp size={18} strokeWidth={3} /></button>
                                        <button onClick={() => moveCategory(brand.id, catIndex, 'down')} disabled={catIndex === arr.length - 1} className="text-slate-300 hover:text-primary disabled:opacity-20 p-2.5 transition-all hover:bg-white rounded-xl"><ArrowDown size={18} strokeWidth={3} /></button>
                                      </div>
                                      <button 
                                        onClick={() => handleDeleteCategory(cat.id, cat.nome, brand.id)}
                                        className="w-12 h-12 flex items-center justify-center text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-[18px] transition-all opacity-0 group-hover/cat:opacity-100 shadow-sm hover:shadow-xl"
                                      >
                                        <Trash2 size={22} strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                              
                              <div className="pt-8">
                                <div className="flex gap-5 p-3 bg-slate-50 rounded-[40px] border border-slate-100 shadow-inner">
                                  <input 
                                    type="text" 
                                    placeholder="Nova categoria..."
                                    className="flex-1 pl-8 pr-4 py-5 bg-transparent text-base font-bold outline-none placeholder:text-slate-300"
                                    value={newCategoryName[brand.id] || ''}
                                    onChange={(e) => setNewCategoryName(prev => ({ ...prev, [brand.id]: e.target.value }))}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory(brand.id)}
                                  />
                                  <button 
                                    onClick={() => handleAddCategory(brand.id)}
                                    className="bg-primary text-white w-16 h-16 rounded-[32px] hover:bg-primary-dark transition-all active:scale-95 shadow-2xl shadow-primary/40 flex items-center justify-center shrink-0 group"
                                  >
                                    <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-[100] p-6 md:p-12 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              className="bg-white p-12 rounded-[64px] w-full max-w-2xl shadow-2xl space-y-12 relative overflow-hidden"
            >
              <button 
                onClick={() => setDeleteModal(null)}
                className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors"
              >
                <X size={32} strokeWidth={3} />
              </button>

              <div className="flex flex-col items-center text-center space-y-8">
                <div className="w-32 h-32 bg-rose-50 text-rose-500 rounded-[48px] flex items-center justify-center shadow-inner border border-rose-100">
                  <AlertTriangle size={64} strokeWidth={1.5} />
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Excluir {deleteModal.type === 'brand' ? 'Marca' : 'Categoria'}</h2>
                  <p className="text-slate-400 font-bold text-lg max-w-md mx-auto leading-relaxed">
                    Você está removendo <span className="text-slate-900 font-black uppercase tracking-tight">{deleteModal.name}</span>. Como deseja tratar os produtos vinculados?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {[
                  { id: 'delete', label: 'Excluir permanentemente', sub: 'Todos os produtos vinculados serão apagados', icon: Trash2, color: 'rose' },
                  { id: 'transfer', label: 'Transferir produtos', sub: `Mover para outra ${deleteModal.type === 'brand' ? 'marca' : 'categoria'}`, icon: ArrowUp, color: 'primary' }
                ].map((action) => (
                  <label 
                    key={action.id}
                    className={`flex items-center gap-8 p-8 rounded-[40px] border-4 cursor-pointer transition-all duration-500 ${deleteAction === action.id ? `border-${action.color}-500 bg-${action.color}-50/50 shadow-2xl shadow-${action.color}-500/20 scale-[1.02]` : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-lg ${deleteAction === action.id ? `bg-${action.color}-500 text-white` : 'bg-slate-100 text-slate-400'}`}>
                      <action.icon size={32} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-lg font-black uppercase tracking-tight ${deleteAction === action.id ? `text-${action.color}-600` : 'text-slate-900'}`}>{action.label}</p>
                      <p className="text-sm text-slate-400 font-bold mt-1">{action.sub}</p>
                    </div>
                    <input 
                      type="radio" 
                      name="deleteAction" 
                      value={action.id} 
                      checked={deleteAction === action.id} 
                      onChange={() => setDeleteAction(action.id as any)}
                      className="hidden"
                    />
                  </label>
                ))}
              </div>

              {deleteAction === 'transfer' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-4"
                >
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Destino da transferência</label>
                  <div className="relative group">
                    <select 
                      className="w-full pl-8 pr-16 py-6 bg-slate-50 border border-slate-100 rounded-[32px] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/40 transition-all appearance-none font-black uppercase tracking-[0.2em] text-[11px] text-slate-600 cursor-pointer shadow-inner"
                      value={transferTargetId}
                      onChange={(e) => setTransferTargetId(e.target.value)}
                    >
                      <option value="">Selecione o destino...</option>
                      {deleteModal.type === 'brand' 
                        ? brands.filter(b => b.id !== deleteModal.id).map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))
                        : categories.filter(c => c.brand_id === deleteModal.brandId && c.id !== deleteModal.id).map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))
                      }
                    </select>
                    <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={24} />
                  </div>
                </motion.div>
              )}

              <div className="flex gap-6 pt-6">
                <button 
                  onClick={() => setDeleteModal(null)}
                  disabled={isDeleting}
                  className="flex-1 py-7 bg-slate-100 text-slate-600 rounded-[32px] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting || (deleteAction === 'transfer' && !transferTargetId)}
                  className="flex-1 py-7 bg-rose-500 text-white rounded-[32px] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-rose-600 transition-all active:scale-95 shadow-2xl shadow-rose-500/40 flex items-center justify-center gap-4 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} strokeWidth={2.5} />}
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isModalOpen && (
        <BrandFormModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={() => { fetchData(); setIsModalOpen(false); }} 
          brand={editingBrand}
          companyId={companyId}
        />
      )}
    </motion.div>
  );
}

