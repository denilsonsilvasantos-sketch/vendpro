import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Card } from '../components/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { Package, Users, ShoppingCart, TrendingUp, ArrowUpRight, Calendar, Bell, LayoutDashboard, Loader2 } from 'lucide-react';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard({ companyId, role, user }: { companyId: string | null, role?: UserRole, user?: any }) {
  const [stats, setStats] = useState({ products: 0, customers: 0, orders: 0, revenue: 0 });
  const [brandRevenue, setBrandRevenue] = useState<{ name: string, value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState<any>(null);

  useEffect(() => {
    async function fetchStats() {
      if (!supabase || companyId === null) return;
      
      let releasedBrandIds: string[] = [];
      
      if (role === 'seller' && user?.id) {
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('marcas_liberadas')
          .eq('id', user.id)
          .maybeSingle();
        
        releasedBrandIds = sellerData?.marcas_liberadas || user.marcas_liberadas || [];
      }
      
      let productQuery = supabase.from('products').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      
      if (role === 'seller' && releasedBrandIds.length > 0) {
        productQuery = productQuery.in('brand_id', releasedBrandIds);
      }
      
      const { count: productCount } = await productQuery;
      
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
      
      let revenueQuery = supabase.from('orders').select('id, total').eq('company_id', companyId);
      if (role === 'seller' && user?.id) {
        revenueQuery = revenueQuery.eq('seller_id', user.id);
      }
      const { data: orders } = await revenueQuery;
      const totalRevenue = orders?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;

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
        if (role !== 'seller' || payload.new.seller_id === user?.id) {
          setNewOrder(payload.new);
          setTimeout(() => setNewOrder(null), 5000);
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

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-6 animate-pulse">
        <div className="w-16 h-16 bg-primary/10 rounded-[24px] flex items-center justify-center text-primary border border-primary/20">
          <Loader2 className="animate-spin" size={32} />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Carregando painel de controle...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <AnimatePresence>
        {newOrder && (
          <motion.div 
            initial={{ y: -100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.9 }}
            className="fixed top-8 right-8 bg-slate-900 text-white p-6 rounded-[32px] shadow-2xl z-[100] flex items-center gap-5 border border-white/10 backdrop-blur-xl"
          >
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <ShoppingCart size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">Novo Pedido!</p>
              <span className="font-black text-lg tracking-tight">Pedido #{newOrder.id.slice(0, 8)}</span>
            </div>
            <button onClick={() => setNewOrder(null)} className="ml-4 text-white/40 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <LayoutDashboard size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Painel de Controle</h1>
              <p className="text-slate-500 font-medium">Bem-vindo de volta, <span className="text-primary font-bold">{user?.nome || 'Usuário'}</span></p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-[24px] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="px-5 py-2.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border border-slate-100">
            {role === 'seller' ? 'Vendedor' : 'Administrador'}
          </div>
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Bell size={18} />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Produtos', value: stats.products, icon: Package, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', sub: 'Itens no catálogo' },
          { label: 'Clientes', value: stats.customers, icon: Users, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', sub: 'Base ativa' },
          { label: 'Pedidos', value: stats.orders, icon: ShoppingCart, color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20', sub: 'Total realizado' },
          { label: 'Receita', value: `R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/20', sub: 'Faturamento bruto' }
        ].map((item, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={item.label} 
            className={`bg-gradient-to-br ${item.color} rounded-[40px] p-8 text-white shadow-2xl ${item.shadow} relative overflow-hidden group hover:-translate-y-2 transition-all duration-500`}
          >
            <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700">
              <item.icon size={160} strokeWidth={1} />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-white/70 font-black uppercase tracking-[0.2em] text-[10px]">{item.label}</span>
                <div className="w-12 h-12 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center border border-white/20">
                  <item.icon size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <div className="text-4xl font-black tracking-tighter mb-1">{item.value}</div>
                <div className="text-white/60 text-[10px] font-black uppercase tracking-widest">{item.sub}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-10 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Visão Geral</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Métricas de crescimento</p>
            </div>
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px', background: '#fff' }}
                  itemStyle={{ fontWeight: 900, fontSize: '14px', textTransform: 'uppercase' }}
                />
                <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={48}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-10 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Performance por Marca</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Distribuição de receita</p>
            </div>
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brandRevenue} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                  width={140}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px', background: '#fff' }}
                />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 12, 12, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const X = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
