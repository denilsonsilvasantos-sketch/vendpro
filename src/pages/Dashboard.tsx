import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, Users, ShoppingCart, TrendingUp, Tag, LayoutGrid, MessageCircle, Clock, ExternalLink, Sparkles } from 'lucide-react';
import { UserRole, BannerData, ActiveCart } from '../types';

export default function Dashboard({
  companyId,
  role,
  user,
  banners,
  activeCarts = [],
  onOpenActiveCarts
}: {
  companyId: string | null;
  role?: UserRole;
  user?: any;
  banners?: BannerData[];
  activeCarts?: ActiveCart[];
  onOpenActiveCarts?: () => void;
}) {
  const [stats, setStats] = useState({ products: 0, customers: 0, orders: 0, revenue: 0, companies: 0, brands: 0, categories: 0 });
  const [brandRevenue, setBrandRevenue] = useState<{ name: string, value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState<any>(null);

  const isMaster = companyId === '273c5bbc-631b-44dc-b286-1b07de720222';

  useEffect(() => {
    async function fetchStats() {
      if (!supabase || companyId === null) return;

      if (isMaster) {
        // Busca estatísticas globais para o MASTER
        const [prodRes, custRes, compRes, brandRes, catRes] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('brands').select('id', { count: 'exact', head: true }),
          supabase.from('categories').select('id', { count: 'exact', head: true })
        ]);

        setStats({
          products: prodRes.count || 0,
          customers: custRes.count || 0,
          orders: 0,
          revenue: 0,
          companies: compRes.count || 0,
          brands: brandRes.count || 0,
          categories: catRes.count || 0
        });
        setLoading(false);
        return;
      }

      let blockedBrandIds: string[] = [];
      if (role === 'seller' && user?.id) {
        const { data: sellerData } = await supabase.from('sellers').select('marcas_bloqueadas').eq('id', user.id).maybeSingle();
        blockedBrandIds = sellerData?.marcas_bloqueadas || user.marcas_bloqueadas || [];
      }
      let productQuery = supabase.from('products').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      if (role === 'seller' && blockedBrandIds.length > 0) productQuery = productQuery.not('brand_id', 'in', `(${blockedBrandIds.join(',')})`);
      const { count: productCount } = await productQuery;
      let sellerIds: string[] = [];
      if (role === 'seller' && user?.id) { sellerIds = [user.id]; }
      else { const { data: sellers } = await supabase.from('sellers').select('id').eq('company_id', companyId); sellerIds = sellers?.map(s => s.id) || []; }
      const { count: customerCount } = sellerIds.length > 0 ? await supabase.from('customers').select('*', { count: 'exact', head: true }).in('seller_id', sellerIds) : { count: 0 };
      let orderQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      if (role === 'seller' && user?.id) orderQuery = orderQuery.eq('seller_id', user.id);
      const { count: orderCount } = await orderQuery;
      let revenueQuery = supabase.from('orders').select('id, total, brand:brands!brand_id (name)').eq('company_id', companyId);
      if (role === 'seller' && user?.id) revenueQuery = revenueQuery.eq('seller_id', user.id);
      const { data: orders } = await revenueQuery;
      const totalRevenue = orders?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;
      
      const brandMap: Record<string, number> = {};
      orders?.forEach((order: any) => { 
        const n = order.brand?.name || 'Sem Marca'; 
        brandMap[n] = (brandMap[n] || 0) + (order.total || 0); 
      });

      setStats({ products: productCount || 0, customers: customerCount || 0, orders: orderCount || 0, revenue: totalRevenue, companies: 0, brands: 0, categories: 0 });
      setBrandRevenue(Object.entries(brandMap).map(([name, value]) => ({ name, value })));
      setLoading(false);
    }
    fetchStats();
    if (!supabase || !companyId || isMaster) return;
    const channel = supabase.channel('new-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `company_id=eq.${companyId}` }, (payload) => {
        if (role !== 'seller' || payload.new.seller_id === user?.id) { setNewOrder(payload.new); setTimeout(() => setNewOrder(null), 5000); }
      }).subscribe();
    return () => { if (supabase && channel) supabase.removeChannel(channel); };
  }, [companyId, role, user?.id, isMaster]);

  const handleWhatsAppContact = (cart: ActiveCart) => {
    if (!cart.customer_whatsapp) return;
    const cleanPhone = cart.customer_whatsapp.replace(/\D/g, '');
    const clientName = cart.customer_name ? cart.customer_name.split(' ')[0] : 'Cliente';
    const brandText = cart.brand_name ? ` da marca ${cart.brand_name}` : '';
    const totalText = `R$ ${cart.total.toFixed(2)}`;
    const message = `Olá, ${clientName}! Vi que você começou a montar um pedido${brandText} no nosso catálogo online (Total: ${totalText}). Teve alguma dúvida sobre produtos, tamanhos ou pagamento? Posso te ajudar a finalizar seu pedido! 😊`;
    const url = `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[300px]">
      <TrendingUp className="animate-spin text-primary" size={24} />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {newOrder && (
        <div className="fixed top-16 right-4 bg-primary text-white px-4 py-3 rounded-xl shadow-xl z-50 text-xs font-bold animate-in fade-in slide-in-from-right-4">
          🛍 Novo pedido recebido!
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <TrendingUp size={16} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Dashboard {isMaster ? 'Matriz' : ''}</h1>
            <p className="text-xs text-slate-400">{isMaster ? 'Visão geral de toda a rede VendPro' : 'Visão geral do seu negócio'}</p>
          </div>
        </div>

        {!isMaster && activeCarts.length > 0 && onOpenActiveCarts && (
          <button
            onClick={onOpenActiveCarts}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/30 text-xs font-black transition-all shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <ShoppingCart size={13} />
            <span>{activeCarts.length} {activeCarts.length === 1 ? 'Carrinho em Aberto' : 'Carrinhos em Aberto'}</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isMaster ? (
          <>
            {[
              { title: 'Produtos Matriz', value: stats.products, icon: <Package size={14} />, color: 'text-primary' },
              { title: 'Marcas', value: stats.brands, icon: <Tag size={14} />, color: 'text-amber-500' },
              { title: 'Categorias', value: stats.categories, icon: <LayoutGrid size={14} />, color: 'text-blue-500' },
            ].map(s => (
              <div key={s.title} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.title}</span>
                  <span className={s.color}>{s.icon}</span>
                </div>
                <div className="text-lg font-black text-slate-900">{s.value}</div>
              </div>
            ))}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Active Carts / Recovery Section (When active carts exist) */}
      {!isMaster && activeCarts.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-2xl border border-amber-200/80 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <ShoppingCart size={16} />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <span>Recuperação de Vendas • Carrinhos em Aberto</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {activeCarts.length}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Clientes que adicionaram produtos ao carrinho recentemente. Entre em contato para tirar dúvidas e fechar!
                </p>
              </div>
            </div>

            {onOpenActiveCarts && (
              <button
                onClick={onOpenActiveCarts}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Ver todos</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeCarts.slice(0, 3).map(cart => (
              <div
                key={cart.customer_id}
                className="bg-white rounded-xl border border-slate-200/80 p-3.5 space-y-2.5 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {cart.customer_name}
                    </span>
                    <span className="font-black text-xs text-amber-600 font-mono">
                      R$ {Number(cart.total || 0).toFixed(2)}
                    </span>
                  </div>

                  {cart.customer_empresa && (
                    <p className="text-[11px] text-slate-500 truncate font-medium">
                      {cart.customer_empresa}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    {cart.brand_name && (
                      <span className="text-rose-600 font-bold uppercase">{cart.brand_name}</span>
                    )}
                    <span>•</span>
                    <span>{cart.product_count || cart.item_count || 1} peças</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={onOpenActiveCarts}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    Ver itens ({cart.items?.length || 0})
                  </button>

                  <button
                    onClick={() => handleWhatsAppContact(cart)}
                    disabled={!cart.customer_whatsapp}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${cart.customer_whatsapp ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                  >
                    <MessageCircle size={13} />
                    <span>Ajudar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Visão Geral</h2>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={isMaster ? [
                { name: 'Produtos Matriz', value: stats.products },
                { name: 'Marcas', value: stats.brands },
                { name: 'Categorias', value: stats.categories }
              ] : [
                { name: 'Produtos', value: stats.products },
                { name: 'Clientes', value: stats.customers },
                { name: 'Pedidos', value: stats.orders }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px', fontSize: '11px' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                  {['#ff3ea5', '#8b3ea9', '#e250c5', '#3ea98b'].map((fill, i) => <Cell key={i} fill={fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {!isMaster && (
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Faturamento por Marca</h2>
            <div className="h-48 w-full">
              {brandRevenue.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-300 text-xs">Nenhum pedido ainda</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
        )}
      </div>
    </div>
  );
}
