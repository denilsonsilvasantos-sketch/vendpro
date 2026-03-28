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
      let blockedBrandIds: string[] = [];
      if (role === 'seller' && user?.id) {
        const { data: sellerData } = await supabase.from('sellers').select('marcas_bloqueadas').eq('id', user.id).maybeSingle();
        blockedBrandIds = sellerData?.marcas_bloqueadas || user.marcas_bloqueadas || [];
      }
      let productQuery = supabase.from('products').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      if (role === 'seller' && blockedBrandIds.length > 0) productQuery = productQuery.not('brand_id', 'in', blockedBrandIds);
      const { count: productCount } = await productQuery;
      let sellerIds: string[] = [];
      if (role === 'seller' && user?.id) { sellerIds = [user.id]; }
      else { const { data: sellers } = await supabase.from('sellers').select('id').eq('company_id', companyId); sellerIds = sellers?.map(s => s.id) || []; }
      const { count: customerCount } = sellerIds.length > 0 ? await supabase.from('customers').select('*', { count: 'exact', head: true }).in('seller_id', sellerIds) : { count: 0 };
      let orderQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      if (role === 'seller' && user?.id) orderQuery = orderQuery.eq('seller_id', user.id);
      const { count: orderCount } = await orderQuery;
      let revenueQuery = supabase.from('orders').select('id, total').eq('company_id', companyId);
      if (role === 'seller' && user?.id) revenueQuery = revenueQuery.eq('seller_id', user.id);
      const { data: orders } = await revenueQuery;
      const totalRevenue = orders?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;
      const orderIds = orders?.map(o => o.id) || [];
      let orderItemsQuery = supabase.from('order_items').select('subtotal, product:products!product_id (brand:brands!brand_id (name))');
      if (orderIds.length > 0) orderItemsQuery = orderItemsQuery.in('order_id', orderIds);
      else orderItemsQuery = orderItemsQuery.eq('order_id', 'none');
      const { data: orderItems } = await orderItemsQuery;
      const brandMap: Record<string, number> = {};
      orderItems?.forEach((item: any) => { const n = item.product?.brand?.name || 'Sem Marca'; brandMap[n] = (brandMap[n] || 0) + (item.subtotal || 0); });
      setStats({ products: productCount || 0, customers: customerCount || 0, orders: orderCount || 0, revenue: totalRevenue });
      setBrandRevenue(Object.entries(brandMap).map(([name, value]) => ({ name, value })));
      setLoading(false);
    }
    fetchStats();
    if (!supabase || !companyId) return;
    const channel = supabase.channel('new-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `company_id=eq.${companyId}` }, (payload) => {
        if (role !== 'seller' || payload.new.seller_id === user?.id) { setNewOrder(payload.new); setTimeout(() => setNewOrder(null), 5000); }
      }).subscribe();
    return () => { if (supabase && channel) supabase.removeChannel(channel); };
  }, [companyId, role, user?.id]);

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[300px]">
      <TrendingUp className="animate-spin text-primary" size={24} />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Banner removido do Dashboard — aparece apenas no Catálogo */}

      {newOrder && (
        <div className="fixed top-16 right-4 bg-primary text-white px-4 py-3 rounded-xl shadow-xl z-50 text-xs font-bold animate-in fade-in slide-in-from-right-4">
          🛍 Novo pedido recebido!
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
          <TrendingUp size={16} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-400">Visão geral do seu negócio</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: 'Produtos', value: stats.products, icon: <Package size={14} />, color: 'text-primary' },
          { title: 'Clientes', value: stats.customers, icon: <Users size={14} />, color: 'text-blue-500' },
          { title: 'Pedidos', value: stats.orders, icon: <ShoppingCart size={14} />, color: 'text-amber-500' },
          { title: 'Faturamento', value: `R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <TrendingUp size={14} />, color: 'text-emerald-500' },
        ].map(s => (
          <div key={s.title} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.title}</span>
              <span className={s.color}>{s.icon}</span>
            </div>
            <div className="text-lg font-black text-slate-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Visão Geral</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'Produtos', value: stats.products }, { name: 'Clientes', value: stats.customers }, { name: 'Pedidos', value: stats.orders }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px', fontSize: '11px' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                  {['#ff3ea5', '#8b3ea9', '#e250c5'].map((fill, i) => <Cell key={i} fill={fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Faturamento por Marca</h2>
          <div className="h-48">
            {brandRevenue.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-300 text-xs">Nenhum pedido ainda</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandRevenue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                  <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px', fontSize: '11px' }} />
                  <Bar dataKey="value" fill="#ff3ea5" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}