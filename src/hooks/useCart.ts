import { useState, useEffect } from 'react';
import { CartItem, Product } from '../types';

export function useCart(brandId?: string | null) {
  const [carts, setCarts] = useState<{ [brandId: string]: CartItem[] }>(() => {
    const saved = localStorage.getItem('vendpro_carts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const lastUpdate = localStorage.getItem('vendpro_carts_time');
        if (lastUpdate && Date.now() - parseInt(lastUpdate) > 5 * 24 * 60 * 60 * 1000) {
          return {};
        }
        return parsed;
      } catch (e) {
        return {};
      }
    }
    // Migration from old cart
    const oldCart = localStorage.getItem('vendpro_cart');
    if (oldCart) {
      try {
        const parsed = JSON.parse(oldCart) as CartItem[];
        if (parsed.length > 0) {
          const brandCarts: { [brandId: string]: CartItem[] } = {};
          parsed.forEach(item => {
            const bId = item.brand_id || 'default';
            if (!brandCarts[bId]) brandCarts[bId] = [];
            brandCarts[bId].push(item);
          });
          localStorage.removeItem('vendpro_cart');
          return brandCarts;
        }
      } catch (e) {}
    }
    return {};
  });

  const cart = brandId ? (carts[brandId] || []) : [];

  useEffect(() => {
    localStorage.setItem('vendpro_carts', JSON.stringify(carts));
    localStorage.setItem('vendpro_carts_time', Date.now().toString());
  }, [carts]);

  const addToCart = (product: Product, quantity: number) => {
    const bId = product.brand_id || 'default';
    
    // Validate multiples
    if (product.multiplo_venda && quantity % product.multiplo_venda !== 0) {
      alert(`Este produto só pode ser vendido em múltiplos de ${product.multiplo_venda}`);
      return;
    }

    setCarts(prev => {
      const brandCart = prev[bId] || [];
      const existing = brandCart.find(item => item.id === product.id);
      let newBrandCart;
      if (existing) {
        const newQty = existing.quantity + quantity;
        newBrandCart = brandCart.map(item => 
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        newBrandCart = [...brandCart, { ...product, quantity }];
      }
      return { ...prev, [bId]: newBrandCart };
    });
  };

  const removeFromCart = (productId: string, itemBrandId?: string) => {
    const bId = itemBrandId || brandId || 'default';
    setCarts(prev => {
      const brandCart = prev[bId] || [];
      return { ...prev, [bId]: brandCart.filter(item => item.id !== productId) };
    });
  };

  const updateQuantity = (productId: string, quantity: number, itemBrandId?: string) => {
    const bId = itemBrandId || brandId || 'default';
    if (quantity <= 0) {
      removeFromCart(productId, bId);
      return;
    }

    setCarts(prev => {
      const brandCart = prev[bId] || [];
      const item = brandCart.find(i => i.id === productId);
      if (item && !item.venda_somente_box && item.multiplo_venda && quantity % item.multiplo_venda !== 0) {
        return prev;
      }
      const newBrandCart = brandCart.map(item => 
        item.id === productId ? { ...item, quantity } : item
      );
      return { ...prev, [bId]: newBrandCart };
    });
  };

  const clearCart = (targetBrandId?: string) => {
    const bId = targetBrandId || brandId;
    if (bId) {
      setCarts(prev => ({ ...prev, [bId]: [] }));
    } else {
      setCarts({});
    }
  };

  const total = cart.reduce((acc, item) => {
    let price = item.preco_unitario * (1 + (item.margin_percentage || 0) / 100);
    
    if (item.venda_somente_box) {
      price = (item.preco_box || 0) * (1 + (item.margin_percentage || 0) / 100);
    } else if (item.has_box_discount && item.quantity >= (item.qtd_box || 0) && (item.qtd_box || 0) > 0) {
      price = (item.preco_box || 0) * (1 + (item.margin_percentage || 0) / 100);
    }
    
    return acc + (item.quantity * price);
  }, 0);

  return { cart, carts, addToCart, removeFromCart, updateQuantity, clearCart, total };
}
