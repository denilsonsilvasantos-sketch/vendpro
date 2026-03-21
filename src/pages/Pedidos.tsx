import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { FileText } from 'lucide-react';

export default function Pedidos({ companyId, role, user }: { companyId: string | null, role?: string | null, user?: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pedidos</h1>
      
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-left">ID</th>
              <th className="p-4 text-left">Cliente</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-t">
                <td className="p-4">#{order.id}</td>
                <td className="p-4">{order.customers?.nome || order.client_name || 'N/A'}</td>
                <td className="p-4">R$ {Number(order.total || 0).toFixed(2)}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    order.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'attended' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'finished' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-slate-100'
                  }`}>
                    {order.status === 'pending' ? 'Pendente' : 
                     order.status === 'attended' ? 'Atendido' :
                     order.status === 'finished' ? 'Finalizado' :
                     order.status === 'cancelled' ? 'Cancelado' : order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
