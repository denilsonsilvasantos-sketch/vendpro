import React from 'react';
import { CartItem, Brand, UserRole } from '../types';
import { Plus, Minus, Trash2, ShoppingBag, User as UserIcon, ReceiptText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CartScreen({ 
  cart, 
  total, 
  onUpdateQuantity, 
  onRemove, 
  onSendOrder,
  selectedBrand,
  brands,
  role,
  isDrawer = false
}: { 
  cart: CartItem[], 
  total: number, 
  onUpdateQuantity: (id: string, q: number) => void, 
  onRemove: (id: string) => void, 
  onSendOrder: (clientName?: string) => void,
  selectedBrand: string | null,
  brands: Brand[],
  role: UserRole,
  isDrawer?: boolean
}) {
  const [clientName, setClientName] = React.useState('');
  const currentBrand = brands.find(b => b.id === selectedBrand);

  if (isDrawer) {
    return (
      <div className="flex flex-col h-full">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 border border-slate-100">
              <ShoppingBag size={32} strokeWidth={1.5} />
            </div>
            <p className="font-black text-slate-700 uppercase tracking-tight text-sm">Carrinho vazio</p>
            <p className="text-xs text-slate-400 font-medium">Adicione produtos do catálogo</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {currentBrand && (
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">{currentBrand.name}</p>
              )}
              <AnimatePresence mode="popLayout">
                {cart.map(item => {
                  const step = item.venda_somente_box ? 1 : (item.multiplo_venda || 1);
                  const isBoxDiscount = item.has_box_discount && !item.venda_somente_box && item.quantity >= (item.qtd_box || 0);
                  const unitPrice = item.venda_somente_box
                    ? (item.preco_box || 0)
                    : (isBoxDiscount ? (item.preco_box || 0) : (item.preco_unitario || 0));
                  const subtotal = unitPrice * item.quantity;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      {/* Image */}
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden">
                        {item.imagem ? (
                          <img src={item.imagem} alt={item.nome} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                        ) : (
                          <ShoppingBag size={16} className="text-slate-200" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 uppercase leading-tight truncate">{item.nome}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                        <p className="text-xs font-black text-primary">R$ {subtotal.toFixed(2)}</p>
                      </div>
                      {/* Qty controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity > step ? item.quantity - step : step)}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-primary transition-all">
                          <Minus size={12} strokeWidth={2.5} />
                        </button>
                        <span className="text-xs font-black text-slate-700 w-6 text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + step)}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-primary transition-all">
                          <Plus size={12} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => onRemove(item.id)}
                          className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all ml-1">
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Footer fixo */}
            <div className="border-t border-slate-100 px-4 py-4 bg-white space-y-3">
              {role === 'seller' && (
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Nome do cliente..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-primary/40"
                />
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                  <p className="text-xl font-black text-slate-900">R$ {total.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => onSendOrder(clientName)}
                  className="px-6 py-3 text-white font-black text-xs uppercase tracking-wide rounded-xl shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C21863, #E8257A)' }}
                >
                  <ShoppingBag size={16} />
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Modo página completa (mantido para compatibilidade)
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-5xl mx-auto space-y-12"
    >
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 bg-primary/10 rounded-[14px] flex items-center justify-center text-primary border border-primary/20 shadow-inner">
            <ShoppingBag size={40} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase">Meu Carrinho</h1>
            {currentBrand && (
              <p className="text-primary font-black uppercase tracking-[2px] text-[10px] mt-2">Marca: {currentBrand.name}</p>
            )}
          </div>
        </div>
      </div>
      
      {cart.length === 0 ? (
        <div className="text-center py-48 space-y-10 bg-white rounded-[14px] border border-dashed border-slate-200 shadow-inner">
          <div className="w-32 h-32 bg-slate-50 rounded-[14px] flex items-center justify-center mx-auto text-slate-200 border border-slate-100 shadow-sm">
            <ShoppingBag size={64} strokeWidth={1.5} />
          </div>
          <div className="space-y-4">
            <p className="text-2xl font-black text-slate-900 tracking-tight uppercase">Seu carrinho está vazio</p>
            <p className="text-slate-400 font-black uppercase tracking-[2px] text-[10px]">Explore nosso catálogo e adicione produtos incríveis!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-16">
          <div className="space-y-8">
            <AnimatePresence mode="popLayout">
              {cart.map(item => {
                const step = item.venda_somente_box ? 1 : (item.multiplo_venda || 1);
                const isBoxDiscount = item.has_box_discount && !item.venda_somente_box && item.quantity >= (item.qtd_box || 0);
                const unitPrice = item.venda_somente_box 
                  ? (item.preco_box || 0)
                  : (isBoxDiscount ? (item.preco_box || 0) : (item.preco_unitario || 0));
                const subtotal = unitPrice * item.quantity;

                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={item.id} 
                    className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white rounded-[10px] neumorphic-shadow border border-slate-100 gap-6 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shadow-inner">SKU: {item.sku}</span>
                        {isBoxDiscount && <span className="text-[9px] font-black text-amber-600 uppercase tracking-[2px] bg-amber-50 px-3 py-1 rounded-full border border-amber-100 shadow-inner">DESCONTO BOX</span>}
                      </div>
                      <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase leading-tight">{item.nome}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[2px]">
                        {item.quantity} {item.venda_somente_box ? 'box' : 'un'} × <span className="text-primary font-black">R$ {unitPrice.toFixed(2)}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right hidden sm:block">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] mb-1">Subtotal</p>
                        <p className="text-lg font-black text-slate-900 tracking-tighter">R$ {subtotal.toFixed(2)}</p>
                      </div>

                      <div className="flex items-center bg-slate-50 rounded-[10px] p-1.5 border border-slate-100 shadow-inner">
                        <button 
                          onClick={() => {
                            const newQty = item.quantity > step ? item.quantity - step : step;
                            onUpdateQuantity(item.id, newQty);
                          }} 
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-white hover:text-primary hover:shadow-lg rounded-[6px] transition-all"
                        >
                          <Minus size={18} strokeWidth={2.5} />
                        </button>
                        <span className="text-sm font-black w-12 text-center text-slate-700">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, item.quantity + step)} 
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-white hover:text-primary hover:shadow-lg rounded-[6px] transition-all"
                        >
                          <Plus size={18} strokeWidth={2.5} />
                        </button>
                      </div>

                      <button 
                        onClick={() => onRemove(item.id)} 
                        className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-[10px] transition-all duration-300 shadow-sm hover:shadow-md"
                      >
                        <Trash2 size={22} strokeWidth={2} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="p-10 bg-slate-900 rounded-[14px] text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
            <div className="relative z-10 space-y-10">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div className="space-y-8 flex-1 w-full">
                  {role === 'seller' && (
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[2px] text-white/40">
                        <UserIcon size={16} className="text-primary" />
                        Identificação do Cliente
                      </label>
                      <input 
                        type="text" 
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Nome do cliente ou empresa..."
                        className="w-full p-6 bg-white/5 border border-white/10 rounded-[10px] font-black text-lg text-white placeholder:text-white/10 focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-6 p-8 bg-white/5 rounded-[14px] border border-white/10 backdrop-blur-md shadow-inner">
                    <div className="w-16 h-16 bg-primary/20 rounded-[10px] flex items-center justify-center text-primary shadow-lg">
                      <ReceiptText size={32} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-[2px] mb-1">Resumo do Pedido</p>
                      <p className="text-4xl font-black text-white tracking-tighter">R$ {total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-auto">
                  <button 
                    onClick={() => onSendOrder(clientName)} 
                    className="w-full lg:w-auto px-16 py-6 bg-primary text-white rounded-[10px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/40 hover:-translate-y-2 transition-all active:translate-y-0 flex items-center justify-center gap-4 group"
                  >
                    Finalizar Pedido
                    <ShoppingBag size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -left-20 -top-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          </div>
        </div>
      )}
    </motion.div>
  );
}