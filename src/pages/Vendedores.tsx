import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Seller } from '../types';
import { Plus, Edit, Trash2, Users, Loader2, Phone, ShieldCheck, ShieldAlert, X, ChevronRight } from 'lucide-react';
import SellerFormModal from '../components/SellerFormModal';
import { motion, AnimatePresence } from 'motion/react';

export default function Vendedores({ companyId }: { companyId: string | null }) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | undefined>();
  const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);
  const [transferToSellerId, setTransferToSellerId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const fetchSellers = async () => {
    if (!supabase || !companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('sellers').select('*').eq('company_id', companyId).order('nome');
      if (error) {
        if (error.message.includes('marcas_liberadas')) {
          const { data: fd } = await supabase.from('sellers').select('id, company_id, nome, telefone, whatsapp, codigo_vinculo, ativo').eq('company_id', companyId).order('nome');
          setSellers(fd || []);
        } else throw error;
      } else setSellers(data || []);
    } catch (error: any) { console.error("Erro:", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSellers(); }, [companyId]);

  const handleDelete = async () => {
    if (!supabase || !sellerToDelete || !transferToSellerId) return;
    setIsTransferring(true);
    try {
      await supabase.from('customers').update({ seller_id: transferToSellerId }).eq('seller_id', sellerToDelete.id);
      await supabase.from('orders').update({ seller_id: transferToSellerId }).eq('seller_id', sellerToDelete.id);
      await supabase.from('sellers').delete().eq('id', sellerToDelete.id);
      setSellerToDelete(null); setTransferToSellerId(''); fetchSellers();
    } catch (error: any) { console.error("Erro ao excluir:", error); }
    finally { setIsTransferring(false); }
  };

  if (loading && sellers.length === 0) return (
    <div className="p-6 flex items-center justify-center min-h-[300px]">
      <Loader2 className="animate-spin text-primary" size={24} />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Users size={16} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">Equipe de Vendas</h1>
            <p className="text-xs text-slate-400">{sellers.length} vendedores cadastrados</p>
          </div>
        </div>
        <button onClick={() => { setEditingSeller(undefined); setIsModalOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all">
          <Plus size={14} strokeWidth={3} /> Novo Vendedor
        </button>
      </div>

      {/* List */}
      {sellers.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-100 p-12 text-center">
          <Users className="text-slate-200 mx-auto mb-3" size={32} strokeWidth={1} />
          <p className="text-sm font-bold text-slate-400">Nenhum vendedor cadastrado</p>
          <button onClick={() => setIsModalOpen(true)} className="text-primary text-xs font-bold mt-2 hover:underline">Cadastrar primeiro vendedor</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Vendedor</th>
                <th className="p-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 hidden md:table-cell">Código</th>
                <th className="p-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 hidden sm:table-cell">WhatsApp</th>
                <th className="p-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Status</th>
                <th className="p-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sellers.map((seller, index) => (
                <motion.tr initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} key={seller.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-black text-xs group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                        {seller.nome.charAt(0)}
                      </div>
                      <span className="text-xs font-black text-slate-900 uppercase group-hover:text-primary transition-colors">{seller.nome}</span>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="font-mono text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 uppercase">{seller.codigo_vinculo}</span>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone size={11} className="text-slate-300" />
                      {seller.whatsapp || <span className="text-slate-300 italic text-[10px]">Não informado</span>}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase ${seller.ativo ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                      {seller.ativo ? <ShieldCheck size={10} strokeWidth={3} /> : <ShieldAlert size={10} strokeWidth={3} />}
                      {seller.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditingSeller(seller); setIsModalOpen(true); }} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
                        <Edit size={13} strokeWidth={2.5} />
                      </button>
                      <button onClick={() => setSellerToDelete(seller)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                        <Trash2 size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <SellerFormModal onClose={() => setIsModalOpen(false)} onSave={() => { fetchSellers(); setIsModalOpen(false); }} seller={editingSeller} companyId={companyId} />
        )}
      </AnimatePresence>

      {/* Delete modal */}
      <AnimatePresence>
        {sellerToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500"><Trash2 size={16} /></div>
                  <h2 className="text-base font-black text-slate-900">Excluir Vendedor</h2>
                </div>
                <button onClick={() => { setSellerToDelete(null); setTransferToSellerId(''); }} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
              </div>

              <p className="text-sm text-slate-500">Para excluir <span className="font-bold text-slate-900">{sellerToDelete.nome}</span>, transfira os clientes para outro vendedor.</p>

              {sellers.filter(s => s.id !== sellerToDelete.id).length > 0 ? (
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Transferir clientes para:</label>
                  <div className="relative">
                    <Users size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <select className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary/40 appearance-none" value={transferToSellerId} onChange={e => setTransferToSellerId(e.target.value)}>
                      <option value="">Selecione o responsável...</option>
                      {sellers.filter(s => s.id !== sellerToDelete.id).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none rotate-90" size={14} />
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2">
                  <ShieldAlert size={14} className="text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">Único vendedor — clientes ficarão sem responsável.</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setSellerToDelete(null); setTransferToSellerId(''); }} disabled={isTransferring} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={handleDelete} disabled={(sellers.filter(s => s.id !== sellerToDelete.id).length > 0 && !transferToSellerId) || isTransferring} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isTransferring ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
