import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';

export interface AppNotification {
  id: string;
  order_id: string;
  client_name: string;
  total: number;
  created_at: string;
  read: boolean;
}

const STORAGE_KEY = 'vendpro_notif_seen_at';

function getSeenAt(): string {
  return localStorage.getItem(STORAGE_KEY) || new Date(0).toISOString();
}

export function useNotifications(companyId: string | null, role?: string | null, sellerId?: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<any>(null);

  const enabled = role === 'seller' || role === 'company';

  const loadRecent = useCallback(async () => {
    if (!supabase || !companyId || !enabled) return;

    let query = supabase
      .from('orders')
      .select('id, client_name, customers(nome), total, created_at, seller_id')
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
      order_id: o.id,
      client_name: o.customers?.nome || o.client_name || 'Cliente',
      total: Number(o.total || 0),
      created_at: o.created_at,
      read: o.created_at <= seenAt,
    }));

    setNotifications(mapped);
    setUnreadCount(mapped.filter(n => !n.read).length);
  }, [companyId, role, sellerId, enabled]);

  const addNotification = useCallback((order: any) => {
    const notif: AppNotification = {
      id: order.id,
      order_id: order.id,
      client_name: order.client_name || 'Novo cliente',
      total: Number(order.total || 0),
      created_at: order.created_at,
      read: false,
    };

    setNotifications(prev => [notif, ...prev.slice(0, 19)]);
    setUnreadCount(prev => prev + 1);

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Novo Pedido Recebido!', {
          body: `${notif.client_name} — R$ ${notif.total.toFixed(2)}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `order-${order.id}`,
        });
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (!enabled || !companyId) return;
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    if (!supabase || !companyId || !enabled) return;

    channelRef.current = supabase
      .channel(`notifications-${companyId}-${sellerId || 'all'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        const order = payload.new;
        if (role === 'seller' && sellerId && order.seller_id !== sellerId) return;
        addNotification(order);
      })
      .subscribe();

    return () => {
      if (supabase && channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [companyId, role, sellerId, enabled, addNotification]);

  const markAllRead = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  async function requestBrowserPermission() {
    if (!('Notification' in window)) return 'not-supported';
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    return result;
  }

  return { notifications, unreadCount, markAllRead, requestBrowserPermission, reload: loadRecent };
}
