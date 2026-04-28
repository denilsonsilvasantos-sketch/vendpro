import { CartItem } from '../types';
import { getCartItemPrice } from './prices';

export function formatWhatsAppMessage(items: CartItem[], clientName?: string, brandName?: string, notes?: string): string {
  const itemCount = items.length;
  const productCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const total = items.reduce((acc, item) => {
    const unitPrice = getCartItemPrice(item);
    return acc + (item.quantity * unitPrice);
  }, 0);

  const lines = items.map((item, index) => {
    const unitPrice = getCartItemPrice(item);
    const subtotal = item.quantity * unitPrice;
    
    let line = `*${index + 1}. ${item.nome}*\n`;
    line += `   SKU: ${item.sku} | Qtd: ${item.quantity}\n`;
    line += `   Preço: R$ ${unitPrice.toFixed(2).replace('.', ',')} | Sub: *R$ ${subtotal.toFixed(2).replace('.', ',')}*`;
    
    if (item.selected_variation && Object.keys(item.selected_variation).length > 0) {
      const vars = Object.entries(item.selected_variation)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      line += `\n   _${vars}_`;
    }
    
    return line;
  });
  
  let message = `🚀 *NOVO PEDIDO REALIZADO*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (brandName) {
    message += `🏷️ *Marca:* ${brandName}\n`;
  }
  if (clientName) {
    message += `👤 *Cliente:* ${clientName}\n`;
  }
  
  message += `📊 *Resumo:* ${itemCount} itens | ${productCount} produtos\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  message += lines.join('\n\n');
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *VALOR TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━`;
  
  if (notes && notes.trim()) {
    message += `\n\n📝 *Observações:*\n${notes.trim()}`;
  }
  
  return message;
}
