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

  const [recentOrders, setRecentOrders] = useState<any[]>([]);

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
      
      // Fetch total revenue
      let revenueQuery = supabase.from('orders').select('id, total').eq('company_id', companyId);
      if (role === 'seller' && user?.id) {
        revenueQuery = revenueQuery.eq('seller_id', user.id);
      }
      const { data: orders } = await revenueQuery;
      const totalRevenue = orders?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;

      // Fetch recent orders
      let recentOrdersQuery = supabase
        .from('orders')
        .select(`
          id,
          total,
          status,
          created_at,
          customer:customer_id (nome),
          seller:seller_id (nome)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (role === 'seller' && user?.id) {
        recentOrdersQuery = recentOrdersQuery.eq('seller_id', user.id);
      }
      
      const { data: recentOrdersData } = await recentOrdersQuery;
      setRecentOrders(recentOrdersData || []);

      setStats({
        products: productCount || 0,
        customers: customerCount || 0,
        orders: orderCount || 0,
        revenue: totalRevenue
      });
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
      <div className="w-16 h-16 bg-primary/10 rounded-[10px] flex items-center justify-center text-primary border border-primary/20">
        <TrendingUp className="animate-spin" size={32} />
      </div>
      <p className="text-slate-500 font-black uppercase tracking-[2px] text-[10px]">Carregando dados...</p>
    </div>
  );

  return (
    <div className="p-[12px_16px] max-w-7xl mx-auto space-y-6">
      {banners && banners.length > 0 && (
        <div className="mb-6">
          <Banner banners={banners} />
        </div>
      )}
      {newOrder && (
        <div className="fixed top-24 right-8 bg-primary text-white p-6 rounded-[14px] shadow-2xl z-50 font-black uppercase tracking-[2px] text-[10px] animate-in fade-in slide-in-from-right-4 border border-white/20">
          Novo pedido recebido! #{newOrder.id}
        </div>
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Dashboard</h1>
        <p className="text-slate-500 font-black uppercase tracking-[2px] text-[8px] mt-0.5">Visão geral em tempo real</p>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Produtos', value: stats.products },
          { label: 'Clientes', value: stats.customers },
          { label: 'Pedidos', value: stats.orders },
          { label: 'Receita', value: `R$ ${stats.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-[10px] border border-slate-100 p-2.5 h-[70px] flex flex-col justify-center shadow-sm">
            <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest leading-none mb-1">{stat.label}</span>
            <div className="text-[18px] font-black text-slate-900 tracking-tight leading-none">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[14px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-bottom border-slate-50 flex justify-between items-center">
          <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[2px]">Pedidos Recentes</h2>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Últimos 10</span>
        </div>
        <div className="divide-y divide-slate-50">
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <div key={order.id} className="h-[44px] px-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-slate-900 truncate max-w-[150px]">
                    {order.customer?.nome || 'Cliente Final'}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                    {order.seller?.nome || 'Venda Direta'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                    order.status === 'pago' ? 'bg-emerald-100 text-emerald-600' : 
                    order.status === 'pendente' ? 'bg-amber-100 text-amber-600' : 
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {order.status}
                  </span>
                  <span className="text-[11px] font-black text-slate-900">
                    R$ {order.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum pedido encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
