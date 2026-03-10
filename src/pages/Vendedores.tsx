import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Seller } from '../types';
import { Plus, Edit, Trash2, Users, Loader2 } from 'lucide-react';
import SellerFormModal from '../components/SellerFormModal';

export default function Vendedores({ companyId }: { companyId: number | null }) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | undefined>();

  const fetchSellers = async () => {
    if (!supabase || !companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('sellers').select('*').eq('company_id', companyId).order('nome');
      if (error) throw error;
      setSellers(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar vendedores:", error);
      alert("Erro ao carregar vendedores: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, [companyId]);

  const handleDelete = async (id: number) => {
    if (!supabase || !confirm('Tem certeza que deseja excluir este vendedor?')) return;
    try {
      const { error } = await supabase.from('sellers').delete().eq('id', id);
      if (error) throw error;
      fetchSellers();
    } catch (error: any) {
      console.error("Erro ao excluir vendedor:", error);
      alert("Erro ao excluir vendedor: " + error.message);
    }
  };

  if (loading && sellers.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-slate-500 font-medium">Carregando vendedores...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Vendedores</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie a equipe de vendas da sua empresa.</p>
        </div>
        <button 
          onClick={() => { setEditingSeller(undefined); setIsModalOpen(true); }} 
          className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95"
        >
          <Plus size={20} /> Novo Vendedor
        </button>
      </div>

      {sellers.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <Users className="text-slate-300" size={40} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Nenhum vendedor cadastrado</h2>
            <p className="text-slate-500 max-w-xs mx-auto">Adicione vendedores para que eles possam atender clientes e gerar pedidos.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-primary font-bold hover:underline"
          >
            Cadastrar meu primeiro vendedor
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellers.map(seller => (
                  <tr key={seller.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{seller.nome}</td>
                    <td className="p-4 font-mono text-slate-600">{seller.codigo_vinculo}</td>
                    <td className="p-4 text-slate-600">{seller.whatsapp || '-'}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${seller.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                        {seller.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setEditingSeller(seller); setIsModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(seller.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <SellerFormModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={() => { fetchSellers(); setIsModalOpen(false); }} 
          seller={editingSeller}
          companyId={companyId}
        />
      )}
    </div>
  );
}
