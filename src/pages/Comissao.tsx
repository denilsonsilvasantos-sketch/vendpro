import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../integrations/supabaseClient';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  ShoppingBag, CheckCircle2, TrendingUp, DollarSign, Trophy, Filter, Star, Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatMonth(m: string) {
  const [year, month] = m.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}

interface SellerStats {
  id: string;
  nome: string;
  comissao: number;
  total_pedidos: number;
  pedidos_finalizados: number;
  valor_total: number;
  valor_finalizado: number;
  comissao_prevista: number;
  comissao_real: number;
}

interface MonthlyData {
  month: string;
  pedidos: number;
  valor: number;
  comissao: number;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  delay?: number;
}

function StatCard({ icon, label, value, sub, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 font-medium mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function Comissao({ companyId, role, user }: { companyId: string | null; role?: string | null; user?: any }) {
  const [sellers, setSellers] = useState<SellerStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [sellerMonthly, setSellerMonthly] = useState<MonthlyData[]>([]);
  const [myStats, setMyStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (role === 'company') loadCompanyData();
    else if (role === 'seller') loadSellerData();
  }, [companyId, role, user?.id, filterDateFrom, filterDateTo]);

  async function loadCompanyData() {
    if (!supabase || !companyId) return;
    setLoading(true);
    try {
      let ordersQuery = supabase
        .from('orders')
        .select('seller_id, brand_id, total, status, created_at')
        .eq('company_id', companyId)
        .neq('status', 'cancelled');

      if (filterDateFrom) ordersQuery = ordersQuery.gte('created_at', filterDateFrom + 'T00:00:00');
      if (filterDateTo) ordersQuery = ordersQuery.lte('created_at', filterDateTo + 'T23:59:59');

      const [{ data: orders }, { data: sellersList }] = await Promise.all([
        ordersQuery,
        supabase.from('sellers').select('id, nome, comissao, comissao_por_marca').eq('company_id', companyId).eq('ativo', true),
      ]);

      const statsMap: Record<string, SellerStats & { comissao_por_marca: Record<string, number> }> = {};
      (sellersList || []).forEach((s: any) => {
        statsMap[s.id] = {
          id: s.id,
          nome: s.nome,
          comissao: Number(s.comissao || 0),
          comissao_por_marca: s.comissao_por_marca || {},
          total_pedidos: 0,
          pedidos_finalizados: 0,
          valor_total: 0,
          valor_finalizado: 0,
          comissao_prevista: 0,
          comissao_real: 0,
        };
      });

      (orders || []).forEach((o: any) => {
        if (!o.seller_id || !statsMap[o.seller_id]) return;
        const s = statsMap[o.seller_id];
        const taxa = s.comissao_por_marca[o.brand_id] !== undefined
          ? s.comissao_por_marca[o.brand_id]
          : s.comissao;
        s.total_pedidos += 1;
        s.valor_total += Number(o.total || 0);
        if (o.status === 'finished') {
          s.pedidos_finalizados += 1;
          s.valor_finalizado += Number(o.total || 0);
        }
        s.comissao_prevista += (Number(o.total || 0) * taxa) / 100;
        if (o.status === 'finished') {
          s.comissao_real += (Number(o.total || 0) * taxa) / 100;
        }
      });

      const sorted = Object.values(statsMap).sort((a, b) => b.valor_finalizado - a.valor_finalizado);
      setSellers(sorted);

      const byMonth: Record<string, { pedidos: number; valor: number; comissao_total: number }> = {};
      (orders || []).forEach((o: any) => {
        const m = o.created_at?.slice(0, 7);
        if (!m) return;
        if (!byMonth[m]) byMonth[m] = { pedidos: 0, valor: 0, comissao_total: 0 };
        byMonth[m].pedidos += 1;
        byMonth[m].valor += Number(o.total || 0);
        if (o.seller_id && statsMap[o.seller_id] && o.status === 'finished') {
          const s = statsMap[o.seller_id];
          const taxa = s.comissao_por_marca[o.brand_id] !== undefined
            ? s.comissao_por_marca[o.brand_id]
            : s.comissao;
          byMonth[m].comissao_total += (Number(o.total || 0) * taxa) / 100;
        }
      });

      const monthly = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, d]) => ({ month, pedidos: d.pedidos, valor: d.valor, comissao: d.comissao_total }));

      setMonthlyData(monthly);
    } finally {
      setLoading(false);
    }
  }

  async function loadSellerData() {
    if (!supabase || !companyId || !user?.id) return;
    setLoading(true);
    try {
      const [{ data: sellerInfo }, { data: orders }] = await Promise.all([
        supabase.from('sellers').select('id, nome, comissao, comissao_por_marca').eq('id', user.id).single(),
        supabase.from('orders')
          .select('brand_id, total, status, created_at')
          .eq('company_id', companyId)
          .eq('seller_id', user.id)
          .neq('status', 'cancelled'),
      ]);

      const comissaoGlobal = Number(sellerInfo?.comissao || 0);
      const comissaoPorMarca: Record<string, number> = sellerInfo?.comissao_por_marca || {};
      let total_pedidos = 0, pedidos_finalizados = 0, valor_total = 0, valor_finalizado = 0;
      let comissao_prevista = 0, comissao_real = 0;

      const byMonth: Record<string, { pedidos: number; valor: number; comissao: number }> = {};

      (orders || []).forEach((o: any) => {
        const taxa = comissaoPorMarca[o.brand_id] !== undefined
          ? comissaoPorMarca[o.brand_id]
          : comissaoGlobal;
        total_pedidos += 1;
        valor_total += Number(o.total || 0);
        comissao_prevista += (Number(o.total || 0) * taxa) / 100;
        if (o.status === 'finished') {
          pedidos_finalizados += 1;
          valor_finalizado += Number(o.total || 0);
          comissao_real += (Number(o.total || 0) * taxa) / 100;
        }
        const m = o.created_at?.slice(0, 7);
        if (m) {
          if (!byMonth[m]) byMonth[m] = { pedidos: 0, valor: 0, comissao: 0 };
          byMonth[m].pedidos += 1;
          byMonth[m].valor += Number(o.total || 0);
          if (o.status === 'finished') {
            byMonth[m].comissao += (Number(o.total || 0) * taxa) / 100;
          }
        }
      });

      setMyStats({
        id: user.id,
        nome: sellerInfo?.nome || '',
        comissao: comissaoGlobal,
        total_pedidos,
        pedidos_finalizados,
        valor_total,
        valor_finalizado,
        comissao_prevista,
        comissao_real,
      });

      const monthly = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, d]) => ({ month, pedidos: d.pedidos, valor: d.valor, comissao: d.comissao }));

      setSellerMonthly(monthly);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => ({
    pedidos: sellers.reduce((a, s) => a + s.total_pedidos, 0),
    finalizados: sellers.reduce((a, s) => a + s.pedidos_finalizados, 0),
    valor: sellers.reduce((a, s) => a + s.valor_finalizado, 0),
    comissao: sellers.reduce((a, s) => a + s.comissao_real, 0),
  }), [sellers]);

  const top3 = useMemo(() => sellers.slice(0, 3), [sellers]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-3 text-xs space-y-1">
        <p className="font-black text-slate-700">{formatMonth(label)}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }} className="font-bold">
            {p.name}: {p.dataKey === 'pedidos' ? p.value : formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  if (role === 'seller' && myStats) {
    return (
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Minhas Comissões</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            Taxa de comissão: <span className="text-primary font-black">{myStats.comissao}%</span>
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<ShoppingBag size={20} className="text-blue-600" />} label="Pedidos Realizados" value={String(myStats.total_pedidos)} sub="Todos os status" color="bg-blue-50" delay={0} />
          <StatCard icon={<CheckCircle2 size={20} className="text-emerald-600" />} label="Pedidos Finalizados" value={String(myStats.pedidos_finalizados)} sub={`${myStats.total_pedidos > 0 ? Math.round((myStats.pedidos_finalizados / myStats.total_pedidos) * 100) : 0}% do total`} color="bg-emerald-50" delay={0.05} />
          <StatCard icon={<TrendingUp size={20} className="text-amber-600" />} label="Comissão Prevista" value={formatCurrency(myStats.comissao_prevista)} sub="Baseada em todos os pedidos" color="bg-amber-50" delay={0.1} />
          <StatCard icon={<DollarSign size={20} className="text-primary" />} label="Comissão Real" value={formatCurrency(myStats.comissao_real)} sub="Baseada nos finalizados" color="bg-primary/10" delay={0.15} />
        </div>

        {sellerMonthly.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">Evolução de Pedidos</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sellerMonthly} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pedidos" name="Pedidos" fill="#C21863" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">Evolução de Comissão</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={sellerMonthly} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line dataKey="comissao" name="Comissão" stroke="#C21863" strokeWidth={3} dot={{ r: 4, fill: '#C21863' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 lg:col-span-2">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">Evolução de Vendas (R$)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sellerMonthly} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line dataKey="valor" name="Valor Vendido" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {sellerMonthly.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center text-slate-400">
            <TrendingUp size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="font-bold">Nenhum pedido encontrado ainda.</p>
            <p className="text-sm mt-1">Os gráficos aparecerão conforme os pedidos forem registrados.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Comissões</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Acompanhe as comissões de todos os vendedores</p>
        </div>
        <button
          onClick={() => setShowFilters(p => !p)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${showFilters || filterDateFrom || filterDateTo ? 'bg-primary text-white border-primary shadow-md shadow-primary/30' : 'bg-white text-slate-500 border-slate-200 hover:border-primary/40'}`}
        >
          <Filter size={13} /> Filtrar período
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">De</label>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Até</label>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40" />
                </div>
                {(filterDateFrom || filterDateTo) && (
                  <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
                    className="text-xs text-rose-500 font-bold hover:underline pb-2">
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ShoppingBag size={20} className="text-blue-600" />} label="Total de Pedidos" value={String(totals.pedidos)} color="bg-blue-50" delay={0} />
        <StatCard icon={<CheckCircle2 size={20} className="text-emerald-600" />} label="Pedidos Finalizados" value={String(totals.finalizados)} color="bg-emerald-50" delay={0.05} />
        <StatCard icon={<DollarSign size={20} className="text-indigo-600" />} label="Volume Finalizado" value={formatCurrency(totals.valor)} color="bg-indigo-50" delay={0.1} />
        <StatCard icon={<Percent size={20} className="text-primary" />} label="Total em Comissões" value={formatCurrency(totals.comissao)} color="bg-primary/10" delay={0.15} />
      </div>

      {top3.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">Destaques do Período</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`relative bg-white rounded-2xl border p-5 overflow-hidden shadow-sm ${i === 0 ? 'border-amber-200' : i === 1 ? 'border-slate-200' : 'border-orange-200'}`}>
                <div className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-600'}`}>
                  {i === 0 ? <Star size={14} fill="currentColor" /> : i + 1}
                </div>
                <p className="font-black text-slate-800 text-sm pr-8">{s.nome}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1"><Percent size={9} />{s.comissao}% comissão</p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Volume</span>
                    <span className="font-black text-slate-700">{formatCurrency(s.valor_finalizado)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Comissão</span>
                    <span className="font-black text-primary">{formatCurrency(s.comissao_real)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {monthlyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">Pedidos por Mês</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pedidos" name="Pedidos" fill="#C21863" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">Comissões por Mês</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line dataKey="comissao" name="Comissão Total" stroke="#C21863" strokeWidth={3} dot={{ r: 4, fill: '#C21863' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">Detalhamento por Vendedor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">#</th>
                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Vendedor</th>
                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Taxa</th>
                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">Pedidos</th>
                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Finalizados</th>
                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 hidden lg:table-cell">Volume Finalizado</th>
                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Comissão Prevista</th>
                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Comissão Real</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sellers.map((s, i) => (
                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-100 text-slate-500' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                      {i === 0 ? <Star size={11} fill="currentColor" /> : i + 1}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800 text-sm">{s.nome}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full border border-emerald-100">
                      <Percent size={8} strokeWidth={3} />{s.comissao}%
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-sm font-medium text-slate-600">{s.total_pedidos}</td>
                  <td className="px-5 py-4 hidden md:table-cell text-sm font-medium text-slate-600">{s.pedidos_finalizados}</td>
                  <td className="px-5 py-4 hidden lg:table-cell text-sm font-bold text-slate-700">{formatCurrency(s.valor_finalizado)}</td>
                  <td className="px-5 py-4 text-sm font-bold text-amber-600">{formatCurrency(s.comissao_prevista)}</td>
                  <td className="px-5 py-4 text-sm font-black text-primary">{formatCurrency(s.comissao_real)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {sellers.length === 0 && (
            <div className="p-16 text-center">
              <DollarSign size={36} className="mx-auto mb-3 text-slate-200" />
              <p className="text-slate-400 font-medium">Nenhum dado encontrado para o período selecionado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
