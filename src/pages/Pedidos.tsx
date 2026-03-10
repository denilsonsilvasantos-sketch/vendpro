import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { FileText } from 'lucide-react';

export default function Pedidos() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!supabase) return;
      const { data, error } = await supabase.from('orders').select('*, customers(empresa)');
      if (error) console.error(error);
      else setOrders(data || []);
      setLoading(false);
    }
    fetchOrders();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        console.log('Novo pedido!', payload);
        setOrders(prev => [payload.new as any, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
                <td className="p-4">{order.customers?.empresa}</td>
                <td className="p-4">R$ {order.total?.toFixed(2)}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    order.status === 'WhatsApp' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'Atendido' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'Finalizado' ? 'bg-green-100 text-green-800' : 'bg-slate-100'
                  }`}>
                    {order.status}
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
