import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Calendar, Building2, DollarSign, Wallet, Users, ChevronDown, Filter, User } from 'lucide-react';
import { UserRole } from '../types';

export default function SalespersonReport({ companyId, role, user }: { companyId: string | null, role?: UserRole, user?: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSellers() {
      if (!supabase || !companyId || role !== 'company') return;
      const { data } = await supabase.from('sellers').select('*').eq('company_id', companyId).order('nome');
      setSellers(data || []);
    }
    loadSellers();
  }, [companyId, role]);

  useEffect(() => {
    async function fetchReport() {
      if (!supabase || !companyId) return;
      setLoading(true);
      
      try {
        let query = supabase
          .from('orders')
          .select(`
            id, 
            created_at, 
            total, 
            client_name, 
            customer_id, 
            seller_id,
            brand_id,
            customers!customer_id (nome_empresa)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (role === 'seller') {
          query = query.eq('seller_id', user.id);
        } else if (selectedSellerId) {
          query = query.eq('seller_id', selectedSellerId);
        }

        const { data: ordersData, error } = await query;
        if (error) throw error;

        // Fetch commission data for the relevant sellers
        const sellerIds = Array.from(new Set(ordersData?.map(o => o.seller_id) || []));
        const { data: sellersData } = await supabase.from('sellers').select('id, comissao, comissao_por_marca').in('id', sellerIds);

        const processedOrders = ordersData?.map(order => {
          const seller = sellersData?.find(s => s.id === order.seller_id);
          const brandCommission = seller?.comissao_por_marca?.[order.brand_id];
          const commissionRate = brandCommission !== undefined ? brandCommission : (seller?.comissao || 0);
          const commissionValue = order.total * (commissionRate / 100);

          // Handle possible array from supabase join
          const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;

          return {
            ...order,
            company_name: customer?.nome_empresa || order.client_name || 'N/A',
            commission: commissionValue
          };
        });

        setOrders(processedOrders || []);
      } catch (err) {
        console.error("Erro no relatório de vendedores:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [companyId, role, user?.id, selectedSellerId]);

  const totals = orders.reduce((acc, order) => ({
    revenue: acc.revenue + order.total,
    commission: acc.commission + order.commission
  }), { revenue: 0, commission: 0 });

  return (
    <div className="space-y-4">
      {role === 'company' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-2">
            <User size={16} className="text-primary" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar por Vendedor</span>
          </div>
          <div className="relative min-w-[200px]">
            <select 
              value={selectedSellerId || ''}
              onChange={(e) => setSelectedSellerId(e.target.value || null)}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:border-primary/30 appearance-none"
            >
              <option value="">TODOS VENDEDORES</option>
              {sellers.map(s => (
                <option key={s.id} value={s.id}>{s.nome.toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={14} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Empresa</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Pedido</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <Calendar className="animate-spin text-primary inline-block mb-2" size={20} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando dados...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">
                    Nenhuma venda encontrada
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-slate-500">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight line-clamp-1">{order.company_name}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[11px] font-black text-slate-900 tracking-tight">
                        R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[11px] font-black text-emerald-600 tracking-tight">
                        R$ {order.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && orders.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-black">
                  <td colSpan={2} className="px-6 py-4 text-[10px] uppercase text-slate-400 tracking-widest">TOTAIS</td>
                  <td className="px-6 py-4 text-right text-xs text-slate-900">
                    R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-emerald-600">
                    R$ {totals.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
