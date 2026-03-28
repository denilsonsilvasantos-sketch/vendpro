import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Seller, Brand } from '../types';
import { X, Save, Loader2, Percent, Ban, Copy, Check, Eye, EyeOff, Key } from 'lucide-react';
import { formatPhone } from '../lib/validators';
import { motion, AnimatePresence } from 'motion/react';
import { createSeller } from '../services/sellerService';

export default function SellerFormModal({ onClose, onSave, seller, companyId }: {
  onClose: () => void;
  onSave: () => void;
  seller?: Seller;
  companyId: string | null;
}) {
  const [formData, setFormData] = useState<Partial<Seller>>(seller || {
    nome: '',
    codigo_vinculo: '',
    whatsapp: '',
    ativo: true,
    comissao: 0,
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [blockedBrands, setBlockedBrands] = useState<string[]>([]);
  const [comissaoPorMarca, setComissaoPorMarca] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [createdSeller, setCreatedSeller] = useState<Seller | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchBrands() {
      if (!supabase || !companyId) return;
      setLoadingBrands(true);
      try {
        const { data, error } = await supabase.from('brands').select('*').eq('company_id', companyId).order('name');
        if (error) throw error;
        setBrands(data || []);
        if (seller?.id) {
          setBlockedBrands(seller.marcas_bloqueadas || []);
          setComissaoPorMarca(seller.comissao_por_marca || {});
        }
      } catch (error: any) {
        console.error('Erro ao buscar marcas:', error);
      } finally {
        setLoadingBrands(false);
      }
    }
    fetchBrands();
  }, [companyId, seller?.id]);

  const toggleBrand = (brandId: string) => {
    setBlockedBrands(prev =>
      prev.includes(brandId) ? prev.filter(id => id !== brandId) : [...prev, brandId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !companyId) return;
    
    // Validar se o companyId é um UUID válido (formato básico)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(companyId)) {
      console.error("ID da empresa inválido:", companyId);
      alert("Erro de sessão: ID da empresa inválido. Por favor, saia e entre novamente.");
      return;
    }

    setLoading(true);
    try {
      const dataToSave: any = {
        nome: formData.nome,
        codigo_vinculo: formData.codigo_vinculo,
        codigo_cliente: formData.codigo_cliente,
        senha: formData.senha,
        whatsapp: formData.whatsapp,
        ativo: formData.ativo,
        company_id: companyId,
        marcas_liberadas: seller?.marcas_liberadas || [],
        marcas_bloqueadas: blockedBrands,
        comissao: formData.comissao || 0,
        comissao_por_marca: comissaoPorMarca,
      };

      if (seller?.id) {
        // Validar se o seller.id é um UUID válido
        if (!uuidRegex.test(seller.id)) {
          console.error("ID do vendedor inválido:", seller.id);
          alert("Erro de sistema: ID do vendedor inválido. Por favor, recarregue a página.");
          return;
        }
        const { error } = await supabase.from('sellers').update(dataToSave).eq('id', seller.id);
        if (error) {
          if (error.message.includes('invalid input syntax for type uuid')) {
            throw new Error("O campo 'Código para Clientes' deve ser texto, mas o banco espera um ID (UUID). Por favor, use apenas letras e números ou execute o script de correção.");
          }
          throw error;
        }
        onSave();
        onClose();
      } else {
        const result = await createSeller(dataToSave);
        if (result.success && result.seller) {
          setCreatedSeller(result.seller);
          // Don't call onSave() yet, let the user see the credentials
        } else {
          if (result.message?.includes('invalid input syntax for type uuid')) {
            throw new Error("O campo 'Código para Clientes' deve ser texto, mas o banco espera um ID (UUID). Por favor, use apenas letras e números ou execute o script de correção.");
          }
          throw new Error(result.message || 'Erro ao criar vendedor');
        }
      }
    } catch (error: any) {
      console.error('Erro ao salvar vendedor:', error);
      alert('Erro ao salvar vendedor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!createdSeller) return;
    const text = `*Acesso VendPro*\n\nCódigo de Vínculo: ${createdSeller.codigo_vinculo}\nSenha: ${createdSeller.senha}\n\nBaixe o app e entre com esses dados!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdSeller) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Check size={32} strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Vendedor Criado!</h2>
            <p className="text-sm text-slate-500 mt-1">Compartilhe as credenciais de acesso abaixo com o vendedor.</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Código de Vínculo</p>
              <p className="text-2xl font-black text-primary tracking-wider uppercase">{createdSeller.codigo_vinculo}</p>
            </div>
            <div className="h-px bg-slate-200 w-12 mx-auto" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Senha de Acesso</p>
              <p className="text-2xl font-black text-slate-700 tracking-widest">{createdSeller.senha}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={copyToClipboard} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado!' : 'Copiar para WhatsApp'}
            </button>
            <button onClick={() => { onSave(); onClose(); }} className="w-full py-3.5 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">

        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">{seller ? 'Editar Vendedor' : 'Novo Vendedor'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="seller-form" onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome do Vendedor</label>
              <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Ex: João Silva"
                value={formData.nome || ''}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Código de Acesso</label>
              <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-mono uppercase"
                placeholder="Deixe vazio para gerar automático"
                value={formData.codigo_vinculo || ''}
                onChange={e => setFormData({ ...formData, codigo_vinculo: e.target.value.toUpperCase() })} />
              <p className="text-[10px] text-slate-400">Código de acesso do vendedor ao sistema.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Senha de Acesso</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-mono"
                  placeholder="Deixe vazio para gerar automático"
                  value={formData.senha || ''}
                  onChange={e => setFormData({ ...formData, senha: e.target.value })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">Senha para o vendedor entrar no app.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase text-primary">Código para Clientes</label>
              <input className="w-full p-3 bg-slate-50 border border-primary/20 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-primary uppercase"
                placeholder="Ex: JOAOLINK"
                value={formData.codigo_cliente || ''}
                onChange={e => setFormData({ ...formData, codigo_cliente: e.target.value.toUpperCase() })} />
              <p className="text-[10px] text-slate-400">Usado pelos clientes para se vincular a este vendedor.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp</label>
              <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="(00) 00000-0000"
                value={formData.whatsapp || ''}
                onChange={e => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Percent size={12} /> Comissão (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700"
                  placeholder="Ex: 5.00"
                  value={formData.comissao ?? ''}
                  onChange={e => setFormData({ ...formData, comissao: parseFloat(e.target.value) || 0 })}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
              </div>
              <p className="text-[10px] text-slate-400">Percentual de comissão sobre os pedidos finalizados.</p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="checkbox" id="ativo" className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                checked={formData.ativo ?? true}
                onChange={e => setFormData({ ...formData, ativo: e.target.checked })} />
              <label htmlFor="ativo" className="font-medium text-slate-700 cursor-pointer select-none">Vendedor Ativo</label>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Ban size={14} className="text-rose-400" />
                  <span>Marcas que o vendedor <span className="text-rose-500">NÃO</span> trabalha</span>
                </label>
                <p className="text-[10px] text-slate-400 mt-1">Marque as marcas a bloquear. Elas ficam ocultas para ele e seus clientes.</p>
              </div>

              {loadingBrands ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                  <Loader2 size={16} className="animate-spin" /> Carregando marcas...
                </div>
              ) : brands.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-2">Nenhuma marca cadastrada.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {brands.map(brand => {
                    const isBlocked = blockedBrands.includes(brand.id);
                    const comissaoValor = comissaoPorMarca[brand.id] ?? '';
                    return (
                      <div key={brand.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isBlocked ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 accent-rose-500 shrink-0"
                          checked={isBlocked}
                          onChange={() => toggleBrand(brand.id)}
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {brand.logo_url && (
                            <img src={brand.logo_url} alt={brand.name} className="w-6 h-6 rounded object-contain bg-white p-0.5 border border-slate-100 shrink-0" />
                          )}
                          <span className={`text-sm font-medium truncate ${isBlocked ? 'text-rose-600 line-through' : 'text-slate-700'}`}>{brand.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder={String(formData.comissao ?? 0)}
                            value={comissaoValor}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              setComissaoPorMarca(prev => {
                                const next = { ...prev };
                                if (isNaN(val)) {
                                  delete next[brand.id];
                                } else {
                                  next[brand.id] = val;
                                }
                                return next;
                              });
                            }}
                            className="w-16 p-1.5 text-xs text-center bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 font-bold text-slate-700"
                          />
                          <span className="text-xs text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">
            Cancelar
          </button>
          <button type="submit" form="seller-form" disabled={loading}
            className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {loading ? 'Salvando...' : 'Salvar Vendedor'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
