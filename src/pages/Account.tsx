import React, { useState } from 'react';
import { User, Mail, Shield, Calendar, LogOut, Link as LinkIcon, Check } from 'lucide-react';
import Configuracoes from './Configuracoes';

export default function Account({ user, role, companyId, onLogout }: { user: any, role: string | null, companyId: string | null, onLogout: () => void }) {
  const [copied, setCopied] = useState(false);

  if (!user) return <div className="p-6">Carregando...</div>;

  const handleCopyLink = () => {
    if (user.codigo_vinculo) {
      const link = `${window.location.origin}?vincular=${user.codigo_vinculo}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary border-4 border-white shadow-xl">
          <User size={48} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Minha Conta</h1>
          <p className="text-slate-500">Gerencie suas informações de perfil</p>
        </div>
      </div>

      {(role === 'company' || role === 'admin') && companyId ? (
        <div className="mb-8">
          <Configuracoes companyId={companyId} />
        </div>
      ) : null}

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden max-w-2xl mx-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
              <Mail size={24} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome</p>
              <p className="font-bold text-slate-900">{user.nome || user.empresa || user.email || 'Usuário'}</p>
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

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
              <Calendar size={24} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Membro desde</p>
              <p className="font-bold text-slate-900">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
              </p>
            </div>
          </div>

          {role === 'seller' && user.codigo_vinculo && (
            <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <LinkIcon size={24} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link para Clientes</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-slate-50 px-3 py-1.5 rounded-lg text-sm font-mono text-slate-600 truncate max-w-[200px] sm:max-w-xs border border-slate-100">
                    {`${window.location.origin}?vincular=${user.codigo_vinculo}`}
                  </code>
                  <button 
                    onClick={handleCopyLink}
                    className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm"
                    title="Copiar Link"
                  >
                    {copied ? <Check size={16} /> : <LinkIcon size={16} />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Envie este link para seus clientes. Eles serão vinculados automaticamente a você.
                </p>
              </div>
            </div>
          )}
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

      <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex gap-4">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
          <Shield size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900">Segurança dos Dados</h4>
          <p className="text-sm text-amber-700 leading-relaxed">
            Suas informações estão protegidas por criptografia de ponta a ponta. 
            Nunca compartilhe sua senha com terceiros.
          </p>
        </div>
      </div>
    </div>
  );
}
