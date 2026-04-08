import { useState, useEffect, useMemo } from 'react';
import { CartItem, Product } from '../types';

export function useCart(brandId?: string | null, userId?: string | null) {
  const [carts, setCarts] = useState<{ [brandId: string]: CartItem[] }>({});

  const storageKey = useMemo(() => {
    return userId ? `vendpro_carts_${userId}` : 'vendpro_carts';
  }, [userId]);

  // Load cart when userId or storageKey changes
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const lastUpdate = localStorage.getItem(`${storageKey}_time`);
        if (lastUpdate && Date.now() - parseInt(lastUpdate) > 5 * 24 * 60 * 60 * 1000) {
          setCarts({});
        } else {
          setCarts(parsed);
        }
      } catch (e) {
        setCarts({});
      }
    } else {
      // Migration from old cart (only if no user-specific cart exists)
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
            setCarts(brandCarts);
            return;
          }
        } catch (e) {}
      }
      setCarts({});
    }
  }, [storageKey]);

  const cart = useMemo(() => brandId ? (carts[brandId] || []) : [], [carts, brandId]);

  // Save cart whenever it changes
  useEffect(() => {
    if (Object.keys(carts).length > 0 || localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, JSON.stringify(carts));
      localStorage.setItem(`${storageKey}_time`, Date.now().toString());
    }
  }, [carts, storageKey]);

  const addToCart = (product: Product, quantity: number, selected_variation?: Record<string, string>) => {
    const bId = product.brand_id || 'default';
    
    if (!product.venda_somente_box && product.multiplo_venda && quantity % product.multiplo_venda !== 0) {
      alert(`Este produto só pode ser vendido em múltiplos de ${product.multiplo_venda}`);
      return;
    }

    setCarts(prev => {
      const brandCart = prev[bId] || [];
      const existing = brandCart.find(item => 
        item.id === product.id && 
        JSON.stringify(item.selected_variation) === JSON.stringify(selected_variation)
      );
      let newBrandCart;
      if (existing) {
        const newQty = existing.quantity + quantity;
        newBrandCart = brandCart.map(item => 
          (item.id === product.id && JSON.stringify(item.selected_variation) === JSON.stringify(selected_variation))
            ? { ...item, quantity: newQty } 
            : item
        );
      } else {
        newBrandCart = [...brandCart, { ...product, quantity, selected_variation }];
      }
      return { ...prev, [bId]: newBrandCart };
    });
  };

  const removeFromCart = (productId: string, itemBrandId?: string, selected_variation?: Record<string, string>) => {
    const bId = itemBrandId || brandId || 'default';
    setCarts(prev => {
      const brandCart = prev[bId] || [];
      return { ...prev, [bId]: brandCart.filter(item => 
        !(item.id === productId && JSON.stringify(item.selected_variation) === JSON.stringify(selected_variation))
      ) };
    });
  };

  const updateQuantity = (productId: string, quantity: number, itemBrandId?: string, selected_variation?: Record<string, string>) => {
    const bId = itemBrandId || brandId || 'default';
    if (quantity <= 0) {
      removeFromCart(productId, bId, selected_variation);
      return;
    }

    setCarts(prev => {
      const brandCart = prev[bId] || [];
      const item = brandCart.find(i => 
        i.id === productId && 
        JSON.stringify(i.selected_variation) === JSON.stringify(selected_variation)
      );
      if (item && !item.venda_somente_box && item.multiplo_venda && quantity % item.multiplo_venda !== 0) {
        return prev;
      }
      const newBrandCart = brandCart.map(item => 
        (item.id === productId && JSON.stringify(item.selected_variation) === JSON.stringify(selected_variation))
          ? { ...item, quantity } 
          : item
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

  const total = useMemo(() => cart.reduce((acc, item) => {
    const isPromoActive = item.is_promo && (!item.promo_until || new Date(item.promo_until) > new Date());
    
    let price;
    if (isPromoActive) {
      if (item.venda_somente_box) {
        price = item.promo_price_box || 0;
      } else if (item.quantity >= (item.promo_box_qty || 0) && (item.promo_box_qty || 0) > 0) {
        price = (item.promo_price_box || 0) / (item.promo_box_qty || 1);
      } else {
        price = item.promo_price_unit || 0;
      }
    } else {
      if (item.venda_somente_box) {
        price = item.preco_box || 0;
      } else if (item.has_box_discount && item.quantity >= (item.qtd_box || 0) && (item.qtd_box || 0) > 0) {
        price = (item.preco_box || 0) / (item.qtd_box || 1);
      } else {
        price = item.preco_unitario || 0;
      }
    }
    
    return acc + (item.quantity * price);
  }, 0), [cart]);

  const itemCount = useMemo(() => cart.length, [cart]);
  const productCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  return { cart, carts, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount, productCount };
}
