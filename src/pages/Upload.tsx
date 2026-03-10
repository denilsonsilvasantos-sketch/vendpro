import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Trash2, Send, AlertTriangle } from 'lucide-react';
import { supabase } from '../integrations/supabaseClient';
import { extractProductsFromMedia, classifyCategory } from '../services/aiService';
import { Brand, Product } from '../types';

type CatalogType = 'weekly' | 'replenishment';

export default function UploadPage({ companyId }: { companyId: number | null }) {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [catalogType, setCatalogType] = useState<CatalogType>('weekly');
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File, base64: string }[]>([]);
  const [missingProducts, setMissingProducts] = useState<Product[]>([]);
  const [showMissingAlert, setShowMissingAlert] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchBrands() {
      if (!supabase || !companyId) return;
      const { data } = await supabase.from('brands').select('*').eq('company_id', companyId);
      setBrands(data || []);
      if (data && data.length > 0) setSelectedBrandId(data[0].id);
    }
    fetchBrands();
  }, [companyId]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles: { file: File, base64: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      newFiles.push({ file, base64 });
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processCatalog = async () => {
    if (!companyId || !selectedBrandId || uploadedFiles.length === 0 || !supabase) {
      setStatus({ type: 'error', message: 'Selecione uma marca e adicione arquivos primeiro.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: 'info', message: 'A IA está analisando os arquivos...' });
    setProgress(0);

    try {
      const { data: categories } = await supabase.from('categories').select('id, nome').eq('company_id', companyId).eq('brand_id', selectedBrandId);
      const processedSkus: string[] = [];
      let totalProducts = 0;

      for (let i = 0; i < uploadedFiles.length; i++) {
        const { file, base64 } = uploadedFiles[i];
        setStatus({ type: 'info', message: `Analisando arquivo ${i + 1} de ${uploadedFiles.length}: ${file.name}` });
        
        const extractedProducts = await extractProductsFromMedia(base64, file.type);
        totalProducts += extractedProducts.length;

        for (const extracted of extractedProducts) {
          const sku = extracted.sku || `SKU-${Math.random().toString(36).substr(2, 9)}`;
          processedSkus.push(sku);

          let categoriaId = null;
          let categoriaPendente = true;

          if (categories && categories.length > 0) {
            categoriaId = await classifyCategory(extracted.nome, categories);
            if (categoriaId) categoriaPendente = false;
          }

          const productData = {
            company_id: companyId,
            brand_id: selectedBrandId,
            sku: sku,
            nome: extracted.nome,
            descricao: extracted.descricao,
            preco_unitario: extracted.preco_unitario,
            preco_box: extracted.preco_box || 0,
            qtd_box: extracted.qtd_box || 1,
            venda_somente_box: extracted.venda_somente_box || false,
            categoria_id: categoriaId,
            categoria_pendente: categoriaPendente,
            imagem_pendente: true, // Sempre pendente para revisão de imagem
            last_seen_date: new Date().toISOString(),
            last_seen_catalog_type: catalogType,
            ativo: true
          };

          await supabase.from('products').upsert(productData, { onConflict: 'company_id, sku' });
        }
        setProgress(Math.round(((i + 1) / uploadedFiles.length) * 100));
      }

      // Se for catálogo semanal, identificar produtos ausentes
      if (catalogType === 'weekly') {
        const { data: existingProducts } = await supabase
          .from('products')
          .select('*')
          .eq('company_id', companyId)
          .eq('brand_id', selectedBrandId)
          .eq('ativo', true);

        if (existingProducts) {
          const missing = existingProducts.filter(p => !processedSkus.includes(p.sku));
          if (missing.length > 0) {
            setMissingProducts(missing);
            setShowMissingAlert(true);
          }
        }
      }

      setIsUploading(false);
      setUploadedFiles([]);
      setStatus({ 
        type: 'success', 
        message: `Processamento concluído! ${totalProducts} produtos identificados e enviados para pendências.` 
      });
    } catch (error: any) {
      console.error(error);
      setIsUploading(false);
      setStatus({ type: 'error', message: `Erro no processamento: ${error.message}` });
    }
  };

  const handleInactivateMissing = async (inactivate: boolean) => {
    if (!supabase || missingProducts.length === 0) return;

    if (inactivate) {
      const ids = missingProducts.map(p => p.id);
      await supabase.from('products').update({ ativo: false }).in('id', ids);
      setStatus({ type: 'success', message: `${missingProducts.length} produtos foram inativados.` });
    } else {
      setStatus({ type: 'info', message: `Os produtos ausentes foram mantidos como ativos.` });
    }
    
    setMissingProducts([]);
    setShowMissingAlert(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Upload de Catálogo</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setCatalogType('weekly')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${catalogType === 'weekly' ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}
          >
            Semanal
          </button>
          <button 
            onClick={() => setCatalogType('replenishment')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${catalogType === 'replenishment' ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}
          >
            Reposição
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2"><ImageIcon size={20} className="text-primary" /> Configurações</h2>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Marca do Catálogo</label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                value={selectedBrandId || ''}
                onChange={(e) => setSelectedBrandId(Number(e.target.value))}
              >
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.nome}</option>
                ))}
              </select>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
              <AlertCircle className="text-blue-500 shrink-0" size={20} />
              <p className="text-xs text-blue-700 leading-relaxed">
                {catalogType === 'weekly' 
                  ? 'O catálogo semanal atualizará os preços e identificará produtos que saíram de linha para esta marca.' 
                  : 'O catálogo de reposição apenas adicionará ou atualizará produtos específicos sem afetar o status dos outros.'}
              </p>
            </div>
          </div>

          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
              isUploading ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-slate-300 hover:border-primary hover:bg-primary/5 cursor-pointer'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept=".pdf,image/*" 
              multiple
              className="hidden" 
            />
            <Upload size={32} className="text-primary mb-2" />
            <h3 className="font-bold">Adicionar Arquivos</h3>
            <p className="text-xs text-slate-500">PDF, PNG ou JPG</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="font-bold mb-4 flex items-center justify-between">
            Arquivos na Fila
            <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500">{uploadedFiles.length} arquivos</span>
          </h2>
          
          <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-2">
            {uploadedFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <FileText size={40} className="mb-2 opacity-20" />
                <p className="text-sm italic">Nenhum arquivo selecionado</p>
              </div>
            ) : (
              uploadedFiles.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 bg-white rounded flex items-center justify-center border border-slate-200 shrink-0">
                      {item.file.type.includes('image') ? <ImageIcon size={16} className="text-blue-500" /> : <FileText size={16} className="text-red-500" />}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium truncate">{item.file.name}</p>
                      <p className="text-[10px] text-slate-400">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <button 
            disabled={isUploading || uploadedFiles.length === 0}
            onClick={processCatalog}
            className={`mt-6 w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              isUploading || uploadedFiles.length === 0 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-primary text-white shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processando... {progress}%
              </>
            ) : (
              <>
                <Send size={20} />
                Finalizar e Processar com IA
              </>
            )}
          </button>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
          status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          status.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          status.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {status.type === 'success' ? <CheckCircle2 className="shrink-0" /> : <AlertCircle className="shrink-0" />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      {showMissingAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} className="text-yellow-600" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Produtos Ausentes Detectados</h2>
              <p className="text-slate-500 text-sm">
                Identificamos <strong>{missingProducts.length} produtos</strong> que estavam no catálogo anterior mas não foram encontrados neste novo catálogo semanal.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleInactivateMissing(true)}
                className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
              >
                Inativar Produtos Ausentes
              </button>
              <button 
                onClick={() => handleInactivateMissing(false)}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Manter como Ativos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
