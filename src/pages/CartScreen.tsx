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
  role
}: { 
  cart: CartItem[], 
  total: number, 
  onUpdateQuantity: (id: string, q: number) => void, 
  onRemove: (id: string) => void, 
  onSendOrder: (clientName?: string) => void,
  selectedBrand: string | null,
  brands: Brand[],
  role: UserRole
}) {
  const [clientName, setClientName] = React.useState('');
  const currentBrand = brands.find(b => b.id === selectedBrand);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-5xl mx-auto"
    >
      <div className="flex flex-col mb-16 space-y-2">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-primary/10 rounded-[24px] flex items-center justify-center text-primary border border-primary/20 shadow-inner">
            <ShoppingBag size={32} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Meu Carrinho</h1>
            {currentBrand && (
              <p className="text-primary font-black uppercase tracking-[0.2em] text-[11px] mt-1.5">Marca: {currentBrand.name}</p>
            )}
          </div>
        </div>
      </div>
      
      {cart.length === 0 ? (
        <div className="text-center py-40 space-y-8 bg-white rounded-[56px] border border-dashed border-slate-200 shadow-sm">
          <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto text-slate-200 border border-slate-100">
            <ShoppingBag size={48} strokeWidth={1.5} />
          </div>
          <div className="space-y-3">
            <p className="text-2xl font-black text-slate-900 tracking-tight">Seu carrinho está vazio</p>
            <p className="text-slate-400 font-medium">Explore nosso catálogo e adicione produtos incríveis!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {cart.map(item => {
                const step = item.venda_somente_box ? 1 : (item.multiplo_venda || 1);
                const isBoxDiscount = item.has_box_discount && !item.venda_somente_box && item.quantity >= (item.qtd_box || 0);
                const marginMultiplier = 1 + (item.margin_percentage || 0) / 100;
                const unitPrice = item.venda_somente_box 
                  ? (item.preco_box || 0) * marginMultiplier
                  : (isBoxDiscount ? (item.preco_box || 0) * marginMultiplier : (item.preco_unitario || 0) * marginMultiplier);
                const subtotal = unitPrice * item.quantity;

                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={item.id} 
                    className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 bg-white rounded-[40px] shadow-sm border border-slate-100 gap-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">SKU: {item.sku}</span>
                        {isBoxDiscount && <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">DESCONTO BOX</span>}
                      </div>
                      <h3 className="font-black text-slate-800 text-lg tracking-tight uppercase leading-tight">{item.nome}</h3>
                      <p className="text-sm text-slate-500 font-medium">
                        {item.quantity} {item.venda_somente_box ? 'box' : 'un'} × <span className="text-slate-900 font-bold">R$ {unitPrice.toFixed(2)}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Subtotal</p>
                        <p className="text-2xl font-black text-primary tracking-tighter">R$ {subtotal.toFixed(2)}</p>
                      </div>

                      <div className="flex items-center bg-slate-50 rounded-[24px] p-2 border border-slate-100 shadow-inner">
                        <button 
                          onClick={() => {
                            const newQty = item.quantity > step ? item.quantity - step : step;
                            onUpdateQuantity(item.id, newQty);
                          }} 
                          className="w-12 h-12 flex items-center justify-center text-slate-400 hover:bg-white hover:text-primary hover:shadow-md rounded-[18px] transition-all"
                        >
                          <Minus size={20} strokeWidth={2.5} />
                        </button>
                        <span className="text-base font-black w-14 text-center text-slate-700">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, item.quantity + step)} 
                          className="w-12 h-12 flex items-center justify-center text-slate-400 hover:bg-white hover:text-primary hover:shadow-md rounded-[18px] transition-all"
                        >
                          <Plus size={20} strokeWidth={2.5} />
                        </button>
                      </div>

                      <button 
                        onClick={() => onRemove(item.id)} 
                        className="w-14 h-14 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-[24px] transition-all duration-300"
                      >
                        <Trash2 size={24} strokeWidth={2} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="p-12 bg-slate-900 rounded-[56px] text-white relative overflow-hidden shadow-2xl shadow-slate-900/30">
            <div className="relative z-10 space-y-12">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                <div className="space-y-8 flex-1 w-full">
                  {role === 'seller' && (
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                        <UserIcon size={16} className="text-primary" />
                        Identificação do Cliente
                      </label>
                      <input 
                        type="text" 
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Nome do cliente ou empresa..."
                        className="w-full p-6 bg-white/5 border border-white/10 rounded-[28px] font-bold text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-6 p-8 bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-md shadow-inner">
                    <div className="w-16 h-16 bg-primary/20 rounded-[24px] flex items-center justify-center text-primary shadow-lg">
                      <ReceiptText size={32} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-1.5">Resumo do Pedido</p>
                      <p className="text-4xl font-black text-white tracking-tighter">R$ {total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-auto">
                  <button 
                    onClick={() => onSendOrder(clientName)} 
                    className="w-full lg:w-auto px-16 py-7 bg-primary text-white rounded-[32px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/40 hover:-translate-y-1 transition-all active:translate-y-0 flex items-center justify-center gap-4 group"
                  >
                    Finalizar Pedido
                    <ShoppingBag size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -left-20 -top-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

