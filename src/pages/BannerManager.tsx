import { useState, useEffect } from 'react';
import { BannerData, TopBarMessage } from '../types';
import { getBanners, saveBanners, getTopBarMessages, saveTopBarMessages } from '../services/bannerService';
import { Plus, Trash2, Save, MoveUp, MoveDown, Layout, Type, Image as ImageIcon, Link as LinkIcon, ShoppingBag } from 'lucide-react';
import { Card } from '../components/Card';

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
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gerenciar Banners e Top Bar</h1>
          <p className="text-slate-500">Personalize a aparência do seu catálogo</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 pink-gradient text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Save size={20} />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {/* Top Bar Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-slate-800">Mensagens do Top Bar</h2>
          </div>
          <button 
            onClick={handleAddTopBar}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            <Plus size={18} />
            Adicionar Mensagem
          </button>
        </div>

        <div className="space-y-3">
          {topBarMessages.map((msg, index) => (
            <div key={msg.id} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-xs font-bold text-slate-300 w-6">{index + 1}</span>
              <input 
                type="text" 
                value={msg.text}
                onChange={(e) => handleUpdateTopBar(msg.id, e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700"
                placeholder="Digite a mensagem..."
              />
              <button 
                onClick={() => handleRemoveTopBar(msg.id)}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Banners Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layout className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-slate-800">Banners Rotativos</h2>
          </div>
          <button 
            onClick={handleAddBanner}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            <Plus size={18} />
            Adicionar Banner
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {banners.map((banner, index) => (
            <Card key={banner.id} className="p-6 space-y-6 border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs">{index + 1}</span>
                  Configurações do Banner
                </h3>
                <button 
                  onClick={() => handleRemoveBanner(banner.id)}
                  className="flex items-center gap-2 px-3 py-1.5 text-rose-500 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all"
                >
                  <Trash2 size={16} />
                  Remover
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Link da Imagem de Fundo (Cloudinary)</label>
                    <div className="flex items-center bg-slate-50 rounded-xl px-4 py-3">
                      <ImageIcon size={16} className="text-slate-400 mr-2" />
                      <input 
                        type="text" 
                        value={banner.imageUrl || ''}
                        onChange={(e) => handleUpdateBanner(banner.id, { imageUrl: e.target.value })}
                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
                        placeholder="https://res.cloudinary.com/..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tag (Opcional - Texto acima)</label>
                    <input 
                      type="text" 
                      value={banner.tag || ''}
                      onChange={(e) => handleUpdateBanner(banner.id, { tag: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Ex: Coleção 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Título (Opcional - \n para quebra)</label>
                    <textarea 
                      value={banner.title || ''}
                      onChange={(e) => handleUpdateBanner(banner.id, { title: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 h-24"
                      placeholder="Ex: Beleza que\nTransforma"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Subtítulo (Opcional)</label>
                    <input 
                      type="text" 
                      value={banner.sub || ''}
                      onChange={(e) => handleUpdateBanner(banner.id, { sub: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Ex: Descubra os melhores cosméticos..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Texto do Botão (Opcional)</label>
                    <input 
                      type="text" 
                      value={banner.cta || ''}
                      onChange={(e) => handleUpdateBanner(banner.id, { cta: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Ex: Ver Mais"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cor de Fundo / CSS (Se não houver imagem)</label>
                    <input 
                      type="text" 
                      value={banner.className || ''}
                      onChange={(e) => handleUpdateBanner(banner.id, { className: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Ex: bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Link de Destino (Saiba Mais)</label>
                    <div className="flex items-center bg-slate-50 rounded-xl px-4 py-3">
                      <LinkIcon size={16} className="text-slate-400 mr-2" />
                      <input 
                        type="text" 
                        value={banner.link || ''}
                        onChange={(e) => handleUpdateBanner(banner.id, { link: e.target.value })}
                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Visuals Editor */}
              <div className="pt-6 border-t border-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produtos em Destaque (Visuals)</label>
                  <button 
                    onClick={() => {
                      const newVisuals = [...(banner.visuals || []), { emoji: '🎁', name: 'Novo Item', price: 'R$ 0,00' }];
                      handleUpdateBanner(banner.id, { visuals: newVisuals });
                    }}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    + Adicionar Item
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(banner.visuals || []).map((v, vIndex) => (
                    <div key={vIndex} className="bg-slate-50 p-4 rounded-2xl space-y-3 relative group">
                      <button 
                        onClick={() => {
                          const newVisuals = (banner.visuals || []).filter((_, i) => i !== vIndex);
                          handleUpdateBanner(banner.id, { visuals: newVisuals });
                        }}
                        className="absolute top-2 right-2 p-1 text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="flex items-center gap-3">
                        <input 
                          type="text" 
                          value={v.emoji}
                          onChange={(e) => {
                            const newVisuals = [...(banner.visuals || [])];
                            newVisuals[vIndex].emoji = e.target.value;
                            handleUpdateBanner(banner.id, { visuals: newVisuals });
                          }}
                          className="w-10 h-10 bg-white rounded-xl text-center text-xl outline-none"
                        />
                        <div className="flex-1 space-y-1">
                          <input 
                            type="text" 
                            value={v.name}
                            onChange={(e) => {
                              const newVisuals = [...(banner.visuals || [])];
                              newVisuals[vIndex].name = e.target.value;
                              handleUpdateBanner(banner.id, { visuals: newVisuals });
                            }}
                            className="w-full bg-transparent border-none text-xs font-bold outline-none"
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
                            className="w-full bg-transparent border-none text-[10px] text-primary font-bold outline-none"
                            placeholder="Preço"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
