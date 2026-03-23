import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Brand, Category } from '../types';
import { Edit, Trash2, Plus, ChevronDown, ChevronUp, Tag, AlertTriangle, Loader2, ArrowUp, ArrowDown, X, LayoutGrid, Settings2 } from 'lucide-react';
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

  useEffect(() => { fetchData(); }, [companyId]);

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
      let insertData: any = { company_id: companyId, brand_id: brandId, nome, ativo: true, order_index: nextIndex };
      let { error } = await supabase.from('categories').insert([insertData]);
      if (error && error.message?.includes('order_index does not exist')) {
        delete insertData.order_index;
        const retry = await supabase.from('categories').insert([insertData]);
        error = retry.error;
      }
      if (!error) {
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
        if (type === 'brand') updateData.category_id = null;
        await supabase.from('products').update(updateData).eq(idField, id);
      } else {
        await supabase.from('products').delete().eq(idField, id);
      }
      if (type === 'brand') await supabase.from('categories').delete().eq('brand_id', id);
      await supabase.from(table).delete().eq('id', id);
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
    if (direction === 'up' && index > 0) { [newBrands[index], newBrands[index-1]] = [newBrands[index-1], newBrands[index]]; }
    else if (direction === 'down' && index < newBrands.length - 1) { [newBrands[index], newBrands[index+1]] = [newBrands[index+1], newBrands[index]]; }
    else return;
    setBrands(newBrands);
    for (const [i, b] of newBrands.entries()) {
      await supabase.from('brands').update({ order_index: i }).eq('id', b.id);
    }
  };

  const moveCategory = async (brandId: string, index: number, direction: 'up' | 'down') => {
    if (!supabase) return;
    const brandCategories = categories.filter(c => c.brand_id === brandId);
    if (direction === 'up' && index > 0) { [brandCategories[index], brandCategories[index-1]] = [brandCategories[index-1], brandCategories[index]]; }
    else if (direction === 'down' && index < brandCategories.length - 1) { [brandCategories[index], brandCategories[index+1]] = [brandCategories[index+1], brandCategories[index]]; }
    else return;
    const newCategories = categories.map(c => {
      const idx = brandCategories.findIndex(bc => bc.id === c.id);
      return idx >= 0 ? { ...c, order_index: idx } : c;
    });
    setCategories(newCategories.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
    for (const [i, c] of brandCategories.entries()) {
      await supabase.from('categories').update({ order_index: i }).eq('id', c.id);
    }
  };

  if (loading && brands.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Tag size={16} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Marcas e Categorias</h1>
            <p className="text-xs text-slate-400">Estruture seu catálogo por marcas e segmentos</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingBrand(undefined); setIsModalOpen(true); }}
          className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          <Plus size={14} strokeWidth={3} /> Nova Marca
        </button>
      </div>

      {/* Brand list */}
      <AnimatePresence mode="popLayout">
        {brands.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border-2 border-dashed border-slate-100 text-center">
            <Tag className="text-slate-200 mx-auto mb-3" size={32} strokeWidth={1} />
            <p className="text-sm font-bold text-slate-400">Nenhuma marca cadastrada</p>
            <button onClick={() => setIsModalOpen(true)} className="text-primary text-xs font-bold mt-2 hover:underline">Cadastrar primeira marca</button>
          </div>
        ) : (
          <div className="space-y-2">
            {brands.map((brand, brandIndex) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={brand.id}
                className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${expandedBrands.includes(brand.id) ? 'border-primary/30 shadow-md shadow-primary/5' : 'border-slate-100 shadow-sm'}`}
              >
                {/* Brand header row */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer group"
                  onClick={() => toggleExpand(brand.id)}
                >
                  {/* Logo */}
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                    ) : (
                      <Tag className="text-slate-300" size={18} strokeWidth={1.5} />
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-base uppercase tracking-tight group-hover:text-primary transition-colors truncate">{brand.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <LayoutGrid size={10} /> {categories.filter(c => c.brand_id === brand.id).length} categorias
                      </span>
                      <span className="text-[10px] font-bold text-primary">Margem: {brand.margin_percentage}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col bg-slate-50 rounded-lg border border-slate-100 overflow-hidden mr-1">
                      <button onClick={() => moveBrand(brandIndex, 'up')} disabled={brandIndex === 0} className="p-1.5 text-slate-300 hover:text-primary disabled:opacity-20 hover:bg-slate-100 transition-all">
                        <ArrowUp size={12} strokeWidth={3} />
                      </button>
                      <button onClick={() => moveBrand(brandIndex, 'down')} disabled={brandIndex === brands.length - 1} className="p-1.5 text-slate-300 hover:text-primary disabled:opacity-20 hover:bg-slate-100 transition-all">
                        <ArrowDown size={12} strokeWidth={3} />
                      </button>
                    </div>
                    <button onClick={() => { setEditingBrand(brand); setIsModalOpen(true); }} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
                      <Edit size={14} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => handleDeleteBrand(brand.id, brand.name)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                      <Trash2 size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => toggleExpand(brand.id)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${expandedBrands.includes(brand.id) ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                    >
                      {expandedBrands.includes(brand.id) ? <ChevronUp size={14} strokeWidth={3} /> : <ChevronDown size={14} strokeWidth={3} />}
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {expandedBrands.includes(brand.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">

                          {/* Políticas */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Settings2 size={12} className="text-primary" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Políticas Comerciais</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Pedido Mínimo</p>
                                <p className="text-sm font-black text-slate-900">R$ {brand.minimum_order_value?.toFixed(2) || '0,00'}</p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Margem</p>
                                <p className="text-sm font-black text-primary">{brand.margin_percentage}%</p>
                              </div>
                            </div>
                            {[
                              { label: 'Pagamento', value: brand.payment_policy },
                              { label: 'Frete', value: brand.shipping_policy },
                              { label: 'Estoque', value: brand.stock_policy }
                            ].map(p => (
                              <div key={p.label} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">{p.label}</p>
                                <p className="text-sm text-slate-600 font-medium">{p.value || 'Não definida'}</p>
                              </div>
                            ))}
                          </div>

                          {/* Categorias */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <LayoutGrid size={12} className="text-primary" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Categorias</span>
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {categories.filter(c => c.brand_id === brand.id).map((cat, catIndex, arr) => (
                                <motion.div layout key={cat.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg group/cat hover:border-primary/30 transition-all">
                                  <span className="text-sm font-bold text-slate-700 group-hover/cat:text-primary transition-colors uppercase">{cat.nome}</span>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => moveCategory(brand.id, catIndex, 'up')} disabled={catIndex === 0} className="p-1 text-slate-300 hover:text-primary disabled:opacity-20 transition-all">
                                      <ArrowUp size={10} strokeWidth={3} />
                                    </button>
                                    <button onClick={() => moveCategory(brand.id, catIndex, 'down')} disabled={catIndex === arr.length - 1} className="p-1 text-slate-300 hover:text-primary disabled:opacity-20 transition-all">
                                      <ArrowDown size={10} strokeWidth={3} />
                                    </button>
                                    <button onClick={() => handleDeleteCategory(cat.id, cat.nome, brand.id)} className="p-1 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover/cat:opacity-100">
                                      <Trash2 size={11} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                            {/* Add category */}
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                placeholder="Nova categoria..."
                                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-primary/40 font-medium"
                                value={newCategoryName[brand.id] || ''}
                                onChange={e => setNewCategoryName(prev => ({ ...prev, [brand.id]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleAddCategory(brand.id)}
                              />
                              <button
                                onClick={() => handleAddCategory(brand.id)}
                                className="bg-primary text-white w-8 h-8 rounded-lg hover:bg-primary-dark transition-all flex items-center justify-center shrink-0"
                              >
                                <Plus size={16} strokeWidth={3} />
                              </button>
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

      {/* Delete modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500">
                    <AlertTriangle size={18} />
                  </div>
                  <h2 className="text-base font-black text-slate-900">Excluir {deleteModal.type === 'brand' ? 'Marca' : 'Categoria'}</h2>
                </div>
                <button onClick={() => setDeleteModal(null)} className="text-slate-300 hover:text-slate-600 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-slate-500">
                Removendo <span className="font-bold text-slate-900">{deleteModal.name}</span>. Como tratar os produtos vinculados?
              </p>

              <div className="space-y-2">
                {[
                  { id: 'delete', label: 'Excluir permanentemente', sub: 'Todos os produtos serão apagados' },
                  { id: 'transfer', label: 'Transferir produtos', sub: `Mover para outra ${deleteModal.type === 'brand' ? 'marca' : 'categoria'}` }
                ].map(action => (
                  <label key={action.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${deleteAction === action.id ? 'border-rose-400 bg-rose-50/50' : 'border-slate-100 hover:border-slate-200'}`}>
                    <input type="radio" name="deleteAction" value={action.id} checked={deleteAction === action.id} onChange={() => setDeleteAction(action.id as any)} className="w-4 h-4 text-rose-500" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{action.label}</p>
                      <p className="text-xs text-slate-400">{action.sub}</p>
                    </div>
                  </label>
                ))}
              </div>

              {deleteAction === 'transfer' && (
                <select
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-primary/40"
                  value={transferTargetId}
                  onChange={e => setTransferTargetId(e.target.value)}
                >
                  <option value="">Selecione o destino...</option>
                  {deleteModal.type === 'brand'
                    ? brands.filter(b => b.id !== deleteModal.id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                    : categories.filter(c => c.brand_id === deleteModal.brandId && c.id !== deleteModal.id).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)
                  }
                </select>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setDeleteModal(null)} disabled={isDeleting} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting || (deleteAction === 'transfer' && !transferTargetId)}
                  className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} strokeWidth={2.5} />}
                  Confirmar
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
