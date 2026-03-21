import React from 'react';
import { CartItem, Brand, UserRole } from '../types';
import { Plus, Minus, Trash2 } from 'lucide-react';

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
    <div className="p-6">
      <div className="flex flex-col mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Carrinho</h1>
        {currentBrand && (
          <p className="text-primary font-bold uppercase tracking-widest text-xs mt-1">Marca: {currentBrand.name}</p>
        )}
      </div>
      
      {cart.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>Seu carrinho está vazio.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {cart.map(item => {
              const step = item.venda_somente_box ? 1 : (item.multiplo_venda || 1);
              const isBoxDiscount = item.has_box_discount && !item.venda_somente_box && item.quantity >= (item.qtd_box || 0);
              const marginMultiplier = 1 + (item.margin_percentage || 0) / 100;
              const unitPrice = item.venda_somente_box 
                ? (item.preco_box || 0) * marginMultiplier
                : (isBoxDiscount ? (item.preco_box || 0) * marginMultiplier : (item.preco_unitario || 0) * marginMultiplier);
              const subtotal = unitPrice * item.quantity;

              return (
                <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100 gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-sm">{item.nome}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.quantity} {item.venda_somente_box ? 'box' : 'un'} x R$ {unitPrice.toFixed(2)} = <span className="font-bold text-primary">R$ {subtotal.toFixed(2)}</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                      <button 
                        onClick={() => {
                          const newQty = item.quantity > step ? item.quantity - step : step;
                          onUpdateQuantity(item.id, newQty);
                        }} 
                        className="p-1.5 text-slate-600 hover:bg-white rounded-md transition-colors"
                      >
                        <Minus size={16}/>
                      </button>
                      <span className="text-sm font-bold w-10 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity + step)} 
                        className="p-1.5 text-slate-600 hover:bg-white rounded-md transition-colors"
                      >
                        <Plus size={16}/>
                      </button>
                    </div>
                    <button 
                      onClick={() => onRemove(item.id)} 
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6">
            {role === 'seller' && (
              <div className="w-full">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Nome do Cliente (Opcional)</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Digite o nome do cliente..."
                  className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total do Pedido</p>
                <p className="text-3xl font-black text-primary">R$ {total.toFixed(2)}</p>
              </div>
              <button 
                onClick={() => onSendOrder(clientName)} 
                className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark active:scale-95 transition-all"
              >
                Finalizar Pedido
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
