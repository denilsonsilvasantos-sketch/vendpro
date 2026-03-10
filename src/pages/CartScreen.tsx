import React from 'react';
import { CartItem } from '../types';

export default function CartScreen({ cart, total, onUpdateQuantity, onRemove, onSendOrder }: { 
  cart: CartItem[], 
  total: number, 
  onUpdateQuantity: (id: string, q: number) => void, 
  onRemove: (id: string) => void, 
  onSendOrder: () => void 
}) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Carrinho</h1>
      <div className="space-y-4">
        {cart.map(item => (
          <div key={item.id} className="flex justify-between items-center p-4 bg-white rounded-lg shadow">
            <span>{item.nome}</span>
            <span>{item.quantity} x R$ {item.preco_unitario}</span>
            <button onClick={() => onRemove(item.id)} className="text-red-500">Remover</button>
          </div>
        ))}
      </div>
      <div className="mt-6 font-bold text-xl">Total: R$ {total.toFixed(2)}</div>
      <button onClick={onSendOrder} className="mt-4 w-full bg-primary text-white py-3 rounded-lg">Finalizar Pedido</button>
    </div>
  );
}
