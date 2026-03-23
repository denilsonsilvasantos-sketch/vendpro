import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Send, Loader2, TrendingUp, Sparkles, ChevronDown } from 'lucide-react';
import { supabase } from '../integrations/supabaseClient';
import { querySalesInsights } from '../services/aiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SalesData {
  nome: string;
  sku: string;
  total_qtd: number;
  total_valor: number;
}

const SUGGESTIONS = [
  'Quais produtos mais vendem?',
  'Qual o produto com maior receita?',
  'Quais produtos vendem menos?',
  'Me dê um resumo das vendas',
];

export default function SalesAIChat({ companyId, role }: { companyId: string | null; role?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<SalesData[] | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function loadSalesData() {
    if (!supabase || !companyId || salesData !== null) return;
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('product_id, nome, sku, quantidade, subtotal, order_id')
        .not('order_id', 'is', null);

      if (data) {
        const orderIds = [...new Set(data.map((d: any) => d.order_id))];
        const { data: orders } = await supabase
          .from('orders')
          .select('id')
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .in('id', orderIds);

        const validOrderIds = new Set((orders || []).map((o: any) => o.id));
        const filtered = data.filter((d: any) => validOrderIds.has(d.order_id));

        const grouped = filtered.reduce((acc: Record<string, SalesData>, item: any) => {
          const key = item.product_id;
          if (!acc[key]) {
            acc[key] = { nome: item.nome, sku: item.sku, total_qtd: 0, total_valor: 0 };
          }
          acc[key].total_qtd += item.quantidade;
          acc[key].total_valor += Number(item.subtotal);
          return acc;
        }, {});

        const sorted = Object.values(grouped).sort((a, b) => b.total_valor - a.total_valor);
        setSalesData(sorted);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de vendas:', err);
      setSalesData([]);
    } finally {
      setLoadingData(false);
    }
  }

  function handleOpen() {
    setIsOpen(true);
    loadSalesData();
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Olá! Sou sua assistente de vendas. Posso analisar os dados de pedidos e responder perguntas como "quais produtos mais vendem?" ou "qual a receita por categoria?". O que deseja saber?',
      }]);
    }
  }

  async function handleSend(text?: string) {
    const question = (text || input).trim();
    if (!question || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = salesData || [];
      const answer = await querySalesInsights(question, data);
      setMessages(prev => [...prev, { id: Date.now().toString() + '_ai', role: 'assistant', content: answer }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: Date.now().toString() + '_err', role: 'assistant', content: `Erro: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  if (role !== 'seller' && role !== 'company') return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-100 flex flex-col overflow-hidden"
            style={{ maxHeight: '70vh' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C21863, #E8257A)' }}>
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Assistente de Vendas</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {loadingData ? 'Carregando dados...' : salesData ? `${salesData.length} produtos analisados` : 'IA'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5" style={{ background: 'linear-gradient(135deg, #C21863, #E8257A)' }}>
                      <Bot size={12} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm font-medium'
                      : 'bg-slate-100 text-slate-700 rounded-bl-sm font-medium'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #C21863, #E8257A)' }}>
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className="bg-slate-100 px-3 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-primary" />
                    <span className="text-xs text-slate-400 font-medium">Analisando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-[10px] font-bold text-primary bg-primary/5 border border-primary/20 px-2.5 py-1 rounded-full hover:bg-primary/10 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 pb-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Pergunte sobre suas vendas..."
                  className="flex-1 bg-transparent text-xs font-medium text-slate-700 outline-none placeholder:text-slate-300"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="w-7 h-7 flex items-center justify-center rounded-xl text-white disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg, #C21863, #E8257A)' }}
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleOpen}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center text-white"
        style={{ background: 'linear-gradient(135deg, #C21863, #E8257A)' }}
        title="Assistente de Vendas IA"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <ChevronDown size={24} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
