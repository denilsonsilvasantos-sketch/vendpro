import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Shield, Lock, Info, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function CollapsibleSection({ title, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-3">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{title}</span>
        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 text-[11px] text-slate-600 leading-relaxed space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LegalPage({ initialTab = 'privacy' }: { initialTab?: 'privacy' | 'lgpd' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const goBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Fixed Warning Banner */}
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-start gap-2 sticky top-0 z-[110]">
        <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[9px] font-black text-amber-700 uppercase tracking-tight leading-tight">
          O VendPro é uma plataforma de orçamentos. Nenhuma venda é efetivada diretamente. Os catálogos não refletem estoque em tempo real.
        </p>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-4 sticky top-[41px] z-[100]">
        <button onClick={goBack} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">
          {activeTab === 'privacy' ? 'Política de Privacidade' : 'LGPD'}
        </h1>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-4 flex items-center gap-6">
        <button 
          onClick={() => setActiveTab('privacy')}
          className={`py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'privacy' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}
        >
          Privacidade
        </button>
        <button 
          onClick={() => setActiveTab('lgpd')}
          className={`py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'lgpd' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}
        >
          LGPD
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {activeTab === 'privacy' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Lock size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Privacidade</h2>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Sua segurança é nossa prioridade</p>
              </div>
            </div>

            <CollapsibleSection title="1. Coleta de Dados">
              <p>Coletamos informações básicas necessárias para o funcionamento da plataforma, como nome, e-mail, telefone e dados de empresa (CNPJ) para fins de identificação e facilitação de orçamentos.</p>
              <p>Também coletamos dados de navegação e interação com os catálogos para melhorar a experiência do usuário e fornecer métricas para as empresas parceiras.</p>
            </CollapsibleSection>

            <CollapsibleSection title="2. Uso das Informações">
              <p>As informações coletadas são utilizadas para:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Processar e gerenciar orçamentos via WhatsApp;</li>
                <li>Personalizar sua experiência nos catálogos;</li>
                <li>Comunicar atualizações importantes do sistema;</li>
                <li>Garantir a segurança e integridade da sua conta.</li>
              </ul>
            </CollapsibleSection>

            <CollapsibleSection title="3. Compartilhamento">
              <p>Seus dados de identificação e itens do carrinho são compartilhados com o vendedor ou empresa responsável pelo catálogo no momento em que você solicita um orçamento.</p>
              <p>Não vendemos seus dados para terceiros. O compartilhamento ocorre apenas para a finalidade comercial do orçamento solicitado.</p>
            </CollapsibleSection>

            <CollapsibleSection title="4. Segurança">
              <p>Utilizamos tecnologias de ponta e protocolos de segurança (SSL/TLS) para proteger seus dados contra acesso não autorizado, alteração ou destruição.</p>
              <p>Seus dados são armazenados em servidores seguros com controle de acesso rigoroso.</p>
            </CollapsibleSection>

            <CollapsibleSection title="5. Seus Direitos">
              <p>Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento através das configurações da sua conta ou entrando em contato com nosso suporte.</p>
            </CollapsibleSection>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">LGPD</h2>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Lei Geral de Proteção de Dados</p>
              </div>
            </div>

            <CollapsibleSection title="1. O que é a LGPD">
              <p>A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) estabelece regras sobre como os dados pessoais de cidadãos brasileiros devem ser tratados por empresas e órgãos públicos.</p>
              <p>O VendPro está totalmente comprometido com a conformidade desta lei, garantindo transparência e controle sobre seus dados.</p>
            </CollapsibleSection>

            <CollapsibleSection title="2. Bases Legais">
              <p>Tratamos seus dados baseados principalmente em:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Execução de Contrato:</strong> Para fornecer os serviços de catálogo e orçamento;</li>
                <li><strong>Legítimo Interesse:</strong> Para melhoria contínua do sistema e segurança;</li>
                <li><strong>Consentimento:</strong> Quando solicitado explicitamente para comunicações de marketing.</li>
              </ul>
            </CollapsibleSection>

            <CollapsibleSection title="3. Direitos do Titular">
              <p>Como titular dos dados, você tem direito a:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Confirmação da existência de tratamento;</li>
                <li>Acesso aos seus dados;</li>
                <li>Correção de dados incompletos ou inexatos;</li>
                <li>Eliminação de dados desnecessários;</li>
                <li>Portabilidade dos dados.</li>
              </ul>
            </CollapsibleSection>

            <CollapsibleSection title="4. Encarregado de Dados (DPO)">
              <p>Para qualquer questão relacionada à proteção de seus dados, você pode entrar em contato com nosso Encarregado de Dados através do e-mail: dpo@vendpro.com.br</p>
            </CollapsibleSection>

            <CollapsibleSection title="5. Como exercer seus direitos">
              <p>Você pode solicitar informações ou exercer seus direitos enviando uma mensagem para nosso suporte ou através do painel de configurações da sua conta.</p>
            </CollapsibleSection>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-8 text-center border-t border-slate-100 bg-white">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 blue-gradient rounded-lg flex items-center justify-center text-white">
            <Shield size={12} />
          </div>
          <span className="text-xs font-black text-slate-900 uppercase tracking-tight">VendPro Legal</span>
        </div>
        <p className="text-[10px] text-slate-400 font-medium max-w-xs mx-auto">
          Este documento foi atualizado pela última vez em 22 de Março de 2026.
        </p>
      </footer>
    </div>
  );
}
