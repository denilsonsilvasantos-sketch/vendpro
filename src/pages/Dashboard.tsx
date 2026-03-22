import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Card } from '../components/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, Users, ShoppingCart, TrendingUp } from 'lucide-react';
import Banner from '../components/Banner';
import { UserRole, BannerData } from '../types';

export default function Dashboard({ companyId, role, user, banners }: { companyId: string | null, role?: UserRole, user?: any, banners?: BannerData[] }) {
  const [stats, setStats] = useState({ products: 0, customers: 0, orders: 0, revenue: 0 });
  const [brandRevenue, setBrandRevenue] = useState<{ name: string, value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState<any>(null);

  useEffect(() => {
    async function fetchStats() {
      if (!supabase || companyId === null) return;
      
      let releasedBrandIds: string[] = [];
      
      // If seller, fetch released brands from DB to be sure it's fresh
      if (role === 'seller' && user?.id) {
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('marcas_liberadas')
          .eq('id', user.id)
          .maybeSingle();
        
        releasedBrandIds = sellerData?.marcas_liberadas || user.marcas_liberadas || [];
      }
      
      // Fetch counts
      let productQuery = supabase.from('products').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      
      if (role === 'seller' && releasedBrandIds.length > 0) {
        productQuery = productQuery.in('brand_id', releasedBrandIds);
      }
      
      const { count: productCount } = await productQuery;
      
      // Clientes estão vinculados a vendedores, que estão vinculados a empresas
      let sellerIds: string[] = [];
      if (role === 'seller' && user?.id) {
        sellerIds = [user.id];
      } else {
        const { data: sellers } = await supabase.from('sellers').select('id').eq('company_id', companyId);
        sellerIds = sellers?.map(s => s.id) || [];
      }
      
      const { count: customerCount } = sellerIds.length > 0 
        ? await supabase.from('customers').select('*', { count: 'exact', head: true }).in('seller_id', sellerIds)
        : { count: 0 };

      let orderQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      if (role === 'seller' && user?.id) {
        orderQuery = orderQuery.eq('seller_id', user.id);
      }
      const { count: orderCount } = await orderQuery;
      
      // Fetch total revenue and breakdown by brand
      let revenueQuery = supabase.from('orders').select('id, total').eq('company_id', companyId);
      if (role === 'seller' && user?.id) {
        revenueQuery = revenueQuery.eq('seller_id', user.id);
      }
      const { data: orders } = await revenueQuery;
      const totalRevenue = orders?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;

      // Fetch order items to calculate revenue by brand
      // We filter by order_id to only include orders the seller has access to
      const orderIds = orders?.map(o => o.id) || [];
      
      let orderItemsQuery = supabase
        .from('order_items')
        .select(`
          subtotal,
          product:product_id (
            brand:brand_id (
              name
            )
          )
        `);
      
      if (orderIds.length > 0) {
        orderItemsQuery = orderItemsQuery.in('order_id', orderIds);
      } else {
        // No orders, no items
        orderItemsQuery = orderItemsQuery.eq('order_id', 'none');
      }

      const { data: orderItems } = await orderItemsQuery;
      
      const brandMap: Record<string, number> = {};
      orderItems?.forEach((item: any) => {
        const brandName = item.product?.brand?.name || 'Sem Marca';
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
        // Only notify if it's for this seller or if company
        if (role !== 'seller' || payload.new.seller_id === user?.id) {
          setNewOrder(payload.new);
          setTimeout(() => setNewOrder(null), 5000); // Hide after 5s
        }
      })
      .subscribe();

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [companyId, role, user?.id]);

  const data = [
    { name: 'Produtos', value: stats.products },
    { name: 'Clientes', value: stats.customers },
    { name: 'Pedidos', value: stats.orders },
  ];

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-6 animate-pulse">
      <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary border border-primary/20">
        <TrendingUp className="animate-spin" size={32} />
      </div>
      <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Carregando dados...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl xl:max-w-7xl mx-auto space-y-12">
      {banners && banners.length > 0 && (
        <div className="mb-12">
          <Banner banners={banners} />
        </div>
      )}
      {newOrder && (
        <div className="fixed top-24 right-8 bg-primary text-white p-6 rounded-3xl shadow-2xl z-50 font-black uppercase tracking-widest text-[10px] animate-in fade-in slide-in-from-right-4 border border-white/20">
          Novo pedido recebido! #{newOrder.id}
        </div>
      )}
      
      <div className="flex items-center gap-6 mb-12">
        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
          <TrendingUp size={32} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase">Dashboard</h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] mt-1">Visão geral do seu negócio em tempo real</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        <Card title="Produtos" value={stats.products} icon={<Package size={20} />} className="neumorphic-shadow" />
        <Card title="Clientes" value={stats.customers} icon={<Users size={20} />} className="neumorphic-shadow" />
        <Card title="Pedidos" value={stats.orders} icon={<ShoppingCart size={20} />} className="neumorphic-shadow" />
        <Card title="Receita Total" value={`R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<TrendingUp size={20} />} className="neumorphic-shadow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        <div className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 neumorphic-shadow hover:shadow-2xl transition-all duration-500">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10">Visão Geral</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900, textAnchor: 'middle' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={48}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#ff3ea5', '#8b3ea9', '#e250c5'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 neumorphic-shadow hover:shadow-2xl transition-all duration-500">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10">Faturamento por Marca</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brandRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                />
                <Bar dataKey="value" fill="#ff3ea5" radius={[0, 12, 12, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
