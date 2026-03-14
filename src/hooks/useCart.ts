import { useState, useEffect } from 'react';
import { CartItem, Product } from '../types';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('vendpro_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check for 5 days inactivity (simplified: just clear if too old)
        const lastUpdate = localStorage.getItem('vendpro_cart_time');
        if (lastUpdate && Date.now() - parseInt(lastUpdate) > 5 * 24 * 60 * 60 * 1000) {
          return [];
        }
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('vendpro_cart', JSON.stringify(cart));
    localStorage.setItem('vendpro_cart_time', Date.now().toString());
  }, [cart]);

  const addToCart = (product: Product, quantity: number) => {
    // Validate multiples
    if (product.multiplo_venda && quantity % product.multiplo_venda !== 0) {
      alert(`Este produto só pode ser vendido em múltiplos de ${product.multiplo_venda}`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find(i => i.id === productId);
    if (item?.multiplo_venda && quantity % item.multiplo_venda !== 0) {
      // Don't update if not multiple
      return;
    }

    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => {
    let price = item.preco_unitario;
    
    if (item.venda_somente_box) {
      price = item.preco_box; // preco_box is the unit price
    } else if (item.has_box_discount && item.quantity >= (item.qtd_box || 0) && (item.qtd_box || 0) > 0) {
      price = item.preco_box; // preco_box is the unit price when discount applies
    }
    
    return acc + (item.quantity * price);
  }, 0);

  return { cart, addToCart, removeFromCart, updateQuantity, clearCart, total };
}
