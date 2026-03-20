import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Customer, UserRole } from '../types';
import { Edit, Trash2, Plus, Share2, Copy, MessageCircle, Check, QrCode } from 'lucide-react';
import CustomerFormModal from '../components/CustomerFormModal';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function Clientes({ 
  companyId, 
  role, 
  user 
}: { 
  companyId: string | null, 
  role: UserRole, 
  user: any 
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  async function fetchCustomers() {
    if (!supabase || companyId === null) return;
    setLoading(true);
    try {
      let sellerIds: string[] = [];
      
      if (role === 'seller' && user?.id) {
        sellerIds = [user.id];
      } else {
        const { data: sellers } = await supabase.from('sellers').select('id').eq('company_id', companyId);
        sellerIds = sellers?.map(s => s.id) || [];
      }
      
      if (sellerIds.length === 0) {
        setCustomers([]);
        return;
      }

      const { data, error } = await supabase.from('customers').select('*').in('seller_id', sellerIds);
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar clientes:", error);
      alert("Erro ao carregar clientes: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, [companyId, role, user?.id]);

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    await supabase.from('customers').delete().eq('id', id);
    fetchCustomers();
  };

  const getShareLink = () => {
    const origin = window.location.origin;
    return `${origin}?vincular=${user?.codigo_vinculo}`;
  };

  const handleCopyLink = () => {
    const link = getShareLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const link = getShareLink();
    const message = `Olá! Acesse meu catálogo digital e faça seus pedidos por aqui: ${link}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      {role === 'seller' && user?.codigo_vinculo && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Share2 size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Seu Link de Vínculo</h2>
                <p className="text-xs text-slate-400">Compartilhe este link para que novos clientes se vinculem a você automaticamente.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowQR(!showQR)}
              className={`p-3 rounded-2xl transition-all ${showQR ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-400 hover:text-primary'}`}
              title="Mostrar QR Code"
            >
              <QrCode size={20} />
            </button>
          </div>

          <AnimatePresence>
            {showQR && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[24px] border border-slate-100 mb-4">
                  <div className="bg-white p-4 rounded-3xl shadow-inner mb-4">
                    <QRCodeSVG 
                      value={getShareLink()} 
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aponte a câmera para vincular</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 font-mono text-sm text-slate-600 break-all flex items-center justify-between">
              {getShareLink()}
              <button 
                onClick={handleCopyLink}
                className="ml-2 p-2 hover:bg-white rounded-lg transition-colors text-primary"
                title="Copiar Link"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            
            <button 
              onClick={handleShareWhatsApp}
              className="bg-[#25D366] text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-all"
            >
              <MessageCircle size={20} />
              Enviar via WhatsApp
            </button>
          </div>
        </motion.div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Meus Clientes</h1>
        <button onClick={() => { setEditingCustomer(undefined); setIsModalOpen(true); }} className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all">
          <Plus size={20} /> Novo Cliente
        </button>
      </div>
      
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="p-5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome</th>
                <th className="p-5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Telefone</th>
                <th className="p-5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-slate-400 italic">Nenhum cliente encontrado.</td>
                </tr>
              ) : (
                customers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5">
                      <p className="font-bold text-slate-700">{customer.nome}</p>
                      {customer.cnpj && <p className="text-[10px] text-slate-400 font-mono">{customer.cnpj}</p>}
                    </td>
                    <td className="p-5 text-slate-600 font-medium">{customer.telefone}</td>
                    <td className="p-5">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setEditingCustomer(customer); setIsModalOpen(true); }} 
                          className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id)} 
                          className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CustomerFormModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={() => { fetchCustomers(); setIsModalOpen(false); }} 
          customer={editingCustomer}
          companyId={companyId}
        />
      )}
    </div>
  );
}
