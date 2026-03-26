import { supabase } from '../integrations/supabaseClient';
import { BannerData, TopBarMessage } from '../types';

export async function getBanners(companyId: string): Promise<BannerData[]> {
  const saved = localStorage.getItem(`vendpro_banners_${companyId}`);
  const localBanners = saved ? JSON.parse(saved) : [];

  if (!supabase) return localBanners;
  
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('company_id', companyId)
    .order('order_index');
    
  if (error) {
    if (error.code !== 'PGRST205') {
      console.error('Error fetching banners from Supabase:', error);
    }
    return localBanners;
  }
  
  const mappedData = (data || []).map((b: any) => ({
    ...b,
    imageUrl: b.imageUrl || b.image_url,
    sub: b.sub || b.subtitle
  }));

  return mappedData.length > 0 ? mappedData : localBanners;
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
      const toInsert = banners.map(({ id, ...rest }) => ({
        ...rest,
        company_id: companyId,
        image_url: rest.imageUrl,
        subtitle: rest.sub
      }));
      await supabase.from('banners').insert(toInsert);
    }
  } catch (err) {
    console.error('Error saving banners to Supabase:', err);
  }
}

export async function getTopBarMessages(companyId: string): Promise<TopBarMessage[]> {
  const saved = localStorage.getItem(`vendpro_topbar_${companyId}`);
  const localMessages = saved ? JSON.parse(saved) : [];

  if (!supabase) return localMessages;
  
  const { data, error } = await supabase
    .from('top_bar_messages')
    .select('*')
    .eq('company_id', companyId)
    .order('order_index');
    
  if (error) {
    if (error.code !== 'PGRST205') {
      console.error('Error fetching top bar messages from Supabase:', error);
    }
    return localMessages;
  }
  
  return data && data.length > 0 ? data : localMessages;
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
