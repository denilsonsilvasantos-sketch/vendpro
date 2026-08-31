import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { ActiveCart } from '../types';

export interface AppNotification {
  id: string;
  type: 'order' | 'cart';
  order_id?: string;
  customer_id?: string;
  client_name: string;
  client_empresa?: string;
  client_whatsapp?: string;
  seller_id?: string;
  total: number;
  product_count?: number;
  brand_name?: string;
  cart_items?: any[];
  created_at: string;
  read: boolean;
}

const STORAGE_KEY = 'vendpro_notif_seen_at';

function getSeenAt(): string {
  return localStorage.getItem(STORAGE_KEY) || new Date(0).toISOString();
}

export function playNotificationSound(type: 'order' | 'cart' = 'order') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'order') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.09); // E5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (_) {
    // Audio might be muted or blocked before user gesture
  }
}

export function useNotifications(companyId: string | null, role?: string | null, sellerId?: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeCarts, setActiveCarts] = useState<ActiveCart[]>([]);
  const [latestToast, setLatestToast] = useState<AppNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const orderChannelRef = useRef<any>(null);
  const cartChannelRef = useRef<any>(null);

  const enabled = role === 'seller' || role === 'company';
  const cartsStorageKey = companyId ? `vendpro_active_carts_${companyId}` : 'vendpro_active_carts';

  // Load active carts from storage
  const loadSavedCarts = useCallback(() => {
    if (!companyId) return;
    try {
      const saved = localStorage.getItem(cartsStorageKey);
      if (saved) {
        const parsed: ActiveCart[] = JSON.parse(saved);
        // Filter out carts older than 48 hours
        const valid = parsed.filter(c => Date.now() - new Date(c.updated_at).getTime() < 48 * 3600 * 1000);
        if (role === 'seller' && sellerId) {
          setActiveCarts(valid.filter(c => !c.seller_id || c.seller_id === sellerId));
        } else {
          setActiveCarts(valid);
        }
      }
    } catch (_) {}
  }, [companyId, cartsStorageKey, role, sellerId]);

  const loadRecent = useCallback(async () => {
    if (!supabase || !companyId || !enabled) return;

    loadSavedCarts();

    let query = supabase
      .from('orders')
      .select('*, customer:customers!customer_id (nome, nome_empresa, whatsapp, seller_id)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (role === 'seller' && sellerId) {
      query = query.eq('seller_id', sellerId);
    }

    const { data } = await query;
    if (!data) return;

    const seenAt = getSeenAt();
    const mapped: AppNotification[] = data.map((o: any) => ({
      id: o.id,
      type: 'order',
      order_id: o.id,
      customer_id: o.customer_id,
      client_name: o.customer?.nome || o.customer?.nome_empresa || o.client_name || 'Cliente',
      client_empresa: o.customer?.nome_empresa,
      client_whatsapp: o.customer?.whatsapp,
      seller_id: o.seller_id,
      total: Number(o.total || 0),
      created_at: o.created_at,
      read: o.created_at <= seenAt,
    }));

    setNotifications(mapped);
    setUnreadCount(mapped.filter(n => !n.read).length);
  }, [companyId, role, sellerId, enabled, loadSavedCarts]);

  const addOrderNotification = useCallback((order: any) => {
    const notif: AppNotification = {
      id: order.id,
      type: 'order',
      order_id: order.id,
      customer_id: order.customer_id,
      client_name: order.client_name || 'Novo cliente',
      client_whatsapp: order.customer?.whatsapp,
      seller_id: order.seller_id,
      total: Number(order.total || 0),
      created_at: order.created_at,
      read: false,
    };

    setNotifications(prev => [notif, ...prev.filter(n => n.id !== notif.id).slice(0, 24)]);
    setUnreadCount(prev => prev + 1);
    setLatestToast(notif);
    playNotificationSound('order');

    // Remove from active carts if this customer had one
    if (order.customer_id) {
      setActiveCarts(prev => {
        const next = prev.filter(c => c.customer_id !== order.customer_id);
        localStorage.setItem(cartsStorageKey, JSON.stringify(next));
        return next;
      });
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🛍 Novo Pedido Recebido!', {
          body: `${notif.client_name} — R$ ${notif.total.toFixed(2)}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `order-${order.id}`,
        });
      } catch (_) {}
    }
  }, [cartsStorageKey]);

  const addCartNotification = useCallback((cartPayload: ActiveCart) => {
    if (role === 'seller' && sellerId && cartPayload.seller_id && cartPayload.seller_id !== sellerId) {
      return;
    }

    // Update active carts list
    setActiveCarts(prev => {
      let next = prev.filter(c => c.customer_id !== cartPayload.customer_id);
      if (cartPayload.item_count > 0) {
        next = [cartPayload, ...next];
      }
      localStorage.setItem(cartsStorageKey, JSON.stringify(next));
      return next;
    });

    if (cartPayload.item_count === 0) return;

    const notifId = `cart-${cartPayload.customer_id}`;
    const notif: AppNotification = {
      id: notifId,
      type: 'cart',
      customer_id: cartPayload.customer_id,
      client_name: cartPayload.customer_name || 'Cliente',
      client_empresa: cartPayload.customer_empresa,
      client_whatsapp: cartPayload.customer_whatsapp,
      seller_id: cartPayload.seller_id,
      total: Number(cartPayload.total || 0),
      product_count: cartPayload.product_count || cartPayload.item_count,
      brand_name: cartPayload.brand_name,
      cart_items: cartPayload.items,
      created_at: cartPayload.updated_at || new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [notif, ...prev.filter(n => n.id !== notifId).slice(0, 24)]);
    setUnreadCount(prev => prev + 1);
    setLatestToast(notif);
    playNotificationSound('cart');

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🛒 Cliente Montando Carrinho!', {
          body: `${notif.client_name} adicionou itens — Total: R$ ${notif.total.toFixed(2)}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `cart-${cartPayload.customer_id}`,
        });
      } catch (_) {}
    }
  }, [cartsStorageKey, role, sellerId]);

  useEffect(() => {
    if (!enabled || !companyId) return;
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    if (!supabase || !companyId || !enabled) return;

    // 1. Listen for new orders
    orderChannelRef.current = supabase
      .channel(`notifications-orders-${companyId}-${sellerId || 'all'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        const order = payload.new;
        if (role === 'seller' && sellerId && order.seller_id !== sellerId) return;
        addOrderNotification(order);
      })
      .subscribe();

    // 2. Listen for active carts realtime events
    cartChannelRef.current = supabase
      .channel(`company-active-carts-${companyId}`)
      .on('broadcast', { event: 'cart_activity' }, (event) => {
        if (event?.payload) {
          addCartNotification(event.payload);
        }
      })
      .on('broadcast', { event: 'cart_cleared' }, (event) => {
        if (event?.payload?.customer_id) {
          setActiveCarts(prev => {
            const next = prev.filter(c => c.customer_id !== event.payload.customer_id);
            localStorage.setItem(cartsStorageKey, JSON.stringify(next));
            return next;
          });
        }
      })
      .subscribe();

    return () => {
      if (supabase) {
        if (orderChannelRef.current) supabase.removeChannel(orderChannelRef.current);
        if (cartChannelRef.current) supabase.removeChannel(cartChannelRef.current);
      }
    };
  }, [companyId, role, sellerId, enabled, addOrderNotification, addCartNotification, cartsStorageKey]);

  const markAllRead = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const dismissToast = useCallback(() => {
    setLatestToast(null);
  }, []);

  const removeActiveCart = useCallback((customerId: string) => {
    setActiveCarts(prev => {
      const next = prev.filter(c => c.customer_id !== customerId);
      localStorage.setItem(cartsStorageKey, JSON.stringify(next));
      return next;
    });
  }, [cartsStorageKey]);

  async function requestBrowserPermission() {
    if (!('Notification' in window)) return 'not-supported';
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    return result;
  }

  return {
    notifications,
    activeCarts,
    latestToast,
    dismissToast,
    unreadCount,
    markAllRead,
    removeActiveCart,
    requestBrowserPermission,
    reload: loadRecent
  };
}
