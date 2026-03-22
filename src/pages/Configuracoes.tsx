import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../integrations/supabaseClient';
import { Settings, Building2, Phone, Mail, FileText, Save, Loader2, User, Shield, Calendar, LogOut, Upload, Image as ImageIcon, Palette, Eye, EyeOff, Lock, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Configuracoes({ companyId, user, role, onLogout }: { companyId: string | null, user: any, role: string | null, onLogout: () => void }) {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    senha: '',
    logo_url: '',
    primary_color: '#0072FF',
    whatsapp: '',
    codigo_cliente: ''
  });

  const safeLocalStorage = {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;
      
      if (role === 'company' && companyId !== null) {
        const { data } = await supabase.from('companies').select('*').eq('id', companyId).single();
        if (data) {
          setCompany(data);
          const savedLogo = safeLocalStorage.getItem(`vendpro_company_logo_${companyId}`);
          const savedColor = safeLocalStorage.getItem(`vendpro_company_color_${companyId}`);
          setFormData({
            nome: data.nome || '',
            cnpj: data.cnpj || '',
            email: data.email || '',
            senha: data.senha || '',
            logo_url: data.logo_url || savedLogo || '',
            primary_color: data.primary_color || savedColor || '#0072FF',
            whatsapp: '',
            codigo_cliente: ''
          });
        }
      } else if (role === 'seller' && user?.id) {
        const { data } = await supabase.from('sellers').select('*').eq('id', user.id).single();
        if (data) {
          setFormData({
            nome: data.nome || '',
            cnpj: '',
            email: '',
            senha: '',
            logo_url: '',
            primary_color: '',
            whatsapp: data.whatsapp || '',
            codigo_cliente: data.codigo_cliente || ''
          });
        }
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
      // Save locally as fallback
      if (formData.logo_url) {
        safeLocalStorage.setItem(`vendpro_company_logo_${companyId}`, formData.logo_url);
      }
      if (formData.primary_color) {
        safeLocalStorage.setItem(`vendpro_company_color_${companyId}`, formData.primary_color);
        document.documentElement.style.setProperty('--vendpro-primary', formData.primary_color);
      }

      const { error } = await supabase.from('companies').update({
        nome: formData.nome,
        cnpj: formData.cnpj,
        email: formData.email,
        senha: formData.senha,
        logo_url: formData.logo_url,
        primary_color: formData.primary_color
      }).eq('id', companyId);

      if (error) {
        // ... existing error handling ...
        alert('Erro ao salvar configurações: ' + error.message);
      } else {
        alert('Configurações salvas com sucesso!');
      }
    } else if (role === 'seller' && user?.id) {
      const { error } = await supabase.from('sellers').update({
        nome: formData.nome,
        whatsapp: formData.whatsapp,
        codigo_cliente: formData.codigo_cliente
      }).eq('id', user.id);

      if (error) {
        alert('Erro ao salvar seus dados: ' + error.message);
      } else {
        alert('Seus dados foram atualizados com sucesso!');
      }
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
      
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Cloudinary cloud name não configurado");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, logo_url: data.secure_url }));
      } else {
        throw new Error(data.error?.message || 'Erro no upload');
      }
    } catch (error: any) {
      console.error('Erro no upload da logo:', error);
      alert('Erro ao fazer upload da logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[600px] space-y-6">
      <div className="relative">
        <Loader2 className="animate-spin text-primary" size={64} strokeWidth={2.5} />
        <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse rounded-full" />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Carregando Configurações</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 md:p-4 space-y-6 max-w-4xl mx-auto pb-24"
    >
      {/* Profile Header Section */}
      <div className="flex flex-col items-center text-center space-y-4 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/5 blur-[60px] rounded-full -z-10" />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          className={`relative group ${role === 'company' ? 'cursor-pointer' : ''}`} 
          onClick={() => role === 'company' && fileInputRef.current?.click()}
        >
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-primary border-4 border-white shadow-lg overflow-hidden relative group-hover:scale-105 transition-all duration-500">
            {formData.logo_url ? (
              <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            ) : (
              <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200">
                <Building2 size={32} strokeWidth={1.5} />
              </div>
            )}
            
            {role === 'company' && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                {uploadingLogo ? (
                  <Loader2 className="animate-spin text-white" size={20} strokeWidth={3} />
                ) : (
                  <Upload className="text-white" size={16} strokeWidth={2.5} />
                )}
              </div>
            )}
          </div>
          
          {role === 'company' && (
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white"
            >
              <ImageIcon size={12} strokeWidth={2.5} />
            </motion.div>
          )}

          {role === 'company' && (
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLogoUpload} 
              accept="image/*" 
              className="hidden" 
            />
          )}
        </motion.div>

        <div className="flex items-center justify-center gap-2">
          <Settings className="text-primary" size={20} />
          <h1 className="text-base font-black text-slate-900 tracking-tight uppercase">Minha Conta</h1>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 border border-slate-100 h-[52px]">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm border border-slate-100">
              <User size={16} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">Usuário Logado</p>
              <p className="font-black text-slate-900 text-[11px] tracking-tight uppercase truncate">{user?.nome || user?.empresa || user?.email || 'Usuário'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 border border-slate-100 h-[52px]">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100">
              <Shield size={16} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">Nível de Acesso</p>
              <p className="font-black text-slate-900 text-[11px] tracking-tight uppercase truncate">{role === 'company' ? 'Administrador' : role === 'seller' ? 'Vendedor' : 'Cliente'}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex justify-center">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-rose-500 border border-rose-100 rounded-xl font-black uppercase tracking-wider text-[9px] shadow-sm hover:bg-rose-500 hover:text-white transition-all active:scale-95"
          >
            <LogOut size={14} strokeWidth={3} />
            Sair da Conta
          </button>
        </div>
      </div>

      {role === 'seller' && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-50 group-hover:bg-primary transition-colors duration-500" />
            
            <div className="p-4 border-b border-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <User size={16} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">Dados Profissionais</h2>
              </div>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Nome Completo</label>
                <div className="relative group/input">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={14} strokeWidth={2.5} />
                  <input 
                    className="w-full pl-9 pr-3 h-9 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-[11px]" 
                    value={formData.nome} 
                    onChange={e => setFormData({...formData, nome: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">WhatsApp</label>
                <div className="relative group/input">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={14} strokeWidth={2.5} />
                  <input 
                    className="w-full pl-9 pr-3 h-9 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-[11px]" 
                    value={formData.whatsapp} 
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})} 
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[9px] font-black text-primary uppercase tracking-wider ml-1">Código de Vínculo</label>
                <div className="relative group/input">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within/input:text-primary transition-colors" size={14} strokeWidth={2.5} />
                  <input 
                    className="w-full pl-9 pr-3 h-10 bg-primary/5 border border-primary/10 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-primary uppercase tracking-wider text-sm" 
                    value={formData.codigo_cliente} 
                    onChange={e => setFormData({...formData, codigo_cliente: e.target.value.toUpperCase()})} 
                    placeholder="EX: MEULINK01"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={saving}
              className="group bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-wider text-[9px] shadow-lg hover:shadow-slate-900/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={14} strokeWidth={3} /> : <Save size={14} strokeWidth={3} />}
              {saving ? 'Salvando...' : 'Salvar Meus Dados'}
            </motion.button>
          </div>
        </form>
      )}

      {role === 'company' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Company Data Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-50 group-hover:bg-primary transition-colors duration-500" />
            
            <div className="p-4 border-b border-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <Building2 size={16} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">Dados da Empresa</h2>
              </div>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Nome Fantasia</label>
                <div className="relative group/input">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={14} strokeWidth={2.5} />
                  <input 
                    className="w-full pl-9 pr-3 h-9 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-[11px]" 
                    value={formData.nome} 
                    onChange={e => setFormData({...formData, nome: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">CNPJ</label>
                <div className="relative group/input">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={14} strokeWidth={2.5} />
                  <input 
                    className="w-full pl-9 pr-3 h-9 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-[11px]" 
                    value={formData.cnpj} 
                    onChange={e => setFormData({...formData, cnpj: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">E-mail</label>
                <div className="relative group/input">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={14} strokeWidth={2.5} />
                  <input 
                    type="email"
                    className="w-full pl-9 pr-3 h-9 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-[11px]" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="p-4 border-t border-slate-50 bg-slate-50/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                  <Lock size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">Segurança</h2>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Nova Senha</label>
                <div className="relative group/input">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={14} strokeWidth={2.5} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-9 pr-10 h-9 bg-white border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-[11px]" 
                    value={formData.senha} 
                    onChange={e => setFormData({...formData, senha: e.target.value})} 
                    placeholder="Manter atual"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} strokeWidth={2.5} /> : <Eye size={14} strokeWidth={2.5} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={saving}
              className="group bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-wider text-[9px] shadow-lg hover:shadow-slate-900/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={14} strokeWidth={3} /> : <Save size={14} strokeWidth={3} />}
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </motion.button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
