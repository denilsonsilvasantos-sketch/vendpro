import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product, Category } from '../types';
import { searchProductByImage } from '../services/aiService';
import ProductFormModal from '../components/ProductFormModal';
import { AlertTriangle, Edit, Check, X, Image as ImageIcon, Tag, Loader2, ChevronDown, Sparkles, Search, Filter, Mic, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Pendencias({ companyId, onRefresh }: { companyId: string | null, onRefresh?: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Seu navegador não suporta busca por voz.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
    };
    recognition.start();
  };

  const handlePhotoSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const keywords = await searchProductByImage(base64, file.type);
        if (keywords) {
          setSearchTerm(keywords);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  async function fetchPendencies() {
    if (!supabase || companyId === null) return;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId);
      
    const { data: bData } = await supabase.from('brands').select('*').eq('company_id', companyId);
    
    if (error) {
      console.error(error);
    } else {
      const brandsData = bData || [];
      const pendingProducts = (data || []).filter(p => !p.category_id || !p.imagem);
      const productsWithMargin = pendingProducts.map(p => {
        const brand = brandsData.find(b => b.id === p.brand_id);
        const margin = brand?.margin_percentage || 0;
        return {
          ...p,
          categoria_pendente: !p.category_id,
          imagem_pendente: !p.imagem,
          preco_unitario: margin > 0 ? p.preco_unitario * (1 + margin / 100) : p.preco_unitario,
          preco_box: margin > 0 ? p.preco_box * (1 + margin / 100) : p.preco_box,
        };
      });

      const sortedData = productsWithMargin.sort((a, b) => {
        if (a.imagem_pendente && !b.imagem_pendente) return -1;
        if (!a.imagem_pendente && b.imagem_pendente) return 1;
        
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      setProducts(sortedData);
    }
    
    const { data: catData } = await supabase.from('categories').select('*').eq('company_id', companyId);
    setCategories(catData || []);
    
    setLoading(false);
  }

  const handleDelete = async (id: string) => {
    if (!supabase || !confirm('Deseja realmente excluir este produto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else fetchPendencies();
  };

  const handleDeleteAll = async () => {
    if (!supabase || products.length === 0 || !confirm(`Deseja realmente excluir TODOS os ${products.length} produtos pendentes?`)) return;
    const { error } = await supabase.from('products').delete().in('id', products.map(p => p.id));
    if (error) alert('Erro ao excluir todos: ' + error.message);
    else fetchPendencies();
  };

  useEffect(() => {
    fetchPendencies();
  }, [companyId]);

  const filteredProducts = products.filter(p => {
    const searchLower = searchTerm.trim().toLowerCase();
    if (!searchLower) return true;
    
    const searchTerms = searchLower.split(/\s+/);
    const nome = (p.nome || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    
    return searchTerms.every(term => nome.includes(term) || sku.includes(term));
  });

  if (loading && products.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-6 animate-pulse">
        <div className="w-16 h-16 bg-amber-50 rounded-[24px] flex items-center justify-center text-amber-500 border border-amber-100 shadow-inner">
          <Loader2 className="animate-spin" size={32} />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Analisando pendências...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 lg:p-8 max-w-6xl xl:max-w-7xl mx-auto space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100 shadow-inner">
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Pendências de Revisão</h1>
              <p className="text-sm md:text-base text-slate-500 font-medium">Produtos que precisam de atenção antes de irem ao catálogo</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 text-amber-600 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-amber-100 shadow-lg shadow-amber-500/5 flex items-center gap-3 self-start md:self-center">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          {products.length} itens aguardando
        </div>
        {products.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
          >
            <AlertTriangle size={14} />
            Excluir Tudo
          </button>
        )}
      </div>

      <div className="relative group max-w-md">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Buscar nas pendências (Nome ou SKU)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-11 pr-24 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-sm"
        />
        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
          <button
            onClick={startVoiceSearch}
            className={`p-1.5 rounded-full transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-50 hover:text-primary'}`}
            title="Busca por voz"
          >
            <Mic size={14} />
          </button>
          <button
            onClick={() => photoInputRef.current?.click()}
            className={`p-1.5 rounded-full transition-all ${isAnalyzingPhoto ? 'bg-primary text-white animate-spin' : 'text-slate-400 hover:bg-slate-50 hover:text-primary'}`}
            title="Busca por foto"
          >
            {isAnalyzingPhoto ? <Loader2 size={14} /> : <Camera size={14} />}
          </button>
        </div>
        <input 
          type="file" 
          ref={photoInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handlePhotoSearch} 
        />
      </div>
      
      <AnimatePresence mode="popLayout">
        {products.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-20 rounded-[40px] border-2 border-dashed border-slate-100 text-center space-y-8 shadow-inner neumorphic-shadow"
          >
            <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
              <Check className="text-emerald-500" size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Tudo revisado!</h2>
              <p className="text-slate-400 max-w-sm mx-auto font-medium text-sm">Não há produtos pendentes de revisão no momento. Seu catálogo está pronto para brilhar.</p>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredProducts.map((product, index) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                key={product.id} 
                className={`bg-white h-[70px] rounded-[10px] shadow-sm transition-all duration-300 border flex items-center px-3 gap-4 ${editingProduct?.id === product.id ? 'border-primary/40 ring-4 ring-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="relative shrink-0">
                  <div className="w-14 h-14 bg-slate-50 rounded-[8px] flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">
                    {product.imagem ? (
                      <img 
                        src={product.imagem}
                        alt={product.nome} 
                        className="w-full h-full object-contain p-1 bg-white" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ImageIcon className="text-slate-200" size={24} strokeWidth={1} />
                    )}
                  </div>
                </div>
                
                <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
                  <div className="flex flex-col justify-center min-w-0">
                    <h3 className="font-black text-[11px] text-slate-900 leading-tight tracking-tight uppercase truncate">
                      {product.nome}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SKU: {product.sku}</span>
                      <span className="text-[11px] font-black text-primary">R$ {(product.preco_unitario || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:flex gap-1">
                      {product.categoria_pendente && (
                        <span className="text-[8px] uppercase tracking-widest bg-amber-50 text-amber-600 px-[6px] py-[2px] rounded-[20px] font-black border border-amber-100 flex items-center gap-1">
                          <Tag size={8} strokeWidth={3} /> CAT
                        </span>
                      )}
                      {product.imagem_pendente && (
                        <span className="text-[8px] uppercase tracking-widest bg-rose-50 text-rose-600 px-[6px] py-[2px] rounded-[20px] font-black border border-rose-100 flex items-center gap-1">
                          <ImageIcon size={8} strokeWidth={3} /> IMG
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="px-[10px] py-[5px] text-primary bg-primary/5 hover:bg-primary hover:text-white rounded-[6px] transition-all flex items-center gap-2 font-black text-[9px] uppercase tracking-widest active:scale-95"
                      >
                        <Edit size={10} strokeWidth={3} /> Revisar
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        title="Excluir produto permanentemente"
                      >
                        <AlertTriangle size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingProduct && (
          <ProductFormModal
            onClose={() => setEditingProduct(null)}
            onSave={() => { setEditingProduct(null); fetchPendencies(); if (onRefresh) onRefresh(); }}
            product={editingProduct}
            companyId={companyId}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

