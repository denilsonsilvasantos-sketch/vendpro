import { supabase } from '../integrations/supabaseClient';
import { BannerData, TopBarMessage } from '../types';

export async function getBanners(companyId: string): Promise<BannerData[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('company_id', companyId)
    .order('order_index');
    
  if (error) {
    console.error('Error fetching banners:', error);
    // Fallback to localStorage if table doesn't exist
    const saved = localStorage.getItem(`vendpro_banners_${companyId}`);
    return saved ? JSON.parse(saved) : [];
  }
  
  return data || [];
}

export async function saveBanners(companyId: string, banners: BannerData[]): Promise<void> {
  // Save to localStorage as primary for now to avoid DB errors if table doesn't exist
  localStorage.setItem(`vendpro_banners_${companyId}`, JSON.stringify(banners));

  if (!supabase) return;
  
  // Try to save to Supabase
  try {
    // Delete existing
    await supabase.from('banners').delete().eq('company_id', companyId);
    // Insert new
    if (banners.length > 0) {
      await supabase.from('banners').insert(banners.map(({ id, ...rest }) => ({ ...rest, company_id: companyId })));
    }
  } catch (err) {
    console.error('Error saving banners to Supabase:', err);
  }
}

export async function getTopBarMessages(companyId: string): Promise<TopBarMessage[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('top_bar_messages')
    .select('*')
    .eq('company_id', companyId)
    .order('order_index');
    
  if (error) {
    const saved = localStorage.getItem(`vendpro_topbar_${companyId}`);
    return saved ? JSON.parse(saved) : [
      { id: '1', company_id: companyId, text: '✨ FRETE GRÁTIS acima de R$ 99 em todo o Brasil', order_index: 0 },
      { id: '2', company_id: companyId, text: '💳 Pagamento em até 12x sem juros no cartão', order_index: 1 },
      { id: '3', company_id: companyId, text: '📦 Entrega expressa disponível para sua região', order_index: 2 },
      { id: '4', company_id: companyId, text: '🎁 Compre 3 e ganhe 10% de desconto extra', order_index: 3 },
    ];
  }
  
  return data || [];
}

export async function saveTopBarMessages(companyId: string, messages: TopBarMessage[]): Promise<void> {
  localStorage.setItem(`vendpro_topbar_${companyId}`, JSON.stringify(messages));

  if (!supabase) return;
  
  try {
    await supabase.from('top_bar_messages').delete().eq('company_id', companyId);
    if (messages.length > 0) {
      await supabase.from('top_bar_messages').insert(messages.map(({ id, ...rest }) => ({ ...rest, company_id: companyId })));
    }
  } catch (err) {
    console.error('Error saving top bar messages to Supabase:', err);
  }
}
