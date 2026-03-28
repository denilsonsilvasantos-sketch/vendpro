import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../integrations/supabaseClient';
import { Customer, UserRole } from '../types';
import { Edit, Trash2, Plus, Share2, Copy, MessageCircle, Check, QrCode, Users, Search, Phone, Building2, UserCircle2, FileSpreadsheet, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';
import CustomerFormModal from '../components/CustomerFormModal';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

export default function Clientes({ companyId, role, user }: { companyId: string | null, role: UserRole, user: any }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'loading' | null; msg: string }>({ type: null, msg: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function normalizeKey(key: string) {
    return key.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
  }

  function mapRow(row: Record<string, any>): Partial<Customer> | null {
    const normalized: Record<string, any> = {};
    for (const k of Object.keys(row)) {
      normalized[normalizeKey(k)] = row[k];
    }
    const nome = normalized['responsavel'] || normalized['contato'] || normalized['contact'] || normalized['nome'] || normalized['name'];
    const nomeEmpresa = normalized['nome_empresa'] || normalized['empresa'] || normalized['razao_social'] || normalized['company'];
    if (!nome && !nomeEmpresa) return null;
    return {
      nome: String(nome || nomeEmpresa).trim(),
      nome_empresa: nomeEmpresa ? String(nomeEmpresa).trim() : undefined,
      cnpj: String(normalized['cnpj'] || normalized['cpf'] || normalized['documento'] || '').trim() || undefined,
      whatsapp: String(normalized['whatsapp'] || normalized['telefone'] || normalized['tel'] || normalized['phone'] || '').trim() || undefined,
    };
  }

  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase || !user?.id) return;
    e.target.value = '';

    setImportStatus({ type: 'loading', msg: 'Lendo arquivo...' });

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        setImportStatus({ type: 'error', msg: 'Planilha vazia ou sem dados reconhecíveis.' });
        return;
      }

      const toInsert = rows
        .map(mapRow)
        .filter(Boolean)
        .map(c => ({
          ...c,
          seller_id: user.id,
          company_id: companyId,
        }));

      if (toInsert.length === 0) {
        setImportStatus({ type: 'error', msg: 'Nenhuma linha válida encontrada. Verifique se há uma coluna "Nome" na planilha.' });
        return;
      }

      setImportStatus({ type: 'loading', msg: `Importando ${toInsert.length} clientes...` });

      const { error } = await supabase.from('customers').insert(toInsert);

      if (error) throw error;

      setImportStatus({ type: 'success', msg: `${toInsert.length} clientes importados com sucesso!` });
      fetchCustomers();
      setTimeout(() => setImportStatus({ type: null, msg: '' }), 4000);
    } catch (err: any) {
      setImportStatus({ type: 'error', msg: `Erro na importação: ${err.message}` });
    }
  }

  async function fetchCustomers() {
    if (!supabase || companyId === null) return;
    setLoading(true);
    try {
      let sellerIds: string[] = [];
      if (role === 'seller' && user?.id) { sellerIds = [user.id]; }
      else { const { data: sellers } = await supabase.from('sellers').select('id').eq('company_id', companyId); sellerIds = sellers?.map(s => s.id) || []; }
      if (sellerIds.length === 0) { setCustomers([]); return; }
      const { data, error } = await supabase.from('customers').select('*').in('seller_id', sellerIds);
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) { console.error("Erro ao buscar clientes:", error); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchCustomers(); }, [companyId, role, user?.id]);

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    // Removido confirm para evitar problemas em iframe e seguir diretrizes
    await supabase.from('customers').delete().eq('id', id);
    fetchCustomers();
  };

  const getShareLink = () => `${window.location.origin}?vincular=${user?.codigo_cliente || user?.codigo_vinculo}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Acesse meu catálogo digital: ${getShareLink()}`)}`, '_blank');
  };

  const filteredCustomers = customers.filter(c =>
    (c.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cnpj || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[300px]">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <UserCircle2 size={16} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Meus Clientes</h1>
            <p className="text-[10px] text-slate-400">{customers.length} clientes cadastrados</p>
          </div>
        </div>
        <button onClick={() => { setEditingCustomer(undefined); setIsModalOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all">
          <Plus size={14} strokeWidth={3} /> Novo Cliente
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-200 hover:-translate-y-0.5 transition-all"
          title="Importar clientes por planilha Excel"
        >
          <FileSpreadsheet size={14} strokeWidth={2.5} /> Excel
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleExcelImport}
        />
      </div>

      <AnimatePresence>
        {importStatus.type && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold ${
              importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              importStatus.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {importStatus.type === 'loading' && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />}
            {importStatus.type === 'success' && <CheckCircle2 size={14} />}
            {importStatus.type === 'error' && <AlertCircle size={14} />}
            {importStatus.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share link (seller only) */}
      {role === 'seller' && (user?.codigo_vinculo || user?.codigo_cliente) && (
        <div className="bg-slate-900 rounded-xl p-4 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 size={14} className="text-primary" />
              <span className="text-xs font-black uppercase tracking-wide">Link de Vínculo</span>
            </div>
            <button onClick={() => setShowQR(!showQR)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${showQR ? 'bg-primary text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}>
              <QrCode size={14} />
            </button>
          </div>

          <AnimatePresence>
            {showQR && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex justify-center py-3">
                  <div className="bg-white p-3 rounded-xl">
                    <QRCodeSVG value={getShareLink()} size={120} level="H" includeMargin={true} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 px-3 py-2 rounded-lg border border-white/10 font-mono text-xs text-white/60 truncate flex items-center justify-between">
              <span className="truncate mr-2">{getShareLink()}</span>
              <button onClick={handleCopyLink} className="shrink-0 w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-primary rounded-md transition-all">
                {copied ? <Check size={10} strokeWidth={3} /> : <Copy size={10} strokeWidth={2.5} />}
              </button>
            </div>
            <button onClick={handleShareWhatsApp} className="bg-[#25D366] text-white px-3 py-2 rounded-lg font-bold text-[10px] flex items-center gap-1.5 hover:-translate-y-0.5 transition-all shrink-0">
              <MessageCircle size={12} strokeWidth={2.5} /> WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
        <input
          type="text" placeholder="Buscar por nome ou CNPJ..." value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white rounded-lg border border-slate-200 focus:border-primary/40 outline-none text-xs font-medium text-slate-700 placeholder:text-slate-300 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="text-slate-200 mx-auto mb-3" size={32} strokeWidth={1.5} />
            <p className="text-sm font-bold text-slate-400">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Cliente</th>
                <th className="p-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 hidden sm:table-cell">Responsável</th>
                <th className="p-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 hidden sm:table-cell">WhatsApp</th>
                <th className="p-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredCustomers.map(customer => (
                  <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={customer.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0">
                          <Building2 size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-primary transition-colors">
                            {customer.nome_empresa || customer.nome}
                          </p>
                          {customer.cnpj && <p className="text-[9px] text-slate-400 font-medium tracking-wider uppercase">CNPJ: {customer.cnpj}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                        <UserIcon size={11} className="text-slate-300" /> {customer.nome || '—'}
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                        <Phone size={11} className="text-slate-300" /> {customer.whatsapp || '—'}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditingCustomer(customer); setIsModalOpen(true); }} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
                          <Edit size={13} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => handleDelete(customer.id)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                          <Trash2 size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <CustomerFormModal onClose={() => setIsModalOpen(false)} onSave={() => { fetchCustomers(); setIsModalOpen(false); }} customer={editingCustomer} companyId={companyId} />
      )}
    </motion.div>
  );
}
