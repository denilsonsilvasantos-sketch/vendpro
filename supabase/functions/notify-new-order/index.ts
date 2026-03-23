import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@vendpro.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record;

    if (!record || body.type !== 'INSERT') {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const targetSellerId = record.seller_id;
    const companyId = record.company_id;
    const clientName = record.client_name || 'Cliente';
    const total = Number(record.total || 0).toFixed(2);

    let query = supabase.from('push_subscriptions').select('subscription').eq('company_id', companyId);
    if (targetSellerId) query = query.eq('seller_id', targetSellerId);

    const { data: subs } = await query;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });
    }

    const payload = JSON.stringify({
      title: 'Novo Pedido Recebido!',
      body: `${clientName} — R$ ${total}`,
      url: '/',
    });

    let sent = 0;
    for (const row of subs) {
      try {
        const sub = JSON.parse(row.subscription);
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err) {
        console.error('Falha ao enviar push:', err);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
