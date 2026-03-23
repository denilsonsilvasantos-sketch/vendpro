import { supabase } from '../integrations/supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export async function subscribeToPush(sellerId: string, companyId: string): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY não configurado. Push desativado.');
    return false;
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    if (!supabase) return false;

    await supabase.from('push_subscriptions').upsert({
      seller_id: sellerId,
      company_id: companyId,
      subscription: JSON.stringify(subscription),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'seller_id' });

    return true;
  } catch (err) {
    console.error('Erro ao assinar push:', err);
    return false;
  }
}

export async function unsubscribeFromPush(sellerId: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    if (supabase) await supabase.from('push_subscriptions').delete().eq('seller_id', sellerId);
  } catch (err) {
    console.error('Erro ao cancelar push:', err);
  }
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
}
