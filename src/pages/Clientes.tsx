import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Customer, UserRole } from '../types';
import { Edit, Trash2, Plus, Share2, Copy, MessageCircle, Check, QrCode, Users, Search, Phone, Building2, UserCircle2 } from 'lucide-react';
import CustomerFormModal from '../components/CustomerFormModal';
import { motion, AnimatePresence } from 'motion/react';
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
  const [searchTerm, setSearchTerm] = useState('');

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
    const code = user?.codigo_cliente || user?.codigo_vinculo;
    return `${origin}?vincular=${code}`;
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

  const filteredCustomers = customers.filter(customer => {
    const name = (customer.nome || '').toLowerCase();
    const cnpj = (customer.cnpj || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || cnpj.includes(search);
  });

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <UserCircle2 size={24} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Meus Clientes</h1>
              <p className="text-slate-500 font-medium text-sm">Gerencie sua base de contatos e novos vínculos</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => { setEditingCustomer(undefined); setIsModalOpen(true); }} 
          className="bg-primary text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 shadow-xl shadow-primary/40 hover:-translate-y-1 active:translate-y-0 transition-all w-full md:w-auto justify-center group"
        >
          <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" /> Novo Cliente
        </button>
      </div>

      {role === 'seller' && (user?.codigo_vinculo || user?.codigo_cliente) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 p-12 rounded-[56px] text-white relative overflow-hidden shadow-2xl shadow-slate-900/30"
        >
          <div className="relative z-10 space-y-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-primary/20 rounded-[28px] flex items-center justify-center text-primary border border-white/10 backdrop-blur-md shadow-lg">
                  <Share2 size={40} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">Link de Vínculo Direto</h2>
                  <p className="text-base text-white/40 font-medium max-w-md mt-2">Envie este link para novos clientes. Eles serão vinculados a você automaticamente ao acessar.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowQR(!showQR)}
                className={`w-20 h-20 flex items-center justify-center rounded-[28px] transition-all duration-500 ${showQR ? 'bg-primary text-white shadow-2xl shadow-primary/60 scale-110' : 'bg-white/5 text-white/40 hover:text-white border border-white/10 hover:bg-white/10'}`}
                title="Mostrar QR Code"
              >
                <QrCode size={32} />
              </button>
            </div>

            <AnimatePresence>
              {showQR && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, scale: 0.95 }}
                  animate={{ height: 'auto', opacity: 1, scale: 1 }}
                  exit={{ height: 0, opacity: 0, scale: 0.95 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[48px] mb-10 shadow-inner">
                    <div className="p-6 bg-slate-50 rounded-[32px] shadow-inner mb-8 border border-slate-100">
                      <QRCodeSVG 
                        value={getShareLink()} 
                        size={280}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Escaneie para vincular instantaneamente</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 bg-white/5 px-10 py-6 rounded-[32px] border border-white/10 font-mono text-sm text-white/80 break-all flex items-center justify-between group backdrop-blur-md shadow-inner">
                <span className="truncate mr-8 opacity-60 font-bold tracking-tight">{getShareLink()}</span>
                <button 
                  onClick={handleCopyLink}
                  className="w-14 h-14 flex items-center justify-center bg-white/10 hover:bg-primary hover:text-white rounded-[20px] transition-all shadow-xl border border-white/5 group-hover:scale-110"
                  title="Copiar Link"
                >
                  {copied ? <Check size={24} strokeWidth={3} /> : <Copy size={24} strokeWidth={2.5} />}
                </button>
              </div>
              
              <button 
                onClick={handleShareWhatsApp}
                className="bg-[#25D366] text-white px-12 py-6 rounded-[32px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-5 shadow-2xl shadow-green-500/40 hover:-translate-y-1 active:translate-y-0 transition-all group"
              >
                <MessageCircle size={28} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                Compartilhar WhatsApp
              </button>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute -left-20 -top-20 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={22} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou CNPJ do cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-8 py-6 bg-white rounded-[32px] border border-slate-100 focus:ring-8 focus:ring-primary/5 outline-none font-bold text-slate-700 shadow-sm hover:shadow-xl transition-all placeholder:text-slate-300"
          />
        </div>
      </div>
      
      <div className="bg-white rounded-[56px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-10 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Informações do Cliente</th>
                <th className="p-10 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Contato</th>
                <th className="p-10 text-right text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredCustomers.length === 0 ? (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key="empty"
                  >
                    <td colSpan={3} className="p-40 text-center">
                      <div className="flex flex-col items-center gap-8">
                        <div className="w-28 h-28 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 border border-slate-100 shadow-inner">
                          <Users size={56} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-3">
                          <p className="font-black text-3xl text-slate-900 tracking-tight">Nenhum cliente encontrado</p>
                          <p className="text-slate-400 font-medium text-lg">Comece adicionando seu primeiro cliente!</p>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredCustomers.map(customer => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      key={customer.id} 
                      className="hover:bg-slate-50/80 transition-all duration-500 group"
                    >
                      <td className="p-10">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-slate-100 rounded-[24px] flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-500 shadow-inner">
                            <Building2 size={24} />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 tracking-tight uppercase group-hover:text-primary transition-colors text-lg">{customer.nome}</p>
                            {customer.cnpj && (
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">CNPJ: {customer.cnpj}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-10">
                        <div className="flex items-center gap-4 text-base text-slate-600 font-bold">
                          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                            <Phone size={18} />
                          </div>
                          {customer.telefone}
                        </div>
                      </td>
                      <td className="p-10">
                        <div className="flex justify-end gap-4">
                          <button 
                            onClick={() => { setEditingCustomer(customer); setIsModalOpen(true); }} 
                            className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-[24px] transition-all duration-500 shadow-sm hover:shadow-xl"
                            title="Editar"
                          >
                            <Edit size={24} strokeWidth={2.5} />
                          </button>
                          <button 
                            onClick={() => handleDelete(customer.id)} 
                            className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-[24px] transition-all duration-500 shadow-sm hover:shadow-xl"
                            title="Excluir"
                          >
                            <Trash2 size={24} strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
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
    </motion.div>
  );
}
