import { CartItem } from '../types';

export function formatWhatsAppMessage(items: CartItem[]): string {
  const lines = items.map(item => {
    const marginMultiplier = 1 + (item.margin_percentage || 0) / 100;
    const isBoxDiscount = item.has_box_discount && !item.venda_somente_box && item.quantity >= (item.qtd_box || 0);
    const unitPrice = item.venda_somente_box 
      ? item.preco_box * marginMultiplier
      : (isBoxDiscount ? item.preco_box * marginMultiplier : item.preco_unitario * marginMultiplier);
    
    return `${item.quantity} - ${item.nome} - SKU ${item.sku} - ${unitPrice.toFixed(2).replace('.', ',')} - ${(item.quantity * unitPrice).toFixed(2).replace('.', ',')}`;
  });
  
  const total = items.reduce((acc, item) => {
    const marginMultiplier = 1 + (item.margin_percentage || 0) / 100;
    const isBoxDiscount = item.has_box_discount && !item.venda_somente_box && item.quantity >= (item.qtd_box || 0);
    const unitPrice = item.venda_somente_box 
      ? item.preco_box * marginMultiplier
      : (isBoxDiscount ? item.preco_box * marginMultiplier : item.preco_unitario * marginMultiplier);
    return acc + (item.quantity * unitPrice);
  }, 0);
  
  return `Pedido realizado:\n\n${lines.join('\n')}\n\nTotal dos produtos: ${total.toFixed(2).replace('.', ',')}`;
}
