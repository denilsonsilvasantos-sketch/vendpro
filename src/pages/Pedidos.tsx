import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { FileText, Search, Filter, Calendar, ChevronRight, ReceiptText, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Pedidos({ companyId, role, user }: { companyId: string | null, role?: string | null, user?: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchOrders() {
      if (!supabase || companyId === null) return;
      
      let query = supabase.from('orders').select('*, customers(nome)').eq('company_id', companyId).order('created_at', { ascending: false });
      
      if (role === 'seller' && user?.id) {
        query = query.eq('seller_id', user.id);
      }
      
      const { data, error } = await query;
      
      if (error) console.error(error);
      else setOrders(data || []);
      setLoading(false);
    }
    fetchOrders();

    if (!supabase || companyId === null) return;
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `company_id=eq.${companyId}` }, (payload) => {
        if (role !== 'seller' || payload.new.seller_id === user?.id) {
          console.log('Novo pedido!', payload);
          setOrders(prev => [payload.new as any, ...prev]);
        }
      })
      .subscribe();

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [companyId, role, user?.id]);

  const filteredOrders = orders.filter(order => {
    const clientName = (order.customers?.nome || order.client_name || '').toLowerCase();
    const orderId = order.id.toLowerCase();
    const search = searchTerm.toLowerCase();
    return clientName.includes(search) || orderId.includes(search);
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendente', icon: <Clock size={12} />, color: 'bg-blue-50 text-blue-600 border-blue-100' };
      case 'attended':
        return { label: 'Atendido', icon: <AlertCircle size={12} />, color: 'bg-amber-50 text-amber-600 border-amber-100' };
      case 'finished':
        return { label: 'Finalizado', icon: <CheckCircle2 size={12} />, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'cancelled':
        return { label: 'Cancelado', icon: <XCircle size={12} />, color: 'bg-rose-50 text-rose-600 border-rose-100' };
      default:
        return { label: status, icon: <AlertCircle size={12} />, color: 'bg-slate-50 text-slate-600 border-slate-100' };
    }
  };

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-12"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary/10 rounded-[24px] flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <ReceiptText size={32} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestão de Pedidos</h1>
              <p className="text-slate-500 font-medium">Acompanhe e gerencie as solicitações em tempo real</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-[28px] p-3 flex items-center gap-3 shadow-sm border border-slate-100">
            <div className="px-8 py-3 bg-slate-50 rounded-[20px] text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border border-slate-100">
              {orders.length} Total
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={22} />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou ID do pedido..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-8 py-6 bg-white rounded-[32px] border border-slate-100 focus:ring-8 focus:ring-primary/5 outline-none font-bold text-slate-700 shadow-sm hover:shadow-xl transition-all placeholder:text-slate-300"
          />
        </div>
        <button className="px-10 py-6 bg-white text-slate-600 rounded-[32px] border border-slate-100 font-black uppercase tracking-[0.2em] text-[11px] flex items-center gap-4 hover:bg-slate-50 transition-all shadow-sm hover:shadow-xl">
          <Filter size={18} />
          Filtros
        </button>
      </div>
      
      <div className="bg-white rounded-[56px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-10 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Pedido</th>
                <th className="p-10 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Cliente</th>
                <th className="p-10 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Data e Hora</th>
                <th className="p-10 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Valor Total</th>
                <th className="p-10 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Status</th>
                <th className="p-10 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredOrders.map(order => {
                  const status = getStatusConfig(order.status);
                  return (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      key={order.id} 
                      className="hover:bg-slate-50/80 transition-all duration-500 group cursor-pointer"
                    >
                      <td className="p-10">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-[20px] flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-500 shadow-inner">
                            <FileText size={20} />
                          </div>
                          <span className="font-mono text-xs font-black text-slate-400 group-hover:text-slate-900 transition-colors tracking-tighter">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="p-10">
                        <div className="font-black text-slate-900 tracking-tight uppercase text-base">
                          {order.customers?.nome || order.client_name || 'Cliente não identificado'}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 bg-slate-100/50 inline-block px-2 py-0.5 rounded-md border border-slate-200/50">Venda Direta</div>
                      </td>
                      <td className="p-10">
                        <div className="flex items-center gap-2.5 text-sm text-slate-600 font-bold">
                          <Calendar size={16} className="text-slate-300" />
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                          {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-10">
                        <div className="font-black text-slate-900 text-xl tracking-tighter">
                          R$ {Number(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="p-10 text-center">
                        <span className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </td>
                      <td className="p-10 text-center">
                        <button className="w-14 h-14 bg-slate-100 text-slate-400 rounded-[24px] hover:bg-primary hover:text-white hover:shadow-2xl hover:shadow-primary/40 transition-all duration-500 flex items-center justify-center mx-auto">
                          <ChevronRight size={24} strokeWidth={2.5} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-40 text-center">
                    <div className="flex flex-col items-center gap-8">
                      <div className="w-28 h-28 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 border border-slate-100 shadow-inner">
                        <FileText size={56} strokeWidth={1.5} />
                      </div>
                      <div className="space-y-3">
                        <p className="font-black text-3xl text-slate-900 tracking-tight">Nenhum pedido encontrado</p>
                        <p className="text-slate-400 font-medium text-lg">Tente ajustar sua busca ou filtros.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
