import React, { useState, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Brand, Category } from '../types';
import { X, Upload, Loader2, CheckCircle2, AlertCircle, Package, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BulkUploadResult {
  filename: string;
  sku: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
}

export default function BulkImageUploadModal({ 
  onClose, 
  onComplete, 
  companyId,
  brands,
  categories 
}: { 
  onClose: () => void, 
  onComplete: () => void, 
  companyId: string | null,
  brands: Brand[],
  categories: Category[]
}) {
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<BulkUploadResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    
    const initialResults: BulkUploadResult[] = selectedFiles.map(file => {
      // Remove extension and take the name as SKU
      const sku = file.name.split('.').slice(0, -1).join('.').trim().toUpperCase();
      return {
        filename: file.name,
        sku,
        status: 'pending'
      };
    });
    setResults(initialResults);
  };

  const processUploads = async () => {
    if (!supabase || !companyId || !selectedBrand) {
      alert('Selecione uma marca antes de continuar.');
      return;
    }

    setIsProcessing(true);
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert('Configurações do Cloudinary não encontradas.');
      setIsProcessing(false);
      return;
    }

    const updatedResults = [...results];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sku = updatedResults[i].sku;

      updatedResults[i].status = 'uploading';
      setResults([...updatedResults]);

      try {
        // 1. Find the product
        let query = supabase
          .from('products')
          .select('id, imagens')
          .eq('company_id', companyId)
          .eq('brand_id', selectedBrand)
          .eq('sku', sku);
        
        if (selectedCategory) {
          query = query.eq('category_id', selectedCategory);
        }

        const { data: product, error: findError } = await query.maybeSingle();

        if (findError || !product) {
          updatedResults[i].status = 'error';
          updatedResults[i].message = 'Produto não encontrado com este SKU nesta marca.';
          setResults([...updatedResults]);
          continue;
        }

        // 2. Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (!data.secure_url) {
          throw new Error('Falha no upload para Cloudinary');
        }

        const imageUrl = data.secure_url;

        // 3. Update product in Supabase
        const currentImagens = product.imagens || [];
        const newImagens = currentImagens.includes(imageUrl) 
          ? currentImagens 
          : [imageUrl, ...currentImagens];

        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            imagem: imageUrl,
            imagens: newImagens,
            imagem_pendente: false
          })
          .eq('id', product.id);

        if (updateError) throw updateError;

        updatedResults[i].status = 'success';
        updatedResults[i].message = 'Vinculado com sucesso!';
      } catch (error: any) {
        console.error(`Erro ao processar ${file.name}:`, error);
        updatedResults[i].status = 'error';
        updatedResults[i].message = error.message || 'Erro desconhecido';
      }
      
      setResults([...updatedResults]);
    }

    setIsProcessing(false);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white p-6 md:p-10 rounded-[32px] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20"
      >
        <div className="flex justify-between items-center mb-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <Upload size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Vincular Fotos por SKU</h2>
              <p className="text-slate-500 text-[12px] font-medium">O sistema identificará o produto pelo nome do arquivo.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600">
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] ml-2">Marca</label>
              <div className="relative group">
                <select 
                  className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none appearance-none transition-all font-black uppercase tracking-widest text-[11px] text-slate-600 cursor-pointer shadow-inner"
                  value={selectedBrand}
                  onChange={e => {
                    setSelectedBrand(e.target.value);
                    setSelectedCategory('');
                  }}
                  disabled={isProcessing}
                >
                  <option value="">Selecionar Marca</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] ml-2">Categoria (Opcional)</label>
              <div className="relative group">
                <select 
                  className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none appearance-none transition-all font-black uppercase tracking-widest text-[11px] text-slate-600 cursor-pointer shadow-inner disabled:opacity-50"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  disabled={!selectedBrand || isProcessing}
                >
                  <option value="">Todas as Categorias</option>
                  {categories
                    .filter(c => c.brand_id === selectedBrand)
                    .map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div 
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[32px] p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${files.length > 0 ? 'bg-primary/5 border-primary/30' : 'bg-slate-50 border-slate-200 hover:border-primary/30 hover:bg-primary/5'}`}
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-sm ${files.length > 0 ? 'bg-primary text-white' : 'bg-white text-slate-300'}`}>
                <ImageIcon size={32} />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {files.length > 0 ? `${files.length} arquivos selecionados` : 'Clique para selecionar as fotos'}
                </p>
                <p className="text-xs text-slate-400 font-medium mt-1">Formatos aceitos: JPG, PNG, WEBP</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                accept="image/*" 
                onChange={handleFileSelection}
                disabled={isProcessing}
              />
            </div>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fila de Processamento</h3>
                <div className="flex gap-3">
                  {successCount > 0 && <span className="text-[9px] font-black text-emerald-500 uppercase">{successCount} Sucessos</span>}
                  {errorCount > 0 && <span className="text-[9px] font-black text-rose-500 uppercase">{errorCount} Erros</span>}
                </div>
              </div>
              
              <div className="space-y-2">
                {results.map((res, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-300 border border-slate-100">
                        <ImageIcon size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{res.filename}</p>
                        <p className="text-[9px] text-slate-400 font-bold">SKU: {res.sku}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {res.status === 'pending' && <span className="text-[8px] font-black text-slate-300 uppercase">Aguardando</span>}
                      {res.status === 'uploading' && <Loader2 className="animate-spin text-primary" size={16} />}
                      {res.status === 'success' && <CheckCircle2 className="text-emerald-500" size={16} />}
                      {res.status === 'error' && (
                        <div className="flex items-center gap-2 group relative">
                          <AlertCircle className="text-rose-500" size={16} />
                          <span className="absolute right-full mr-2 bg-rose-500 text-white text-[8px] font-bold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            {res.message}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-50 shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isProcessing}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-[2px] hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={processUploads}
            disabled={isProcessing || files.length === 0 || !selectedBrand}
            className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[2px] shadow-xl shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={20} strokeWidth={3} />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle2 size={20} strokeWidth={3} />
                Vincular {files.length} Fotos
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
