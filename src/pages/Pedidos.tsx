import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { FileText, X, Eye, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Pedidos({ companyId, role, user }: { companyId: string | null, role?: string | null, user?: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  async function fetchOrders() {
    if (!supabase || companyId === null) return;
    
    let query = supabase
      .from('orders')
      .select('*, customers(nome)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (role === 'seller' && user?.id) {
      query = query.eq('seller_id', user.id);
    }
    
    const { data, error } = await query;
    
    if (error) console.error(error);
    else setOrders(data || []);
    setLoading(false);
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
    setSelectedOrder(order);
    setLoadingItems(true);
    
    if (!supabase) return;
    
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);
      
    if (error) console.error('Erro ao buscar itens:', error);
    else setOrderItems(data || []);
    setLoadingItems(false);
  };

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pedidos</h1>
        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-xs font-bold text-slate-500">
          {orders.length} Pedidos Total
        </div>
      </div>
      
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                        {orderItems.map((item) => (
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
                        ))}
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
