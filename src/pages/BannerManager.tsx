import { useState, useEffect } from 'react';
import { BannerData, TopBarMessage } from '../types';
import { getBanners, saveBanners, getTopBarMessages, saveTopBarMessages } from '../services/bannerService';
import { Plus, Trash2, Save, Layout, Image as ImageIcon, Link as LinkIcon, ShoppingBag, Loader2, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BannerManager({ companyId }: { companyId: string }) {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [topBarMessages, setTopBarMessages] = useState<TopBarMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [b, t] = await Promise.all([getBanners(companyId), getTopBarMessages(companyId)]);
      setBanners(b); setTopBarMessages(t); setLoading(false);
    }
    load();
  }, [companyId]);

  const handleAddBanner = () => setBanners([...banners, { id: Math.random().toString(36).substr(2, 9), company_id: companyId, tag: '', title: '', sub: '', cta: '', className: 'bg-slate-900', image_url: '', visuals: [], order_index: banners.length }]);
  const handleRemoveBanner = (id: string) => setBanners(banners.filter(b => b.id !== id));
  const handleUpdateBanner = (id: string, updates: Partial<BannerData>) => setBanners(banners.map(b => b.id === id ? { ...b, ...updates } : b));
  const handleAddTopBar = () => setTopBarMessages([...topBarMessages, { id: Math.random().toString(36).substr(2, 9), company_id: companyId, text: 'Nova mensagem', order_index: topBarMessages.length }]);
  const handleRemoveTopBar = (id: string) => setTopBarMessages(topBarMessages.filter(m => m.id !== id));
  const handleUpdateTopBar = (id: string, text: string) => setTopBarMessages(topBarMessages.map(m => m.id === id ? { ...m, text } : m));
  const handleSave = async () => {
    setSaving(true);
    try { await Promise.all([saveBanners(companyId, banners), saveTopBarMessages(companyId, topBarMessages)]); }
    catch (err) { console.error('Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[300px]">
      <Loader2 className="animate-spin text-primary" size={24} />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Layout size={16} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Personalização</h1>
            <p className="text-xs text-slate-400">Banners e mensagens do catálogo</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50">
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Top Bar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Megaphone size={14} className="text-amber-500" />
            <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Mensagens do Top Bar</span>
          </div>
          <button onClick={handleAddTopBar} className="text-primary text-xs font-bold flex items-center gap-1 hover:opacity-70 transition-opacity">
            <Plus size={12} strokeWidth={3} /> Adicionar
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          <AnimatePresence mode="popLayout">
            {topBarMessages.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-300 font-medium">Nenhuma mensagem configurada</div>
            ) : topBarMessages.map((msg, index) => (
              <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.98 }} key={msg.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-[9px] font-black text-slate-300 w-4">{index + 1}</span>
                <input
                  type="text" value={msg.text}
                  onChange={e => handleUpdateTopBar(msg.id, e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder:text-slate-300"
                  placeholder="Digite a mensagem..."
                />
                <button onClick={() => handleRemoveTopBar(msg.id)} className="w-6 h-6 flex items-center justify-center text-slate-200 hover:text-rose-500 rounded-md transition-all">
                  <Trash2 size={12} strokeWidth={2.5} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Banners */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Banners Rotativos</span>
          <button onClick={handleAddBanner} className="text-primary text-xs font-bold flex items-center gap-1 hover:opacity-70 transition-opacity">
            <Plus size={12} strokeWidth={3} /> Novo Banner
          </button>
        </div>

        <AnimatePresence mode="popLayout">
          {banners.map((banner, index) => (
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} key={banner.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Banner preview strip */}
              <div className={`h-10 flex items-center px-4 justify-between ${banner.className || 'bg-slate-800'}`}
                style={banner.image_url ? { backgroundImage: `url(${banner.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                <span className="text-white text-xs font-bold truncate opacity-90">{banner.title || `Banner ${index + 1}`}</span>
                <button onClick={() => handleRemoveBanner(banner.id)} className="bg-rose-500 text-white rounded-md px-2 py-0.5 text-[9px] font-bold hover:bg-rose-600 transition-colors">Remover</button>
              </div>

              {/* Fields */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Imagem de Fundo (URL)</label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <ImageIcon size={12} className="text-slate-300 shrink-0" />
                    <input type="text" value={banner.image_url || ''} onChange={e => handleUpdateBanner(banner.id, { image_url: e.target.value })} className="flex-1 bg-transparent border-none outline-none text-xs text-slate-600 placeholder:text-slate-300" placeholder="https://res.cloudinary.com/..." />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tag</label>
                  <input type="text" value={banner.tag || ''} onChange={e => handleUpdateBanner(banner.id, { tag: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40" placeholder="Ex: Novidades" />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Botão CTA</label>
                  <input type="text" value={banner.cta || ''} onChange={e => handleUpdateBanner(banner.id, { cta: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40" placeholder="Ex: Ver Mais" />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Título</label>
                  <input type="text" value={banner.title || ''} onChange={e => handleUpdateBanner(banner.id, { title: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40" placeholder="Ex: Beleza que Transforma" />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Subtítulo</label>
                  <input type="text" value={banner.sub || ''} onChange={e => handleUpdateBanner(banner.id, { sub: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40" placeholder="Ex: Descubra os melhores..." />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Link</label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <LinkIcon size={12} className="text-slate-300 shrink-0" />
                    <input type="text" value={banner.link_url || ''} onChange={e => handleUpdateBanner(banner.id, { link_url: e.target.value })} className="flex-1 bg-transparent border-none outline-none text-xs text-slate-600 placeholder:text-slate-300" placeholder="https://..." />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Estilo CSS</label>
                  <input type="text" value={banner.className || ''} onChange={e => handleUpdateBanner(banner.id, { className: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-primary/40" placeholder="bg-slate-900" />
                </div>

                {/* Visuals */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><ShoppingBag size={10} /> Produtos em Destaque</label>
                    <button onClick={() => handleUpdateBanner(banner.id, { visuals: [...(banner.visuals || []), { emoji: '🎁', name: 'Novo Item', price: 'R$ 0,00' }] })} className="text-primary text-[9px] font-bold flex items-center gap-1 hover:opacity-70">
                      <Plus size={10} strokeWidth={3} /> Adicionar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <AnimatePresence mode="popLayout">
                      {(banner.visuals || []).map((v, vIndex) => (
                        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={vIndex} className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-2 relative group/v">
                          <button onClick={() => handleUpdateBanner(banner.id, { visuals: (banner.visuals || []).filter((_, i) => i !== vIndex) })} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/v:opacity-100 transition-all text-[8px]">×</button>
                          <input type="text" value={v.emoji} onChange={e => { const nv = [...(banner.visuals || [])]; nv[vIndex].emoji = e.target.value; handleUpdateBanner(banner.id, { visuals: nv }); }} className="w-8 h-8 bg-white rounded-md text-center text-base outline-none border border-slate-200 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <input type="text" value={v.name} onChange={e => { const nv = [...(banner.visuals || [])]; nv[vIndex].name = e.target.value; handleUpdateBanner(banner.id, { visuals: nv }); }} className="w-full bg-transparent border-none text-[9px] font-bold text-slate-700 outline-none truncate uppercase" placeholder="Nome" />
                            <input type="text" value={v.price} onChange={e => { const nv = [...(banner.visuals || [])]; nv[vIndex].price = e.target.value; handleUpdateBanner(banner.id, { visuals: nv }); }} className="w-full bg-transparent border-none text-[9px] text-primary font-bold outline-none" placeholder="Preço" />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {banners.length === 0 && (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-100 p-10 text-center">
            <p className="text-xs text-slate-300 font-medium">Nenhum banner criado</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
