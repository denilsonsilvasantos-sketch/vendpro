import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Settings, Building2, Phone, Mail, FileText, Save, Loader2, User, Shield, Calendar, LogOut, Upload, Image as ImageIcon, Palette } from 'lucide-react';

export default function Configuracoes({ companyId, user, role, onLogout }: { companyId: string | null, user: any, role: string | null, onLogout: () => void }) {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    senha: '',
    logo_url: '',
    primary_color: '#0072FF'
  });

  useEffect(() => {
    async function fetchCompany() {
      if (!supabase || companyId === null) return;
      const { data } = await supabase.from('companies').select('*').eq('id', companyId).single();
      if (data) {
        setCompany(data);
        const savedLogo = localStorage.getItem(`vendpro_company_logo_${companyId}`);
        const savedColor = localStorage.getItem(`vendpro_company_color_${companyId}`);
        setFormData({
          nome: data.nome || '',
          cnpj: data.cnpj || '',
          senha: data.senha || '',
          logo_url: data.logo_url || savedLogo || '',
          primary_color: data.primary_color || savedColor || '#0072FF'
        });
      }
      setLoading(false);
    }
    fetchCompany();
  }, [companyId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !companyId) return;
    setSaving(true);
    
    // Create a copy of formData and remove fields that might not be in the DB yet
    const dataToSave = { ...formData };
    
    // Save locally as fallback
    if (formData.logo_url) {
      localStorage.setItem(`vendpro_company_logo_${companyId}`, formData.logo_url);
    }
    if (formData.primary_color) {
      localStorage.setItem(`vendpro_company_color_${companyId}`, formData.primary_color);
      document.documentElement.style.setProperty('--vendpro-primary', formData.primary_color);
    }

    const { error } = await supabase.from('companies').update({
      nome: formData.nome,
      cnpj: formData.cnpj,
      senha: formData.senha,
      logo_url: formData.logo_url,
      primary_color: formData.primary_color
    }).eq('id', companyId);

    if (error) {
      // If it fails because columns don't exist, we still have the local storage
      if (error.message.includes('column') || error.message.includes('does not exist')) {
        const { error: retryError } = await supabase.from('companies').update({
          nome: formData.nome,
          cnpj: formData.cnpj,
          senha: formData.senha
        }).eq('id', companyId);
        
        if (retryError) {
          alert('Erro ao salvar configurações: ' + retryError.message);
        } else {
          alert('Configurações salvas com sucesso! (Logo e Cor salvos localmente)');
        }
      } else {
        alert('Erro ao salvar configurações: ' + error.message);
      }
    } else {
      alert('Configurações salvas com sucesso!');
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

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center text-primary border-4 border-white shadow-xl overflow-hidden">
            {formData.logo_url ? (
              <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 size={48} />
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingLogo ? <Loader2 className="animate-spin text-white" size={24} /> : <Upload className="text-white" size={24} />}
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleLogoUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Minha Conta</h1>
          <p className="text-slate-500">Gerencie as informações da sua empresa e dados de acesso.</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
              <User size={24} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuário Logado</p>
              <p className="font-bold text-slate-900">{user?.nome || user?.empresa || user?.email || 'Usuário'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
              <Shield size={24} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nível de Acesso</p>
              <p className="font-bold text-slate-900 capitalize">{role || 'Cliente'}</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white text-rose-500 border border-rose-100 rounded-2xl font-bold shadow-sm hover:bg-rose-50 transition-all active:scale-95"
          >
            <LogOut size={20} />
            Sair da Conta
          </button>
        </div>
      </div>

      {role === 'company' && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-3">
              <Building2 className="text-primary" size={20} />
              <h2 className="font-bold text-slate-900">Dados da Empresa</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome da Empresa</label>
                <input 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" 
                  value={formData.nome} 
                  onChange={e => setFormData({...formData, nome: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">CNPJ (Acesso)</label>
                <input 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" 
                  value={formData.cnpj} 
                  onChange={e => setFormData({...formData, cnpj: e.target.value})} 
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Senha de Acesso</label>
                <input 
                  type="password"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" 
                  value={formData.senha} 
                  onChange={e => setFormData({...formData, senha: e.target.value})} 
                  placeholder="Deixe em branco para não alterar"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-50 flex items-center gap-3">
              <Palette className="text-primary" size={20} />
              <h2 className="font-bold text-slate-900">Personalização</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-6">
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cor Predominante do Site</label>
                  <p className="text-xs text-slate-400 mb-2">Esta cor será usada em botões, ícones e destaques.</p>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden" 
                      value={formData.primary_color} 
                      onChange={e => setFormData({...formData, primary_color: e.target.value})} 
                    />
                    <input 
                      type="text" 
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-mono text-sm uppercase" 
                      value={formData.primary_color} 
                      onChange={e => setFormData({...formData, primary_color: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg transition-all" style={{ backgroundColor: formData.primary_color }}>
                  Preview
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={saving}
              className="bg-primary text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
