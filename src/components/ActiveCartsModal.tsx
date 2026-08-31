import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingCart, MessageCircle, Clock, ChevronDown, ChevronUp, Package, Trash2, CheckCircle2, Search, ExternalLink } from 'lucide-react';
import { ActiveCart } from '../types';

interface ActiveCartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCarts: ActiveCart[];
  onRemoveCart: (customerId: string) => void;
}

export default function ActiveCartsModal({
  isOpen,
  onClose,
  activeCarts,
  onRemoveCart
}: ActiveCartsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCartId, setExpandedCartId] = useState<string | null>(null);
  const [selectedMessageTemplate, setSelectedMessageTemplate] = useState<'help' | 'special' | 'reminder'>('help');

  if (!isOpen) return null;

  const filteredCarts = activeCarts.filter(cart => {
    const s = searchTerm.toLowerCase();
    const name = (cart.customer_name || '').toLowerCase();
    const empresa = (cart.customer_empresa || '').toLowerCase();
    const brand = (cart.brand_name || '').toLowerCase();
    const phone = (cart.customer_whatsapp || '').toLowerCase();
    return name.includes(s) || empresa.includes(s) || brand.includes(s) || phone.includes(s);
  });

  const formatTimeAgo = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins === 1) return 'Há 1 minuto';
    if (diffMins < 60) return `Há ${diffMins} minutos`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Há 1 hora';
    if (diffHours < 24) return `Há ${diffHours} horas`;
    return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getWhatsAppMessage = (cart: ActiveCart, template: 'help' | 'special' | 'reminder') => {
    const clientName = cart.customer_name ? cart.customer_name.split(' ')[0] : 'Cliente';
    const brandText = cart.brand_name ? ` da marca *${cart.brand_name}*` : '';
    const totalText = `R$ ${cart.total.toFixed(2)}`;
    const itemsCount = cart.product_count || cart.item_count || 1;

    switch (template) {
      case 'special':
        return `Olá, ${clientName}! Tudo bem?\n\nNotei que você separou ${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}${brandText} no nosso catálogo online (Total: ${totalText}).\n\nConsigo verificar uma condição especial para fecharmos o pedido agora. Posso te ajudar a concluir?`;
      case 'reminder':
        return `Olá, ${clientName}! Passando para avisar que os ${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}${brandText} continuam salvos no seu carrinho (Total: ${totalText}).\n\nDeseja que eu te auxilie na finalização do pedido para garantir suas peças?`;
      case 'help':
      default:
        return `Olá, ${clientName}! Vi que você começou a montar um pedido${brandText} no nosso catálogo online (Total: ${totalText}).\n\nTeve alguma dúvida com relação aos modelos, tamanhos ou formas de pagamento? Estou à disposição para te ajudar a finalizar! 😊`;
    }
  };

  const handleOpenWhatsApp = (cart: ActiveCart) => {
    if (!cart.customer_whatsapp) {
      alert('Este cliente não possui número de WhatsApp cadastrado.');
      return;
    }
    const cleanPhone = cart.customer_whatsapp.replace(/\D/g, '');
    const message = getWhatsAppMessage(cart, selectedMessageTemplate);
    const url = `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] z-10"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ShoppingCart size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">Carrinhos em Aberto</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/10 text-amber-700 border border-amber-500/20">
                  {activeCarts.length} {activeCarts.length === 1 ? 'ativo' : 'ativos'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Clientes que adicionaram itens ao carrinho. Entre em contato para tirar dúvidas e fechar a venda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Template selector */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, empresa ou marca..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Mensagem:</span>
            <button
              onClick={() => setSelectedMessageTemplate('help')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${selectedMessageTemplate === 'help' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'}`}
            >
              Oferecer Ajuda
            </button>
            <button
              onClick={() => setSelectedMessageTemplate('special')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${selectedMessageTemplate === 'special' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'}`}
            >
              Condição Especial
            </button>
            <button
              onClick={() => setSelectedMessageTemplate('reminder')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${selectedMessageTemplate === 'reminder' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'}`}
            >
              Lembrete
            </button>
          </div>
        </div>

        {/* List of active carts */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredCarts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart size={28} />
              </div>
              <h3 className="text-sm font-black text-slate-700">Nenhum carrinho em aberto no momento</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 font-medium">
                Quando os clientes adicionarem produtos ao carrinho no catálogo, eles aparecerão aqui em tempo real para você oferecer suporte.
              </p>
            </div>
          ) : (
            filteredCarts.map(cart => {
              const isExpanded = expandedCartId === cart.customer_id;
              const hasPhone = Boolean(cart.customer_whatsapp);

              return (
                <div
                  key={cart.customer_id}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-amber-300 transition-all p-4 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900">
                          {cart.customer_name}
                        </span>
                        {cart.customer_empresa && (
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {cart.customer_empresa}
                          </span>
                        )}
                        {cart.brand_name && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                            {cart.brand_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {formatTimeAgo(cart.updated_at)}
                        </span>
                        <span>•</span>
                        <span>
                          {cart.product_count || cart.item_count || cart.items?.length || 0} {cart.product_count === 1 ? 'peça' : 'peças'}
                        </span>
                        {cart.customer_whatsapp && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">{cart.customer_whatsapp}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total do Carrinho</span>
                        <span className="text-base font-black text-amber-600">
                          R$ {Number(cart.total || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenWhatsApp(cart)}
                          disabled={!hasPhone}
                          title={hasPhone ? "Conversar no WhatsApp" : "Cliente sem telefone"}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${hasPhone ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                          <MessageCircle size={14} />
                          <span>Ajudar</span>
                        </button>

                        <button
                          onClick={() => setExpandedCartId(isExpanded ? null : cart.customer_id)}
                          className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                          title="Ver produtos do carrinho"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        <button
                          onClick={() => onRemoveCart(cart.customer_id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Remover / Marcar como atendido"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded items view */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pt-2 border-t border-slate-100"
                      >
                        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                            Itens no Carrinho ({cart.items?.length || 0})
                          </p>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {cart.items && cart.items.length > 0 ? (
                              cart.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-100">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Package size={14} className="text-slate-400 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-800 truncate">{item.nome}</p>
                                      <p className="text-[10px] text-slate-400">
                                        SKU: {item.sku || 'N/A'} {item.selected_variation ? `• ${Object.entries(item.selected_variation).map(([k, v]) => `${k}: ${v}`).join(', ')}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0 font-mono font-bold text-slate-700">
                                    <span className="text-slate-400 mr-2">{item.quantity}x</span>
                                    <span>R$ {(item.preco || item.preco_promocional || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 italic">Detalhes dos itens não disponíveis.</p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-500">Prévia da Mensagem:</span>
                            <span className="text-[11px] text-slate-600 italic truncate max-w-md">
                              "{getWhatsAppMessage(cart, selectedMessageTemplate).replace(/\n/g, ' ')}"
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">
            💡 Dica: Entrar em contato nos primeiros 10 minutos aumenta a taxa de conversão em até 70%.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
