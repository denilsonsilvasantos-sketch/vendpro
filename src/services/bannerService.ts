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
  
  return data && data.length > 0 ? data : localBanners;
}

export async function saveBanners(companyId: string, banners: BannerData[]): Promise<void> {
  // Save to localStorage as primary for now to avoid DB errors if table doesn't exist
  localStorage.setItem(`vendpro_banners_${companyId}`, JSON.stringify(banners));

  if (!supabase) return;
  
  // Try to save to Supabase
  try {
    // Delete existing
    const { error: deleteError } = await supabase.from('banners').delete().eq('company_id', companyId);
    if (deleteError) {
      console.warn('Could not delete banners (maybe table missing?):', deleteError.message);
      return; // Stop if delete fails
    }

    // Insert new
    if (banners.length > 0) {
      const toInsert = banners.map(({ id, ...rest }) => ({
        company_id: companyId,
        tag: rest.tag,
        title: rest.title,
        sub: rest.sub,
        cta: rest.cta,
        className: rest.className,
        image_url: rest.image_url,
        link_url: rest.link_url,
        visuals: rest.visuals,
        order_index: rest.order_index,
      }));

      const { error: insertError } = await supabase.from('banners').insert(toInsert);
      if (insertError) {
        console.error('Error inserting banners:', insertError);
      }
    }
  } catch (err) {
    console.error('Unexpected error saving banners to Supabase:', err);
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
