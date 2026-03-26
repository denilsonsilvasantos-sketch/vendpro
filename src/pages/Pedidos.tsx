import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { X, Eye, ShoppingBag, TrendingUp, AlertTriangle, PackageSearch, Calendar, CreditCard, Filter, Trash2, AlertCircle, Search, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateInput(dateStr: string) {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

export default function Pedidos({ companyId, role, user }: { companyId: string | null, role?: string | null, user?: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [removedItems, setRemovedItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [abcCurve, setAbcCurve] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [deletingItem, setDeletingItem] = useState<string | null>(null);

  async function fetchOrders() {
    if (!supabase || companyId === null) return;

    let query = supabase
      .from('orders')
      .select('*, customers(nome, telefone), brands(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (role === 'seller' && user?.id) {
      query = query.eq('seller_id', user.id);
    } else if (role === 'customer' && user?.id) {
      query = query.eq('customer_id', user.id);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else {
      setOrders(data || []);
      if (role === 'customer' && data && data.length > 0) {
        fetchAbcCurve(data.map((o: any) => o.id));
      }
    }

    // Fetch brands for filtering
    const { data: brandsData } = await supabase.from('brands').select('*').eq('company_id', companyId).order('name');
    setBrands(brandsData || []);
    
    setLoading(false);
  }

  async function fetchAbcCurve(orderIds: string[]) {
    if (!supabase || orderIds.length === 0) return;
    const { data, error } = await supabase
      .from('order_items')
      .select('product_id, nome, sku, quantidade, subtotal')
      .in('order_id', orderIds);
    if (error) return;
    const grouped = data.reduce((acc: any, item: any) => {
      if (!acc[item.product_id]) acc[item.product_id] = { nome: item.nome, sku: item.sku, total_qtd: 0, total_valor: 0 };
      acc[item.product_id].total_qtd += item.quantidade;
      acc[item.product_id].total_valor += Number(item.subtotal);
      return acc;
    }, {});
    setAbcCurve(Object.values(grouped).sort((a: any, b: any) => b.total_valor - a.total_valor).slice(0, 5));
  }

  useEffect(() => {
    fetchOrders();
    if (!supabase || companyId === null) return;
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `company_id=eq.${companyId}` }, fetchOrders)
      .subscribe();
    return () => { if (supabase && channel) supabase.removeChannel(channel); };
  }, [companyId, role, user?.id]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterBrand && o.brand_id !== filterBrand) return false;
      if (filterDateFrom) {
        const from = new Date(filterDateFrom + 'T00:00:00');
        if (new Date(o.created_at) < from) return false;
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo + 'T23:59:59');
        if (new Date(o.created_at) > to) return false;
      }
      if (filterSearch) {
        const s = filterSearch.toLowerCase();
        const clientName = (o.customers?.nome || o.client_name || '').toLowerCase();
        if (!clientName.includes(s)) return false;
      }
      return true;
    });
  }, [orders, filterStatus, filterDateFrom, filterDateTo, filterSearch]);

  const hasActiveFilters = filterStatus || filterBrand || filterDateFrom || filterDateTo || filterSearch;

  function clearFilters() {
    setFilterStatus('');
    setFilterBrand('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterSearch('');
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) { alert('Erro ao atualizar status.'); return; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
  };

  const handleNotifyCustomer = (order: any) => {
    const phone = order.customers?.telefone;
    if (!phone) {
      alert('Cliente não possui telefone cadastrado.');
      return;
    }

    const statusMsg = {
      pending: 'está Pendente',
      typed: 'foi Digitado',
      finished: 'foi Finalizado',
      cancelled: 'foi Cancelado'
    }[order.status as string] || 'teve o status atualizado';

    const brandName = order.brands?.name || 'nossa loja';
    const message = `Olá! Passando para avisar que seu pedido #${order.id.slice(-4)} da marca ${brandName} ${statusMsg}. Você pode acompanhar os detalhes no nosso aplicativo!`;
    
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    setItemsError(null);
    setOrderItems([]);
    setRemovedItems([]);
    if (!supabase) { setItemsError('Conexão indisponível.'); setLoadingItems(false); return; }
    try {
      const [{ data: items, error: e1 }, { data: removed, error: e2 }] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', order.id),
        supabase.from('order_removed_items').select('*').eq('order_id', order.id),
      ]);
      if (e1) { setItemsError(`Erro: ${e1.message}`); return; }
      setOrderItems(items || []);
      setRemovedItems(removed || []);
    } catch (err: any) {
      setItemsError(`Erro inesperado: ${err.message}`);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!supabase || !selectedOrder) return;
    if (!confirm(`Remover "${item.nome}" do pedido?`)) return;
    setDeletingItem(item.id);
    try {
      const { error: insertErr } = await supabase.from('order_removed_items').insert({
        order_id: selectedOrder.id,
        product_id: item.product_id,
        nome: item.nome,
        sku: item.sku,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal,
      });
      if (insertErr) throw insertErr;

      const { error: deleteErr } = await supabase.from('order_items').delete().eq('id', item.id);
      if (deleteErr) throw deleteErr;

      const newTotal = orderItems
        .filter(i => i.id !== item.id)
        .reduce((acc: number, i: any) => acc + Number(i.subtotal), 0);

      await supabase.from('orders').update({ total: newTotal }).eq('id', selectedOrder.id);

      setOrderItems(prev => prev.filter(i => i.id !== item.id));
      setRemovedItems(prev => [...prev, { ...item }]);
      setSelectedOrder((prev: any) => ({ ...prev, total: newTotal }));
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, total: newTotal } : o));
    } catch (err: any) {
      alert(`Erro ao remover item: ${err.message}`);
    } finally {
      setDeletingItem(null);
    }
  };

  const statusLabel = (s: string) => ({ pending: 'Pendente', typed: 'Digitado', finished: 'Finalizado', cancelled: 'Cancelado' }[s] || s);
  const statusClass = (s: string) => ({
    pending: 'bg-amber-50 text-amber-600',
    typed: 'bg-blue-50 text-blue-600',
    finished: 'bg-emerald-50 text-emerald-600',
    cancelled: 'bg-rose-50 text-rose-600',
  }[s] || 'bg-slate-100 text-slate-600');

  const canEditOrder = role === 'seller' || role === 'company';
  const showRemovedToCustomer = role === 'customer' && selectedOrder?.status === 'finished';

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {role === 'customer' ? 'Meus Pedidos' : 'Pedidos'}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${showFilters || hasActiveFilters ? 'bg-primary text-white border-primary shadow-md shadow-primary/30' : 'bg-white text-slate-500 border-slate-200 hover:border-primary/40'}`}
          >
            <Filter size={13} />
            Filtros
            {hasActiveFilters && <span className="w-4 h-4 bg-white text-primary rounded-full text-[9px] font-black flex items-center justify-center">{[filterStatus, filterBrand, filterDateFrom, filterDateTo, filterSearch].filter(Boolean).length}</span>}
          </button>
          <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-xs font-bold text-slate-500">
            {filteredOrders.length} pedidos
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Filtrar Pedidos</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[10px] font-bold text-rose-500 hover:underline">Limpar filtros</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {role !== 'customer' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Buscar cliente</label>
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="text"
                        value={filterSearch}
                        onChange={e => setFilterSearch(e.target.value)}
                        placeholder="Nome do cliente..."
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40 font-medium"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Marca</label>
                  <select
                    value={filterBrand}
                    onChange={e => setFilterBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40 font-medium"
                  >
                    <option value="">Todas</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</label>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40 font-medium"
                  >
                    <option value="">Todos</option>
                    <option value="pending">Pendente</option>
                    <option value="typed">Digitado</option>
                    <option value="finished">Finalizado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Data de</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={e => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Até</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={e => setFilterDateTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40 font-medium"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {role === 'customer' && abcCurve.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Seus Mais Comprados</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {abcCurve.map((item: any, idx) => (
              <motion.div key={item.sku} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-primary/20 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>{idx + 1}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{item.sku}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 line-clamp-1 mb-2">{item.nome}</h3>
                <div className="flex justify-between items-end">
                  <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Qtd</p><p className="text-sm font-black text-slate-700">{item.total_qtd}</p></div>
                  <div className="text-right"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</p><p className="text-sm font-black text-primary">R$ {item.total_valor.toFixed(2)}</p></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">ID</th>
                {role !== 'customer' && <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Cliente</th>}
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Marca</th>
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Data</th>
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</th>
                {canEditOrder && <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden md:table-cell">Pagamento</th>}
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                <th className="p-6 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order, index) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6">
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">#{filteredOrders.length - index}</span>
                  </td>
                  {role !== 'customer' && (
                    <td className="p-6">
                      <button onClick={() => openOrderDetails(order)} className="font-bold text-slate-800 hover:text-primary transition-colors text-left">
                        {order.customers?.nome || order.client_name || 'N/A'}
                      </button>
                    </td>
                  )}
                  <td className="p-6">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">
                      {order.brands?.name || 'N/A'}
                    </span>
                  </td>
                  <td className="p-6 hidden sm:table-cell">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-300" />
                      {formatDate(order.created_at)}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className="font-black text-primary">R$ {Number(order.total || 0).toFixed(2)}</span>
                  </td>
                  {canEditOrder && (
                    <td className="p-6 hidden md:table-cell">
                      {order.payment_method
                        ? <span className="flex items-center gap-1.5 text-xs text-slate-600 font-bold"><CreditCard size={12} className="text-slate-300" />{order.payment_method}</span>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                  )}
                  <td className="p-6">
                    {role === 'customer' ? (
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                    ) : (
                      <select value={order.status || 'pending'} onChange={e => handleStatusChange(order.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-none outline-none cursor-pointer ${statusClass(order.status)}`}>
                        <option value="pending">Pendente</option>
                        <option value="typed">Digitado</option>
                        <option value="finished">Finalizado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    )}
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => openOrderDetails(order)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
              <ShoppingBag size={40} />
            </div>
            <p className="text-slate-400 font-medium">{hasActiveFilters ? 'Nenhum pedido encontrado com esses filtros.' : 'Nenhum pedido encontrado.'}</p>
            {hasActiveFilters && <button onClick={clearFilters} className="mt-3 text-xs text-primary font-bold hover:underline">Limpar filtros</button>}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">

              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Detalhes do Pedido</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                    {selectedOrder.customers?.nome || selectedOrder.client_name}
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-2xl shadow-sm border border-slate-100 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {loadingItems ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Carregando...</span>
                    </div>
                  </div>
                ) : itemsError ? (
                  <div className="p-12 text-center bg-rose-50 rounded-[32px] border-2 border-dashed border-rose-100">
                    <div className="flex flex-col items-center gap-4">
                      <AlertTriangle size={32} className="text-rose-500" />
                      <p className="text-rose-900 font-black">{itemsError}</p>
                      <button onClick={() => openOrderDetails(selectedOrder)} className="px-6 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm">Tentar Novamente</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><Calendar size={10} /> Data</p>
                        <p className="text-sm font-bold text-slate-700">{formatDate(selectedOrder.created_at)}</p>
                      </div>
                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-1">Total</p>
                        <p className="text-xl font-black text-primary">R$ {Number(selectedOrder.total || 0).toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Itens</p>
                        <p className="text-xl font-black text-slate-800">{orderItems.reduce((a, i) => a + i.quantidade, 0)}</p>
                      </div>
                      {canEditOrder && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><CreditCard size={10} /> Pagamento</p>
                          <p className="text-sm font-bold text-slate-700">{selectedOrder.payment_method || '—'}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Itens do Pedido</h4>
                      <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                          {orderItems.length > 0 ? orderItems.map(item => (
                            <motion.div key={item.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10, height: 0 }}
                              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-primary/20 transition-all group">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{item.sku}</span>
                                  <h5 className="font-bold text-slate-800 text-sm">{item.nome}</h5>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{item.quantidade} x R$ {Number(item.preco_unitario).toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="font-black text-slate-900">R$ {Number(item.subtotal).toFixed(2)}</p>
                                {canEditOrder && (
                                  <button
                                    onClick={() => handleDeleteItem(item)}
                                    disabled={deletingItem === item.id}
                                    className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                                    title="Remover item do pedido"
                                  >
                                    {deletingItem === item.id
                                      ? <div className="w-3.5 h-3.5 border-b-2 border-rose-400 rounded-full animate-spin" />
                                      : <Trash2 size={14} />}
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )) : (
                            <div className="p-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
                              <PackageSearch size={32} className="text-slate-200 mx-auto mb-3" />
                              <p className="text-slate-900 font-black">Nenhum item encontrado.</p>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {(canEditOrder ? removedItems.length > 0 : showRemovedToCustomer && removedItems.length > 0) && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={14} className="text-rose-500" />
                          <h4 className="text-xs font-bold uppercase tracking-widest text-rose-500">Itens Esgotados / Removidos</h4>
                        </div>
                        <div className="space-y-2">
                          {removedItems.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-400 px-1.5 py-0.5 rounded line-through">{item.sku}</span>
                                  <h5 className="font-bold text-rose-700 text-sm line-through">{item.nome}</h5>
                                </div>
                                <p className="text-xs text-rose-400 mt-1">{item.quantidade} x R$ {Number(item.preco_unitario).toFixed(2)}</p>
                              </div>
                              <p className="font-black text-rose-400 line-through">R$ {Number(item.subtotal).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                        {role === 'customer' && (
                          <p className="text-[10px] text-rose-400 font-medium text-center">Estes itens foram removidos do seu pedido pela empresa.</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${selectedOrder.status === 'pending' ? 'bg-amber-500' : selectedOrder.status === 'typed' ? 'bg-blue-500' : selectedOrder.status === 'finished' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Status: {statusLabel(selectedOrder.status)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {canEditOrder && selectedOrder.customers?.telefone && (
                    <button 
                      onClick={() => handleNotifyCustomer(selectedOrder)}
                      className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center gap-2"
                    >
                      <Send size={16} />
                      Notificar Cliente
                    </button>
                  )}
                  <button onClick={() => setSelectedOrder(null)} className="px-8 py-3 bg-white text-slate-600 rounded-xl font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-all">
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
