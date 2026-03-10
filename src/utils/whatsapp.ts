import { CartItem } from '../types';

export function formatWhatsAppMessage(items: CartItem[]): string {
  const lines = items.map(item => 
    `${item.quantity} - ${item.nome} - SKU ${item.sku} - ${item.preco_unitario.toFixed(2).replace('.', ',')} - ${(item.quantity * item.preco_unitario).toFixed(2).replace('.', ',')}`
  );
  
  const total = items.reduce((acc, item) => acc + (item.quantity * item.preco_unitario), 0);
  
  return `Pedido realizado:\n\n${lines.join('\n')}\n\nTotal dos produtos: ${total.toFixed(2).replace('.', ',')}`;
}
