import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { FileText, X, Eye, ShoppingBag, TrendingUp, Package, AlertTriangle, PackageSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Pedidos({ companyId, role, user }: { companyId: string | null, role?: string | null, user?: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [abcCurve, setAbcCurve] = useState<any[]>([]);

  async function fetchOrders() {
    if (!supabase || companyId === null) return;
    
    let query = supabase
      .from('orders')
      .select('*, customers(nome)')
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
        fetchAbcCurve(data.map(o => o.id));
      }
    }
    setLoading(false);
  }

  async function fetchAbcCurve(orderIds: string[]) {
    if (!supabase || orderIds.length === 0) return;
    
    const { data, error } = await supabase
      .from('order_items')
      .select('product_id, nome, sku, quantidade, subtotal')
      .in('order_id', orderIds);
      
    if (error) {
      console.error('Erro ao buscar curva ABC:', error);
      return;
    }
    
    const grouped = data.reduce((acc: any, item: any) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = { 
          nome: item.nome, 
          sku: item.sku, 
          total_qtd: 0, 
          total_valor: 0 
        };
      }
      acc[item.product_id].total_qtd += item.quantidade;
      acc[item.product_id].total_valor += Number(item.subtotal);
      return acc;
    }, {});
    
    const sorted = Object.values(grouped)
      .sort((a: any, b: any) => b.total_valor - a.total_valor)
      .slice(0, 5);
      
    setAbcCurve(sorted);
  }

  useEffect(() => {
    fetchOrders();

    if (!supabase || companyId === null) return;
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `company_id=eq.${companyId}` }, (payload) => {
        fetchOrders(); // Refresh all to keep order correct
      })
      .subscribe();

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [companyId, role, user?.id]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!supabase) return;
    
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
      
    if (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do pedido.');
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const openOrderDetails = async (order: any) => {
    console.log('Abrindo detalhes do pedido:', order.id);
    setSelectedOrder(order);
    setLoadingItems(true);
    setItemsError(null);
    setOrderItems([]); // Clear previous items
    
    if (!supabase) {
      setItemsError('Conexão com o banco de dados não disponível.');
      setLoadingItems(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
        
      if (error) {
        console.error('Erro ao buscar itens:', error);
        setItemsError(`Erro ao carregar itens: ${error.message}`);
      } else {
        console.log('Itens do pedido carregados:', data?.length || 0);
        if (!data || data.length === 0) {
          console.warn('Nenhum item encontrado para o pedido ID:', order.id);
        }
        setOrderItems(data || []);
      }
    } catch (err: any) {
      console.error('Erro inesperado ao buscar itens:', err);
      setItemsError(`Erro inesperado: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoadingItems(false);
    }
  };

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {role === 'customer' ? 'Meus Pedidos' : 'Pedidos'}
        </h1>
        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-xs font-bold text-slate-500">
          {orders.length} {role === 'customer' ? 'Pedidos Realizados' : 'Pedidos Total'}
        </div>
      </div>

      {role === 'customer' && abcCurve.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Curva ABC - Seus Mais Comprados</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {abcCurve.map((item, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={item.sku} 
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-primary/20 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-600' : 
                    idx === 1 ? 'bg-slate-100 text-slate-600' : 
                    idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{item.sku}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 line-clamp-1 mb-2">{item.nome}</h3>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Quantidade</p>
                    <p className="text-sm font-black text-slate-700">{item.total_qtd}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                    <p className="text-sm font-black text-primary">R$ {item.total_valor.toFixed(2)}</p>
                  </div>
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
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Cliente</th>
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</th>
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                <th className="p-6 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((order, index) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6">
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                      #{orders.length - index}
                    </span>
                  </td>
                  <td className="p-6">
                    <button 
                      onClick={() => openOrderDetails(order)}
                      className="font-bold text-slate-800 hover:text-primary transition-colors text-left"
                    >
                      {order.customers?.nome || order.client_name || 'N/A'}
                    </button>
                  </td>
                  <td className="p-6">
                    <span className="font-black text-primary">R$ {Number(order.total || 0).toFixed(2)}</span>
                  </td>
                  <td className="p-6">
                    {role === 'customer' ? (
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        order.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                        order.status === 'typed' ? 'bg-blue-50 text-blue-600' :
                        order.status === 'finished' ? 'bg-emerald-50 text-emerald-600' :
                        order.status === 'cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {
                          order.status === 'pending' ? 'Pendente' : 
                          order.status === 'typed' ? 'Digitado' :
                          order.status === 'finished' ? 'Finalizado' :
                          order.status === 'cancelled' ? 'Cancelado' : order.status
                        }
                      </span>
                    ) : (
                      <select 
                        value={order.status || 'pending'}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-none outline-none cursor-pointer transition-all ${
                          order.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          order.status === 'typed' ? 'bg-blue-50 text-blue-600' :
                          order.status === 'finished' ? 'bg-emerald-50 text-emerald-600' :
                          order.status === 'cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <option value="pending">Pendente</option>
                        <option value="typed">Digitado</option>
                        <option value="finished">Finalizado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    )}
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => openOrderDetails(order)}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {orders.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
              <ShoppingBag size={40} />
            </div>
            <p className="text-slate-400 font-medium">Nenhum pedido encontrado.</p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Detalhes do Pedido</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                    Cliente: {selectedOrder.customers?.nome || selectedOrder.client_name}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-2xl shadow-sm border border-slate-100 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {loadingItems ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Carregando Itens...</span>
                    </div>
                  </div>
                ) : itemsError ? (
                  <div className="p-12 text-center bg-rose-50 rounded-[32px] border-2 border-dashed border-rose-100">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-white rounded-2xl shadow-sm text-rose-500">
                        <AlertTriangle size={32} />
                      </div>
                      <div>
                        <p className="text-rose-900 font-black text-lg">Ops! Algo deu errado.</p>
                        <p className="text-rose-500 text-sm font-medium mt-1">{itemsError}</p>
                      </div>
                      <button 
                        onClick={() => openOrderDetails(selectedOrder)}
                        className="px-6 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all active:scale-95"
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total de Produtos</p>
                        <p className="text-xl font-black text-slate-800">
                          {orderItems.reduce((acc, item) => acc + item.quantidade, 0)} itens
                        </p>
                      </div>
                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-1">Valor Total</p>
                        <p className="text-xl font-black text-primary">
                          R$ {Number(selectedOrder.total || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Itens do Pedido</h4>
                      <div className="space-y-2">
                        {orderItems.length > 0 ? (
                          orderItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-primary/20 transition-all group">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                    {item.sku}
                                  </span>
                                  <h5 className="font-bold text-slate-800 text-sm">{item.nome}</h5>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {item.quantidade} x R$ {Number(item.preco_unitario).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-slate-900">R$ {Number(item.subtotal).toFixed(2)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
                            <div className="flex flex-col items-center gap-4">
                              <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-300">
                                <PackageSearch size={32} />
                              </div>
                              <div>
                                <p className="text-slate-900 font-black text-lg">Nenhum item encontrado.</p>
                                <p className="text-slate-400 text-sm font-medium mt-1 max-w-[280px] mx-auto">
                                  Isso pode acontecer se o pedido foi salvo antes da atualização do banco de dados ou se houve um erro na gravação.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    selectedOrder.status === 'pending' ? 'bg-amber-500' :
                    selectedOrder.status === 'typed' ? 'bg-blue-500' :
                    selectedOrder.status === 'finished' ? 'bg-emerald-500' : 'bg-slate-400'
                  }`} />
                  <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">
                    Status: {
                      selectedOrder.status === 'pending' ? 'Pendente' : 
                      selectedOrder.status === 'typed' ? 'Digitado' :
                      selectedOrder.status === 'finished' ? 'Finalizado' :
                      selectedOrder.status === 'cancelled' ? 'Cancelado' : selectedOrder.status
                    }
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="px-8 py-3 bg-white text-slate-600 rounded-xl font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
