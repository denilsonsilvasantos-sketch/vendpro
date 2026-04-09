import { CartItem } from '../types';

/**
 * Calculates the unit price of a cart item based on its quantity, 
 * promotion status, and box discount rules.
 * 
 * Note: The input item is expected to already have the brand margin 
 * applied to its preco_unitario and preco_box fields (as done in productService).
 */
export function getCartItemPrice(item: CartItem): number {
  const now = new Date();
  const isPromoActive = item.is_promo && (!item.promo_until || new Date(item.promo_until) > now);
  
  if (isPromoActive) {
    if (item.venda_somente_box) {
      return item.promo_price_box || 0;
    } else if (item.quantity >= (item.promo_box_qty || 0) && (item.promo_box_qty || 0) > 0) {
      return item.promo_price_box || 0;
    } else {
      return item.promo_price_unit || 0;
    }
  } else {
    if (item.venda_somente_box) {
      return item.preco_box || 0;
    } else if (item.has_box_discount && item.quantity >= (item.qtd_box || 0) && (item.qtd_box || 0) > 0) {
      return item.preco_box || 0;
    } else {
      return item.preco_unitario || 0;
    }
  }
}
