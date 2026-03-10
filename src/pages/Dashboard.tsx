import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Card } from '../components/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, Users, ShoppingCart, TrendingUp } from 'lucide-react';

export default function Dashboard({ companyId }: { companyId: number | null }) {
  const [stats, setStats] = useState({ products: 0, customers: 0, orders: 0, revenue: 0 });
  const [brandRevenue, setBrandRevenue] = useState<{ name: string, value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState<any>(null);

  useEffect(() => {
    async function fetchStats() {
      if (!supabase || companyId === null) return;
      
      // Fetch counts
      const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      
      const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId);

      const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      
      // Fetch total revenue and breakdown by brand
      const { data: orders } = await supabase.from('orders').select('id, total').eq('company_id', companyId);
      const totalRevenue = orders?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;

      // Fetch order items to calculate revenue by brand
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          subtotal,
          product:product_id (
            brand:brand_id (
              nome
            )
          )
        `);
      
      const brandMap: Record<string, number> = {};
      orderItems?.forEach((item: any) => {
        const brandName = item.product?.brand?.nome || 'Sem Marca';
        brandMap[brandName] = (brandMap[brandName] || 0) + (item.subtotal || 0);
      });

      const brandData = Object.entries(brandMap).map(([name, value]) => ({ name, value }));

      setStats({
        products: productCount || 0,
        customers: customerCount || 0,
        orders: orderCount || 0,
        revenue: totalRevenue
      });
      setBrandRevenue(brandData);
      setLoading(false);
    }
    fetchStats();

    if (!supabase || !companyId) return;
    const channel = supabase
      .channel('new-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `company_id=eq.${companyId}` }, (payload) => {
        setNewOrder(payload.new);
        setTimeout(() => setNewOrder(null), 5000); // Hide after 5s
      })
      .subscribe();

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [companyId]);

  const data = [
    { name: 'Produtos', value: stats.products },
    { name: 'Clientes', value: stats.customers },
    { name: 'Pedidos', value: stats.orders },
  ];

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      {newOrder && (
        <div className="fixed top-20 right-6 bg-green-500 text-white p-4 rounded-xl shadow-lg z-50">
          Novo pedido recebido! #{newOrder.id}
        </div>
      )}
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Produtos" value={stats.products} icon={<Package className="text-blue-500" />} />
        <Card title="Clientes" value={stats.customers} icon={<Users className="text-green-500" />} />
        <Card title="Pedidos" value={stats.orders} icon={<ShoppingCart className="text-purple-500" />} />
        <Card title="Receita Total" value={`R$ ${stats.revenue.toFixed(2)}`} icon={<TrendingUp className="text-orange-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-bold mb-4">Visão Geral</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#22c55e', '#a855f7'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-bold mb-4">Faturamento por Marca</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brandRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
