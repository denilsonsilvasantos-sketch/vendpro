import { useState, useEffect } from 'react';
import { BannerData, TopBarMessage } from '../types';
import { getBanners, saveBanners, getTopBarMessages, saveTopBarMessages } from '../services/bannerService';
import { Plus, Trash2, Save, MoveUp, MoveDown, Layout, Type, Image as ImageIcon, Link as LinkIcon, ShoppingBag, Sparkles, Loader2, ChevronRight, Palette, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BannerManager({ companyId }: { companyId: string }) {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [topBarMessages, setTopBarMessages] = useState<TopBarMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [b, t] = await Promise.all([
        getBanners(companyId),
        getTopBarMessages(companyId)
      ]);
      setBanners(b);
      setTopBarMessages(t);
      setLoading(false);
    }
    load();
  }, [companyId]);

  const handleAddBanner = () => {
    const newBanner: BannerData = {
      id: Math.random().toString(36).substr(2, 9),
      company_id: companyId,
      tag: '',
      title: '',
      sub: '',
      cta: '',
      className: 'bg-slate-900',
      imageUrl: '',
      visuals: [],
      order_index: banners.length
    };
    setBanners([...banners, newBanner]);
  };

  const handleRemoveBanner = (id: string) => {
    setBanners(banners.filter(b => b.id !== id));
  };

  const handleUpdateBanner = (id: string, updates: Partial<BannerData>) => {
    setBanners(banners.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleAddTopBar = () => {
    const newMessage: TopBarMessage = {
      id: Math.random().toString(36).substr(2, 9),
      company_id: companyId,
      text: 'Nova mensagem do Top Bar',
      order_index: topBarMessages.length
    };
    setTopBarMessages([...topBarMessages, newMessage]);
  };

  const handleRemoveTopBar = (id: string) => {
    setTopBarMessages(topBarMessages.filter(m => m.id !== id));
  };

  const handleUpdateTopBar = (id: string, text: string) => {
    setTopBarMessages(topBarMessages.map(m => m.id === id ? { ...m, text } : m));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveBanners(companyId, banners),
        saveTopBarMessages(companyId, topBarMessages)
      ]);
      console.log('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-6 animate-pulse">
        <div className="w-16 h-16 bg-primary/5 rounded-[24px] flex items-center justify-center text-primary border border-primary/10 shadow-inner">
          <Loader2 className="animate-spin" size={32} />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Carregando personalização...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-20 pb-40"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary/10 rounded-[24px] flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <Palette size={32} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Personalização</h1>
              <p className="text-slate-500 font-medium text-lg">Gerencie a identidade visual e os destaques do seu catálogo</p>
            </div>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-10 py-6 rounded-[32px] font-black uppercase tracking-widest text-xs flex items-center gap-4 shadow-2xl shadow-primary/40 hover:-translate-y-1 active:translate-y-0 transition-all w-full md:w-auto justify-center group disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={24} strokeWidth={3} /> : <Save size={24} strokeWidth={3} />}
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {/* Top Bar Section */}
      <section className="space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-50 rounded-[28px] flex items-center justify-center text-amber-500 border border-amber-100 shadow-inner">
              <Megaphone size={32} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Mensagens do Top Bar</h2>
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">Avisos e promoções no topo do catálogo</p>
            </div>
          </div>
          <button 
            onClick={handleAddTopBar}
            className="flex items-center gap-4 px-8 py-4 bg-white text-slate-600 rounded-[24px] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-slate-50 transition-all border border-slate-100 shadow-sm active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            Adicionar Mensagem
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {topBarMessages.map((msg, index) => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={msg.id} 
                className="flex items-center gap-8 bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/30 group hover:border-primary/40 transition-all"
              >
                <div className="w-14 h-14 bg-slate-50 rounded-[20px] flex items-center justify-center text-sm font-black text-slate-300 group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0 shadow-inner">
                  {index + 1}
                </div>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={msg.text}
                    onChange={(e) => handleUpdateTopBar(msg.id, e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-lg font-black text-slate-700 placeholder:text-slate-300 tracking-tight"
                    placeholder="Digite a mensagem que aparecerá no topo..."
                  />
                  <div className="absolute -bottom-2 left-0 w-0 h-1 bg-primary group-hover:w-full transition-all duration-700 rounded-full opacity-20" />
                </div>
                <button 
                  onClick={() => handleRemoveTopBar(msg.id)}
                  className="w-14 h-14 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-[20px] transition-all active:scale-90 shadow-sm hover:shadow-xl"
                >
                  <Trash2 size={24} strokeWidth={2.5} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {topBarMessages.length === 0 && (
            <div className="text-center py-32 bg-slate-50/50 rounded-[56px] border-2 border-dashed border-slate-100 shadow-inner">
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[11px]">Nenhuma mensagem configurada</p>
            </div>
          )}
        </div>
      </section>

      {/* Banners Section */}
      <section className="space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary/5 rounded-[28px] flex items-center justify-center text-primary border border-primary/10 shadow-inner">
              <Layout size={32} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Banners Rotativos</h2>
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">Destaques visuais principais do catálogo</p>
            </div>
          </div>
          <button 
            onClick={handleAddBanner}
            className="flex items-center gap-4 px-10 py-5 bg-primary text-white rounded-[32px] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            Adicionar Novo Banner
          </button>
        </div>

        <div className="grid grid-cols-1 gap-16">
          <AnimatePresence mode="popLayout">
            {banners.map((banner, index) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={banner.id} 
                className="bg-white rounded-[64px] p-12 border border-slate-100 shadow-2xl shadow-slate-200/60 space-y-12 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-4 h-full bg-slate-50 group-hover:bg-primary transition-colors duration-700" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[24px] bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-2xl shadow-slate-900/40">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 tracking-tight uppercase text-lg">Configurações do Banner</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">ID: {banner.id}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveBanner(banner.id)}
                    className="flex items-center gap-4 px-8 py-4 text-rose-500 bg-rose-50/50 hover:bg-rose-500 hover:text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 shadow-sm hover:shadow-xl"
                  >
                    <Trash2 size={20} strokeWidth={3} />
                    Remover Banner
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Link da Imagem de Fundo</label>
                      <div className="flex items-center bg-slate-50 rounded-[32px] px-8 py-6 border border-slate-100 focus-within:border-primary/40 focus-within:ring-8 focus-within:ring-primary/5 transition-all shadow-inner">
                        <ImageIcon size={24} strokeWidth={2} className="text-slate-300 mr-6" />
                        <input 
                          type="text" 
                          value={banner.imageUrl || ''}
                          onChange={(e) => handleUpdateBanner(banner.id, { imageUrl: e.target.value })}
                          className="flex-1 bg-transparent border-none outline-none text-base font-bold text-slate-700 placeholder:text-slate-300"
                          placeholder="https://res.cloudinary.com/..."
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Tag (Texto acima)</label>
                        <input 
                          type="text" 
                          value={banner.tag || ''}
                          onChange={(e) => handleUpdateBanner(banner.id, { tag: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-[32px] px-8 py-6 text-base font-bold text-slate-700 outline-none focus:border-primary/40 focus:ring-8 focus:ring-primary/5 transition-all shadow-inner"
                          placeholder="Ex: Coleção 2026"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Texto do Botão</label>
                        <input 
                          type="text" 
                          value={banner.cta || ''}
                          onChange={(e) => handleUpdateBanner(banner.id, { cta: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-[32px] px-8 py-6 text-base font-bold text-slate-700 outline-none focus:border-primary/40 focus:ring-8 focus:ring-primary/5 transition-all shadow-inner"
                          placeholder="Ex: Ver Mais"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Título (Use \n para quebrar linha)</label>
                      <textarea 
                        value={banner.title || ''}
                        onChange={(e) => handleUpdateBanner(banner.id, { title: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-[40px] px-10 py-8 text-2xl font-black text-slate-900 outline-none focus:border-primary/40 focus:ring-8 focus:ring-primary/5 transition-all h-48 resize-none tracking-tight leading-tight shadow-inner"
                        placeholder="Ex: Beleza que\nTransforma"
                      />
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Subtítulo</label>
                      <input 
                        type="text" 
                        value={banner.sub || ''}
                        onChange={(e) => handleUpdateBanner(banner.id, { sub: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-[32px] px-8 py-6 text-base font-bold text-slate-700 outline-none focus:border-primary/40 focus:ring-8 focus:ring-primary/5 transition-all shadow-inner"
                        placeholder="Ex: Descubra os melhores cosméticos..."
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Link de Destino</label>
                      <div className="flex items-center bg-slate-50 rounded-[32px] px-8 py-6 border border-slate-100 focus-within:border-primary/40 focus-within:ring-8 focus-within:ring-primary/5 transition-all shadow-inner">
                        <LinkIcon size={24} strokeWidth={2} className="text-slate-300 mr-6" />
                        <input 
                          type="text" 
                          value={banner.link || ''}
                          onChange={(e) => handleUpdateBanner(banner.id, { link: e.target.value })}
                          className="flex-1 bg-transparent border-none outline-none text-base font-bold text-slate-700 placeholder:text-slate-300"
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Estilo CSS / Cor de Fundo</label>
                      <input 
                        type="text" 
                        value={banner.className || ''}
                        onChange={(e) => handleUpdateBanner(banner.id, { className: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-[32px] px-8 py-6 text-[11px] font-mono font-black text-slate-400 outline-none focus:border-primary/40 focus:ring-8 focus:ring-primary/5 transition-all uppercase tracking-widest shadow-inner"
                        placeholder="Ex: bg-slate-900"
                      />
                    </div>

                    <div className="p-10 bg-slate-50/50 rounded-[56px] border border-slate-100 space-y-8 shadow-inner">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                          <ShoppingBag size={24} className="text-primary" />
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Produtos em Destaque</label>
                        </div>
                        <button 
                          onClick={() => {
                            const newVisuals = [...(banner.visuals || []), { emoji: '🎁', name: 'Novo Item', price: 'R$ 0,00' }];
                            handleUpdateBanner(banner.id, { visuals: newVisuals });
                          }}
                          className="text-[11px] font-black text-primary hover:text-primary/70 uppercase tracking-[0.3em] flex items-center gap-3 transition-all"
                        >
                          <Plus size={18} strokeWidth={3} /> Adicionar
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <AnimatePresence mode="popLayout">
                          {(banner.visuals || []).map((v, vIndex) => (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              key={vIndex} 
                              className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center gap-6 relative group/item shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 transition-all"
                            >
                              <button 
                                onClick={() => {
                                  const newVisuals = (banner.visuals || []).filter((_, i) => i !== vIndex);
                                  handleUpdateBanner(banner.id, { visuals: newVisuals });
                                }}
                                className="absolute -top-3 -right-3 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-2xl active:scale-90 z-10"
                              >
                                <Trash2 size={18} strokeWidth={2.5} />
                              </button>
                              <input 
                                type="text" 
                                value={v.emoji}
                                onChange={(e) => {
                                  const newVisuals = [...(banner.visuals || [])];
                                  newVisuals[vIndex].emoji = e.target.value;
                                  handleUpdateBanner(banner.id, { visuals: newVisuals });
                                }}
                                className="w-16 h-16 bg-slate-50 rounded-[20px] text-center text-3xl outline-none border border-slate-100 shadow-inner shrink-0"
                              />
                              <div className="flex-1 min-w-0 space-y-2">
                                <input 
                                  type="text" 
                                  value={v.name}
                                  onChange={(e) => {
                                    const newVisuals = [...(banner.visuals || [])];
                                    newVisuals[vIndex].name = e.target.value;
                                    handleUpdateBanner(banner.id, { visuals: newVisuals });
                                  }}
                                  className="w-full bg-transparent border-none text-[11px] font-black text-slate-900 outline-none truncate uppercase tracking-tight"
                                  placeholder="Nome"
                                />
                                <input 
                                  type="text" 
                                  value={v.price}
                                  onChange={(e) => {
                                    const newVisuals = [...(banner.visuals || [])];
                                    newVisuals[vIndex].price = e.target.value;
                                    handleUpdateBanner(banner.id, { visuals: newVisuals });
                                  }}
                                  className="w-full bg-transparent border-none text-[11px] text-primary font-black outline-none tracking-tighter"
                                  placeholder="Preço"
                                />
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
    </motion.div>
  );
}

