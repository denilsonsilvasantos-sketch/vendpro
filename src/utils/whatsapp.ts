import { CartItem } from '../types';

export function formatWhatsAppMessage(items: CartItem[], clientName?: string, brandName?: string, notes?: string): string {
  const itemCount = items.length;
  const productCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const lines = items.map((item, index) => {
    const isBoxDiscount = item.has_box_discount && !item.venda_somente_box && item.quantity >= (item.qtd_box || 0);
    const unitPrice = item.venda_somente_box 
      ? (item.preco_box || 0)
      : (isBoxDiscount ? ((item.preco_box || 0) / (item.qtd_box || 1)) : (item.preco_unitario || 0));
    
    return `${index + 1}. ${item.quantity} / ${item.sku} / ${item.nome} / ${unitPrice.toFixed(2).replace('.', ',')} / ${(item.quantity * unitPrice).toFixed(2).replace('.', ',')}`;
  });
  
  const total = items.reduce((acc, item) => {
    const isBoxDiscount = item.has_box_discount && !item.venda_somente_box && item.quantity >= (item.qtd_box || 0);
    const unitPrice = item.venda_somente_box 
      ? (item.preco_box || 0)
      : (isBoxDiscount ? ((item.preco_box || 0) / (item.qtd_box || 1)) : (item.preco_unitario || 0));
    return acc + (item.quantity * unitPrice);
  }, 0);
  
  let message = `Pedido realizado\n`;
  if (brandName) {
    message += `Marca: ${brandName}\n`;
  }
  if (clientName) {
    message += `${clientName}\n`;
  }
  message += `\nItens: ${itemCount} | Produtos: ${productCount}\n`;
  message += `\n${lines.join('\n')}\n\nSubtotal: R$ ${total.toFixed(2).replace('.', ',')}\nDesconto: R$ 0,00\nTotal Líquido: R$ ${total.toFixed(2).replace('.', ',')}`;
  
  if (notes && notes.trim()) {
    message += `\n\nObservações:\n${notes.trim()}`;
  }
  
  return message;
}
