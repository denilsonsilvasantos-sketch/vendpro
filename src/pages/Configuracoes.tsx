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
      className="p-4 md:p-8 space-y-12 max-w-5xl mx-auto pb-32"
    >
      {/* Profile Header Section */}
      <div className="flex flex-col items-center text-center space-y-8 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -z-10" />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          className={`relative group ${role === 'company' ? 'cursor-pointer' : ''}`} 
          onClick={() => role === 'company' && fileInputRef.current?.click()}
        >
          <div className="w-48 h-48 bg-white rounded-[56px] flex items-center justify-center text-primary border-[12px] border-white shadow-2xl overflow-hidden relative group-hover:scale-105 transition-all duration-500 hover:shadow-primary/20">
            {formData.logo_url ? (
              <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            ) : (
              <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200">
                <Building2 size={80} strokeWidth={1.5} />
              </div>
            )}
            
            {role === 'company' && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                {uploadingLogo ? (
                  <Loader2 className="animate-spin text-white" size={40} strokeWidth={3} />
                ) : (
                  <>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-xl border border-white/30">
                      <Upload className="text-white" size={28} strokeWidth={2.5} />
                    </div>
                    <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Alterar Logo</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {role === 'company' && (
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="absolute -bottom-2 -right-2 w-16 h-16 bg-primary text-white rounded-[24px] flex items-center justify-center shadow-2xl border-[6px] border-white group-hover:shadow-primary/40 transition-all"
            >
              <ImageIcon size={24} strokeWidth={2.5} />
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

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="text-primary animate-pulse" size={20} />
            <h1 className="text-5xl font-black text-slate-900 tracking-tight uppercase">Minha Conta</h1>
            <Sparkles className="text-primary animate-pulse" size={20} />
          </div>
          <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
            Gerencie as informações da sua empresa, preferências de estilo e dados de acesso para uma experiência personalizada.
          </p>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden group">
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="flex items-center gap-6 p-6 rounded-[32px] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group/item">
            <div className="w-16 h-16 bg-white rounded-[22px] flex items-center justify-center text-primary shadow-inner border border-slate-100 group-hover/item:scale-110 transition-transform">
              <User size={32} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Usuário Logado</p>
              <p className="font-black text-slate-900 text-xl tracking-tight uppercase">{user?.nome || user?.empresa || user?.email || 'Usuário'}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 p-6 rounded-[32px] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group/item">
            <div className="w-16 h-16 bg-white rounded-[22px] flex items-center justify-center text-indigo-500 shadow-inner border border-slate-100 group-hover/item:scale-110 transition-transform">
              <Shield size={32} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Nível de Acesso</p>
              <p className="font-black text-slate-900 text-xl tracking-tight uppercase">{role === 'company' ? 'Administrador' : role === 'seller' ? 'Vendedor' : 'Cliente'}</p>
            </div>
          </div>
        </div>

        <div className="p-10 bg-slate-50/80 border-t border-slate-100 flex justify-center">
          <button 
            onClick={onLogout}
            className="w-full max-w-md flex items-center justify-center gap-4 py-6 bg-white text-rose-500 border border-rose-100 rounded-[28px] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-rose-200/20 hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:shadow-rose-500/30 transition-all active:scale-95 group/logout"
          >
            <LogOut size={20} strokeWidth={3} className="group-hover/logout:-translate-x-1 transition-transform" />
            Sair da Conta com Segurança
          </button>
        </div>
      </div>

      {role === 'seller' && (
        <form onSubmit={handleSave} className="space-y-12">
          <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-3 h-full bg-slate-50 group-hover:bg-primary transition-colors duration-500" />
            
            <div className="p-10 border-b border-slate-50 flex items-center gap-5">
              <div className="w-12 h-12 bg-primary/10 rounded-[18px] flex items-center justify-center text-primary shadow-inner">
                <User size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Dados Profissionais</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Informações visíveis para seus clientes</p>
              </div>
            </div>
            
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nome Completo</label>
                <div className="relative group/input">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={20} strokeWidth={2.5} />
                  <input 
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-sm" 
                    value={formData.nome} 
                    onChange={e => setFormData({...formData, nome: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">WhatsApp de Atendimento</label>
                <div className="relative group/input">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={20} strokeWidth={2.5} />
                  <input 
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-sm" 
                    value={formData.whatsapp} 
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})} 
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-2">Código de Vínculo para Clientes</label>
                <div className="relative group/input">
                  <Shield className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within/input:text-primary transition-colors" size={20} strokeWidth={2.5} />
                  <input 
                    className="w-full pl-14 pr-6 py-6 bg-primary/5 border border-primary/10 rounded-[28px] focus:ring-8 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-primary uppercase tracking-[0.2em] text-lg" 
                    value={formData.codigo_cliente} 
                    onChange={e => setFormData({...formData, codigo_cliente: e.target.value.toUpperCase()})} 
                    placeholder="EX: MEULINK01"
                    required
                  />
                </div>
                <div className="flex items-start gap-3 mt-4 px-2">
                  <AlertCircle size={16} className="text-slate-300 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    Este é o código que seus clientes usarão para se vincular a você. Ele deve ser único, curto e fácil de lembrar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <motion.button 
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={saving}
              className="group bg-slate-900 text-white px-12 py-6 rounded-[32px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-slate-900/30 hover:shadow-slate-900/50 transition-all disabled:opacity-50 flex items-center gap-4"
            >
              {saving ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : <Save size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />}
              {saving ? 'Salvando Alterações...' : 'Salvar Meus Dados'}
            </motion.button>
          </div>
        </form>
      )}

      {role === 'company' && (
        <form onSubmit={handleSave} className="space-y-12">
          {/* Company Data Card */}
          <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-3 h-full bg-slate-50 group-hover:bg-primary transition-colors duration-500" />
            
            <div className="p-10 border-b border-slate-50 flex items-center gap-5">
              <div className="w-12 h-12 bg-primary/10 rounded-[18px] flex items-center justify-center text-primary shadow-inner">
                <Building2 size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Dados da Empresa</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Informações corporativas e de acesso</p>
              </div>
            </div>
            
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nome Fantasia</label>
                <div className="relative group/input">
                  <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={20} strokeWidth={2.5} />
                  <input 
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-sm" 
                    value={formData.nome} 
                    onChange={e => setFormData({...formData, nome: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">CNPJ (Acesso)</label>
                <div className="relative group/input">
                  <FileText className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={20} strokeWidth={2.5} />
                  <input 
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-sm" 
                    value={formData.cnpj} 
                    onChange={e => setFormData({...formData, cnpj: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">E-mail de Recuperação</label>
                <div className="relative group/input">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={20} strokeWidth={2.5} />
                  <input 
                    type="email"
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-sm" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    required
                    placeholder="exemplo@empresa.com"
                  />
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="p-10 border-t border-slate-50 bg-slate-50/30 space-y-8">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-amber-100 rounded-[18px] flex items-center justify-center text-amber-600 shadow-inner">
                  <Lock size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Segurança</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Altere sua senha de acesso</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nova Senha de Acesso</label>
                <div className="relative group/input">
                  <Shield className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-primary transition-colors" size={20} strokeWidth={2.5} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-14 pr-16 py-5 bg-white border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-slate-700 uppercase tracking-tight text-sm" 
                    value={formData.senha} 
                    onChange={e => setFormData({...formData, senha: e.target.value})} 
                    placeholder="Deixe em branco para manter a atual"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-300 hover:text-primary transition-colors active:scale-90"
                  >
                    {showPassword ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <motion.button 
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={saving}
              className="group bg-slate-900 text-white px-12 py-6 rounded-[32px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-slate-900/30 hover:shadow-slate-900/50 transition-all disabled:opacity-50 flex items-center gap-4"
            >
              {saving ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : <Save size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />}
              {saving ? 'Salvando Alterações...' : 'Salvar Configurações'}
            </motion.button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
