import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../integrations/supabaseClient';
import { Settings, Building2, Phone, Mail, FileText, Save, Loader2, User, Shield, LogOut, Upload, Image as ImageIcon, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';

export default function Configuracoes({ companyId, user, role, onLogout }: { companyId: string | null, user: any, role: string | null, onLogout: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({ nome: '', cnpj: '', email: '', senha: '', logo_url: '', primary_color: '#0072FF', whatsapp: '', codigo_cliente: '' });

  const safeLS = {
    get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} }
  };

  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;
      if (role === 'company' && companyId) {
        const { data } = await supabase.from('companies').select('*').eq('id', companyId).single();
        if (data) setFormData({ nome: data.nome || '', cnpj: data.cnpj || '', email: data.email || '', senha: data.senha || '', logo_url: data.logo_url || safeLS.get(`vendpro_company_logo_${companyId}`) || '', primary_color: data.primary_color || safeLS.get(`vendpro_company_color_${companyId}`) || '#0072FF', whatsapp: '', codigo_cliente: '' });
      } else if (role === 'seller' && user?.id) {
        const { data } = await supabase.from('sellers').select('*').eq('id', user.id).single();
        if (data) setFormData({ nome: data.nome || '', cnpj: '', email: '', senha: '', logo_url: '', primary_color: '', whatsapp: data.whatsapp || '', codigo_cliente: data.codigo_cliente || '' });
      }
      setLoading(false);
    }
    fetchData();
  }, [companyId, role, user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    if (role === 'company' && companyId) {
      if (formData.logo_url) safeLS.set(`vendpro_company_logo_${companyId}`, formData.logo_url);
      if (formData.primary_color) { safeLS.set(`vendpro_company_color_${companyId}`, formData.primary_color); document.documentElement.style.setProperty('--vendpro-primary', formData.primary_color); }
      const { error } = await supabase.from('companies').update({ nome: formData.nome, cnpj: formData.cnpj, email: formData.email, senha: formData.senha, logo_url: formData.logo_url, primary_color: formData.primary_color }).eq('id', companyId);
      if (error) alert('Erro: ' + error.message); else alert('Configurações salvas!');
    } else if (role === 'seller' && user?.id) {
      const { error } = await supabase.from('sellers').update({ nome: formData.nome, whatsapp: formData.whatsapp, codigo_cliente: formData.codigo_cliente }).eq('id', user.id);
      if (error) alert('Erro: ' + error.message); else alert('Dados atualizados!');
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error('Cloudinary não configurado');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) setFormData(prev => ({ ...prev, logo_url: data.secure_url }));
      else throw new Error(data.error?.message || 'Erro no upload');
    } catch (error: any) { alert('Erro no upload: ' + error.message); }
    finally { setUploadingLogo(false); }
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[300px]">
      <Loader2 className="animate-spin text-primary" size={24} />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
          <Settings size={16} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">Minha Conta</h1>
          <p className="text-xs text-slate-400">Configurações e dados de acesso</p>
        </div>
      </div>

      {/* Account info card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Logo / avatar */}
        {role === 'company' && (
          <div className="flex items-center gap-4 p-4 border-b border-slate-100">
            <div
              className="relative w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 cursor-pointer group shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 size={24} className="text-slate-300" />
              )}
              <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                {uploadingLogo ? <Loader2 className="animate-spin text-white" size={16} /> : <Upload className="text-white" size={16} />}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 uppercase">{formData.nome || 'Empresa'}</p>
              <p className="text-xs text-slate-400">Clique no logo para alterar</p>
            </div>
          </div>
        )}

        {/* User + role info */}
        <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100">
          <div className="flex items-center gap-2.5 p-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
              <User size={14} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Usuário</p>
              <p className="text-xs font-black text-slate-900 uppercase truncate">{user?.nome || user?.empresa || user?.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 shrink-0">
              <Shield size={14} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Acesso</p>
              <p className="text-xs font-black text-slate-900 uppercase">{role === 'company' ? 'Administrador' : role === 'seller' ? 'Vendedor' : 'Cliente'}</p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2 bg-white text-rose-500 border border-rose-100 rounded-lg text-xs font-bold hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all">
            <LogOut size={13} strokeWidth={2.5} /> Sair da Conta
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <User size={12} className="text-primary" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {role === 'company' ? 'Dados da Empresa' : 'Dados Profissionais'}
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                {role === 'company' ? 'Nome Fantasia' : 'Nome Completo'}
              </label>
              <div className="relative">
                <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary/40" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
            </div>

            {role === 'company' && (
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">CNPJ</label>
                <div className="relative">
                  <FileText size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary/40" value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: e.target.value })} />
                </div>
              </div>
            )}

            {role === 'company' && (
              <div className="sm:col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">E-mail</label>
                <div className="relative">
                  <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="email" className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary/40" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                </div>
              </div>
            )}

            {role === 'seller' && (
              <>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">WhatsApp</label>
                  <div className="relative">
                    <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary/40" value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 block">Código para Clientes</label>
                  <div className="relative">
                    <Shield size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" />
                    <input className="w-full pl-8 pr-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs font-black text-primary uppercase outline-none focus:border-primary/40" value={formData.codigo_cliente} onChange={e => setFormData({ ...formData, codigo_cliente: e.target.value.toUpperCase() })} placeholder="EX: MEULINK01" required />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Password (company only) */}
        {role === 'company' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Lock size={12} className="text-amber-500" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Segurança</span>
            </div>
            <div className="p-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nova Senha</label>
              <div className="relative">
                <Shield size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type={showPassword ? 'text' : 'password'} className="w-full pl-8 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary/40" value={formData.senha} onChange={e => setFormData({ ...formData, senha: e.target.value })} placeholder="Deixe em branco para manter" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors">
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </form>
    </motion.div>
  );
}
