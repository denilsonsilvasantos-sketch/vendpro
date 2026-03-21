import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Seller } from '../types';
import { Plus, Edit, Trash2, Users, Loader2, Sparkles, Phone, ShieldCheck, ShieldAlert, ChevronRight, X } from 'lucide-react';
import SellerFormModal from '../components/SellerFormModal';
import { motion, AnimatePresence } from 'motion/react';

export default function Vendedores({ companyId }: { companyId: string | null }) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | undefined>();
  const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);
  const [transferToSellerId, setTransferToSellerId] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  const fetchSellers = async () => {
    if (!supabase || !companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('sellers').select('*').eq('company_id', companyId).order('nome');
      if (error) {
        if (error.message.includes('column "marcas_liberadas" does not exist')) {
          console.warn("A coluna 'marcas_liberadas' ainda não foi criada no banco de dados.");
          const { data: fallbackData, error: fallbackError } = await supabase.from('sellers').select('id, company_id, nome, telefone, whatsapp, codigo_vinculo, ativo').eq('company_id', companyId).order('nome');
          if (fallbackError) throw fallbackError;
          setSellers(fallbackData || []);
        } else {
          throw error;
        }
      } else {
        setSellers(data || []);
      }
    } catch (error: any) {
      console.error("Erro ao buscar vendedores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, [companyId]);

  const handleDelete = async () => {
    if (!supabase || !sellerToDelete || !transferToSellerId) return;
    
    setIsTransferring(true);
    try {
      const { error: transferError } = await supabase
        .from('customers')
        .update({ seller_id: transferToSellerId })
        .eq('seller_id', sellerToDelete.id);

      if (transferError) throw transferError;

      const { error: ordersError } = await supabase
        .from('orders')
        .update({ seller_id: transferToSellerId })
        .eq('seller_id', sellerToDelete.id);

      if (ordersError) throw ordersError;

      const { error: deleteError } = await supabase
        .from('sellers')
        .delete()
        .eq('id', sellerToDelete.id);

      if (deleteError) throw deleteError;

      setSellerToDelete(null);
      setTransferToSellerId('');
      fetchSellers();
    } catch (error: any) {
      console.error("Erro ao excluir vendedor:", error);
    } finally {
      setIsTransferring(false);
    }
  };

  const confirmDelete = (seller: Seller) => {
    const otherSellers = sellers.filter(s => s.id !== seller.id);
    if (otherSellers.length === 0) {
      setSellerToDelete(seller);
      return;
    }
    setSellerToDelete(seller);
  };

  if (loading && sellers.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-6 animate-pulse">
        <div className="w-16 h-16 bg-primary/5 rounded-[24px] flex items-center justify-center text-primary border border-primary/10 shadow-inner">
          <Loader2 className="animate-spin" size={32} />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Sincronizando equipe...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-12"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary/10 rounded-[24px] flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <Users size={32} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Equipe de Vendas</h1>
              <p className="text-slate-500 font-medium text-lg">Gerencie os vendedores e representantes da sua empresa</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => { setEditingSeller(undefined); setIsModalOpen(true); }} 
          className="bg-primary text-white px-10 py-6 rounded-[32px] font-black uppercase tracking-widest text-xs flex items-center gap-4 shadow-2xl shadow-primary/40 hover:-translate-y-1 active:translate-y-0 transition-all w-full md:w-auto justify-center group"
        >
          <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" /> Novo Vendedor
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {sellers.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-40 rounded-[56px] border-2 border-dashed border-slate-100 text-center space-y-10 shadow-inner"
          >
            <div className="w-40 h-40 bg-slate-50 rounded-[48px] flex items-center justify-center mx-auto shadow-inner border border-slate-100">
              <Users className="text-slate-200" size={80} strokeWidth={1} />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Nenhum vendedor cadastrado</h2>
              <p className="text-slate-400 max-w-sm mx-auto font-medium text-lg">Adicione vendedores para que eles possam atender clientes e gerar pedidos no catálogo.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-primary font-black uppercase tracking-[0.3em] text-[11px] hover:underline underline-offset-8 transition-all"
            >
              Cadastrar meu primeiro vendedor
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-white rounded-[48px] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Vendedor</th>
                      <th className="p-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Código de Vínculo</th>
                      <th className="p-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">WhatsApp</th>
                      <th className="p-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Status</th>
                      <th className="p-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 text-right">Gerenciar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sellers.map((seller, index) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={seller.id} 
                        className="hover:bg-slate-50/80 transition-all group"
                      >
                        <td className="p-10">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-slate-100 rounded-[20px] flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                              {seller.nome.charAt(0)}
                            </div>
                            <span className="font-black text-slate-900 group-hover:text-primary transition-colors uppercase tracking-tight text-lg">{seller.nome}</span>
                          </div>
                        </td>
                        <td className="p-10">
                          <span className="font-mono text-[11px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 uppercase tracking-widest shadow-sm">
                            {seller.codigo_vinculo}
                          </span>
                        </td>
                        <td className="p-10">
                          <div className="flex items-center gap-4 text-slate-500 font-bold text-base">
                            <Phone size={18} className="text-slate-300" />
                            {seller.whatsapp || <span className="text-slate-200 italic font-medium">Não informado</span>}
                          </div>
                        </td>
                        <td className="p-10">
                          <span className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                            seller.ativo 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-slate-50 text-slate-400 border border-slate-100'
                          }`}>
                            {seller.ativo ? <ShieldCheck size={14} strokeWidth={3} /> : <ShieldAlert size={14} strokeWidth={3} />}
                            {seller.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="p-10 text-right">
                          <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                            <button 
                              onClick={() => { setEditingSeller(seller); setIsModalOpen(true); }}
                              className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 rounded-[18px] transition-all border border-transparent hover:border-primary/10 shadow-sm hover:shadow-xl"
                              title="Editar Vendedor"
                            >
                              <Edit size={24} strokeWidth={2.5} />
                            </button>
                            <button 
                              onClick={() => confirmDelete(seller)}
                              className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-[18px] transition-all border border-transparent hover:border-rose-100 shadow-sm hover:shadow-xl"
                              title="Excluir Vendedor"
                            >
                              <Trash2 size={24} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <SellerFormModal 
            onClose={() => setIsModalOpen(false)} 
            onSave={() => { fetchSellers(); setIsModalOpen(false); }} 
            seller={editingSeller}
            companyId={companyId}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sellerToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 backdrop-blur-2xl bg-slate-900/90"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="bg-white rounded-[64px] p-12 w-full max-w-2xl shadow-2xl relative z-10 space-y-12 border border-white/20 overflow-hidden"
            >
              <button 
                onClick={() => { setSellerToDelete(null); setTransferToSellerId(''); }}
                className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors"
              >
                <X size={32} strokeWidth={3} />
              </button>

              <div className="text-center space-y-8">
                <div className="w-32 h-32 bg-rose-50 rounded-[48px] flex items-center justify-center text-rose-500 mx-auto shadow-inner border border-rose-100">
                  <Trash2 size={64} strokeWidth={1.5} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Excluir Vendedor</h3>
                  <p className="text-slate-400 font-bold text-lg max-w-md mx-auto leading-relaxed">
                    Para excluir <span className="text-slate-900 font-black uppercase tracking-tight">{sellerToDelete.nome}</span>, você precisa transferir os clientes vinculados a ele para outro vendedor.
                  </p>
                </div>
              </div>

              {sellers.filter(s => s.id !== sellerToDelete.id).length > 0 ? (
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Transferir clientes para:</label>
                  <div className="relative group">
                    <Users className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={24} strokeWidth={2.5} />
                    <select 
                      className="w-full pl-16 pr-16 py-6 bg-slate-50 border border-slate-100 rounded-[32px] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/40 transition-all appearance-none font-black uppercase tracking-[0.2em] text-[11px] text-slate-600 cursor-pointer shadow-inner"
                      value={transferToSellerId}
                      onChange={e => setTransferToSellerId(e.target.value)}
                    >
                      <option value="">Selecione o novo responsável...</option>
                      {sellers.filter(s => s.id !== sellerToDelete.id).map(s => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none rotate-90" size={24} />
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 p-8 rounded-[40px] border border-amber-100 flex items-start gap-6 shadow-inner">
                  <ShieldAlert className="text-amber-500 shrink-0" size={32} />
                  <p className="text-base text-amber-800 font-bold leading-relaxed">
                    Este é o seu único vendedor. Se excluí-lo, seus clientes ficarão sem vendedor vinculado.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-6 pt-6">
                <button 
                  onClick={() => { setSellerToDelete(null); setTransferToSellerId(''); }}
                  className="flex-1 py-7 bg-slate-100 text-slate-600 rounded-[32px] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                  disabled={isTransferring}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={(sellers.filter(s => s.id !== sellerToDelete.id).length > 0 && !transferToSellerId) || isTransferring}
                  className="flex-[2] py-7 bg-rose-500 text-white rounded-[32px] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-rose-500/40 hover:bg-rose-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
                >
                  {isTransferring ? <Loader2 className="animate-spin" size={24} strokeWidth={3} /> : <Trash2 size={24} strokeWidth={3} />}
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

