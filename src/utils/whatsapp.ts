import { CartItem } from '../types';

export function formatWhatsAppMessage(items: CartItem[], clientName?: string, brandName?: string): string {
  const lines = items.map(item => {
    const isBoxDiscount = item.has_box_discount && !item.venda_somente_box && item.quantity >= (item.qtd_box || 0);
    const unitPrice = item.venda_somente_box 
      ? item.preco_box
      : (isBoxDiscount ? item.preco_box : item.preco_unitario);
    
    return `${item.quantity} / ${item.sku} / ${item.nome} / ${unitPrice.toFixed(2).replace('.', ',')} / ${(item.quantity * unitPrice).toFixed(2).replace('.', ',')}`;
  });
  
  const total = items.reduce((acc, item) => {
    const isBoxDiscount = item.has_box_discount && !item.venda_somente_box && item.quantity >= (item.qtd_box || 0);
    const unitPrice = item.venda_somente_box 
      ? item.preco_box
      : (isBoxDiscount ? item.preco_box : item.preco_unitario);
    return acc + (item.quantity * unitPrice);
  }, 0);
  
  let message = `Pedido realizado\n`;
  if (brandName) {
    message += `Marca: ${brandName}\n`;
  }
  if (clientName) {
    message += `${clientName}\n`;
  }
  message += `\n${lines.join('\n')}\n\nSubtotal: R$ ${total.toFixed(2).replace('.', ',')}\nDesconto: R$ 0,00\nTotal Líquido: R$ ${total.toFixed(2).replace('.', ',')}`;
  
  return message;
}
