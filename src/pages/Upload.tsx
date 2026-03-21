import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Trash2, Send, AlertTriangle, RefreshCw, ChevronDown, Sparkles, Layout, Database, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../integrations/supabaseClient';
import { extractProductsFromMedia, classifyCategory } from '../services/aiService';
import { Brand, Product } from '../types';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';

type CatalogType = 'weekly' | 'replenishment';
type UploadMode = 'catalog' | 'stock';

export default function UploadPage({ companyId, onRefresh }: { companyId: string | null, onRefresh?: () => void }) {
  const [uploadMode, setUploadMode] = useState<UploadMode>('catalog');
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [catalogType, setCatalogType] = useState<CatalogType>('weekly');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [useCatalogNameAsCategory, setUseCatalogNameAsCategory] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File, pages: { base64: string, mimeType: string }[] }[]>([]);
  const [missingProducts, setMissingProducts] = useState<Product[]>([]);
  const [showMissingAlert, setShowMissingAlert] = useState(false);
  
  const [priceChanges, setPriceChanges] = useState<{ sku: string, old: number, new: number }[]>([]);
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  
  const [unregisteredSkus, setUnregisteredSkus] = useState<{ sku: string, qtd: number }[]>([]);
  const [showUnregisteredAlert, setShowUnregisteredAlert] = useState(false);
  
  const [outOfStockSkus, setOutOfStockSkus] = useState<{ sku: string, nome: string }[]>([]);
  const [lastUnitsSkus, setLastUnitsSkus] = useState<{ sku: string, nome: string }[]>([]);
  const [showSyncReport, setShowSyncReport] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    async function fetchBrands() {
      if (!supabase || companyId === null) return;
      const { data } = await supabase.from('brands').select('*').eq('company_id', companyId).order('name');
      
      const sortedBrands = (data || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setBrands(sortedBrands);
      if (sortedBrands.length > 0) setSelectedBrandId(sortedBrands[0].id);
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

  const processFileToBase64 = async (file: File): Promise<{ base64: string, mimeType: string }[]> => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            const base64 = btoa(unescape(encodeURIComponent(csv)));
            resolve([{ base64, mimeType: 'text/csv' }]);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = error => reject(error);
        reader.readAsArrayBuffer(file);
      });
    } else if (fileName.endsWith('.pdf')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();
        const results: { base64: string, mimeType: string }[] = [];

        // Processar em blocos de 2 páginas para garantir que a IA não pule itens e não estoure o limite de saída
        for (let i = 0; i < pageCount; i += 2) {
          const newPdf = await PDFDocument.create();
          const end = Math.min(i + 2, pageCount);
          const pages = await newPdf.copyPages(pdfDoc, Array.from({ length: end - i }, (_, k) => i + k));
          pages.forEach(p => newPdf.addPage(p));
          const pdfBytes = await newPdf.save();
          const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.split(',')[1]);
            };
            reader.readAsDataURL(blob);
          });
          results.push({ base64, mimeType: 'application/pdf' });
        }
        return results;
      } catch (error) {
        console.error('Erro ao dividir PDF:', error);
        const base64 = await fileToBase64(file);
        return [{ base64, mimeType: 'application/pdf' }];
      }
    } else {
      const base64 = await fileToBase64(file);
      let mimeType = file.type;
      if (fileName.endsWith('.csv')) mimeType = 'text/csv';
      return [{ base64, mimeType }];
    }
  };

  const parseNumber = (val: any, fallback = 0): number => {
    if (typeof val === 'number') return val;
    if (!val) return fallback;
    const str = String(val).trim();
    let cleanStr = str.replace(/[^\d.,-]/g, '');
    if (cleanStr.includes('.') && cleanStr.includes(',')) {
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else if (cleanStr.includes(',')) {
      cleanStr = cleanStr.replace(',', '.');
    }
    const num = parseFloat(cleanStr);
    return isNaN(num) ? fallback : num;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles: { file: File, pages: { base64: string, mimeType: string }[] }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.toLowerCase();

      // Se estiver no modo estoque, aceitar apenas Excel
      if (uploadMode === 'stock' && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        alert(`O arquivo ${file.name} não é um Excel. No modo de sincronização de estoque, apenas arquivos Excel (.xlsx, .xls) são aceitos.`);
        continue;
      }

      try {
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          // Para Excel, apenas lemos o conteúdo, não precisamos de base64 para IA
          newFiles.push({ file, pages: [] });
        } else {
          const pages = await processFileToBase64(file);
          newFiles.push({ file, pages });
        }
      } catch (error) {
        console.error('Erro ao processar arquivo:', file.name, error);
        alert(`Erro ao processar o arquivo ${file.name}. Verifique se o formato é suportado.`);
      }
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processStockSync = async () => {
    if (!companyId || !selectedBrandId || uploadedFiles.length === 0 || !supabase) {
      setStatus({ type: 'error', message: 'Selecione uma marca e adicione o arquivo Excel primeiro.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: 'info', message: 'Lendo arquivo Excel e sincronizando estoque...' });
    setProgress(0);

    try {
      const excelFile = uploadedFiles[0].file;
      const data = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const excelData: { sku: string, qtd: number }[] = [];
      
      jsonData.forEach((row: any) => {
        // Tentar encontrar colunas de SKU e QTD
        const skuKey = Object.keys(row).find(k => /sku|codigo|cod|ref|referencia/i.test(k));
        const qtdKey = Object.keys(row).find(k => /quantidade|qtd|estoque|stock|qnt/i.test(k));
        
        if (skuKey) {
          const sku = String(row[skuKey]).trim().toUpperCase();
          const qtd = parseNumber(qtdKey ? row[qtdKey] : 0, 0);
          if (sku) {
            excelData.push({ sku, qtd });
          }
        }
      });

      if (excelData.length === 0) {
        throw new Error('Não foi possível encontrar dados de SKU e Quantidade no Excel. Verifique se as colunas têm cabeçalhos como "SKU" e "Quantidade".');
      }

      // Buscar todos os produtos da marca no sistema
      const { data: existingProducts, error: fetchError } = await supabase
        .from('products')
        .select('id, sku, nome, status_estoque')
        .eq('company_id', companyId)
        .eq('brand_id', selectedBrandId);

      if (fetchError) throw new Error(`Erro ao buscar produtos: ${fetchError.message}`);
      if (!existingProducts) throw new Error('Erro ao buscar produtos existentes.');

      const existingSkusMap = new Map(existingProducts.map(p => [p.sku.toUpperCase().trim(), p]));
      const excelSkusSet = new Set(excelData.map(d => d.sku));
      
      const updates: { id: string, status_estoque: string }[] = [];
      const unregistered: { sku: string, qtd: number }[] = [];
      const newOutOfStock: { sku: string, nome: string }[] = [];
      const newLastUnits: { sku: string, nome: string }[] = [];

      // 1. Processar SKUs que estão no Excel
      for (const data of excelData) {
        const existing = existingSkusMap.get(data.sku);
        if (existing) {
          let newStatus = 'normal';
          if (data.qtd === 0) {
            newStatus = 'esgotado';
          } else if (data.qtd < 10) {
            newStatus = 'ultimas';
          }

          if (existing.status_estoque !== newStatus) {
            updates.push({ id: existing.id, status_estoque: newStatus });
            if (newStatus === 'esgotado') {
              newOutOfStock.push({ sku: existing.sku, nome: existing.nome });
            } else if (newStatus === 'ultimas') {
              newLastUnits.push({ sku: existing.sku, nome: existing.nome });
            }
          }
        } else {
          unregistered.push(data);
        }
      }

      // 2. Processar SKUs que NÃO estão no Excel (marcar como esgotado)
      for (const product of existingProducts) {
        const sku = product.sku.toUpperCase().trim();
        if (!excelSkusSet.has(sku)) {
          if (product.status_estoque !== 'esgotado') {
            updates.push({ id: product.id, status_estoque: 'esgotado' });
            newOutOfStock.push({ sku: product.sku, nome: product.nome });
          }
        }
      }

      // Executar updates em lotes
      if (updates.length > 0 && supabase) {
        // Supabase não suporta update em massa com valores diferentes facilmente sem RPC
        // Vamos fazer um por um ou usar um truque se for muitos. 
        // Como geralmente não são milhares de mudanças de uma vez, vamos fazer em paralelo limitado.
        const batchSize = 20;
        const db = supabase;
        for (let i = 0; i < updates.length; i += batchSize) {
          const batch = updates.slice(i, i + batchSize);
          await Promise.all(batch.map(upd => 
            db.from('products').update({ status_estoque: upd.status_estoque }).eq('id', upd.id)
          ));
          setProgress(Math.round(((i + batch.length) / updates.length) * 100));
        }
      }

      setUnregisteredSkus(unregistered);
      setOutOfStockSkus(newOutOfStock);
      setLastUnitsSkus(newLastUnits);

      // Se houver SKUs não cadastrados, mostrar o alerta específico primeiro
      if (unregistered.length > 0) {
        setShowUnregisteredAlert(true);
      } else {
        // Sempre mostrar o relatório de sincronização ao final se não houver alerta de não cadastrados
        setShowSyncReport(true);
      }

      setIsUploading(false);
      setUploadedFiles([]);
      setStatus({ 
        type: 'success', 
        message: `Sincronização concluída! ${updates.length} produtos atualizados.` 
      });
      
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error(error);
      setIsUploading(false);
      setStatus({ type: 'error', message: `Erro na sincronização: ${error.message}` });
    }
  };

  const processCatalog = async () => {
    if (uploadMode === 'stock') {
      processStockSync();
      return;
    }
    if (!companyId || !selectedBrandId || uploadedFiles.length === 0 || !supabase) {
      setStatus({ type: 'error', message: 'Selecione uma marca e adicione arquivos primeiro.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: 'info', message: 'A IA está analisando os arquivos...' });
    setProgress(0);

    try {
      const { data: brandData } = await supabase.from('brands').select('name, margin_percentage').eq('id', selectedBrandId).single();
      const margin = brandData?.margin_percentage || 0;
      const brandName = brandData?.name || '';

      const { data: initialCategories } = await supabase.from('categories').select('id, nome').eq('company_id', companyId).eq('brand_id', selectedBrandId);
      let categories: { id: string, nome: string }[] = (initialCategories || []).map(c => ({ id: String(c.id), nome: c.nome }));
      const processedSkus: string[] = [];
      let totalProducts = 0;

      for (let i = 0; i < uploadedFiles.length; i++) {
        const { file, pages } = uploadedFiles[i];
        
        let categoriaIdParaArquivo: string | null = null;
        
        if (useCatalogNameAsCategory) {
          // Extrair categoria do nome do arquivo
          const fileName = file.name.replace(/\.[^/.]+$/, ""); // remove extensão
          const categoryNameMatch = fileName.replace(/[0-9]/g, '').trim(); // remove números
          const categoryName = categoryNameMatch || "Geral";

          const existingCat = categories.find(c => c.nome.toLowerCase() === categoryName.toLowerCase());
          if (existingCat) {
            categoriaIdParaArquivo = existingCat.id;
          } else {
            const { data: newCat } = await supabase.from('categories').insert([{
              company_id: companyId,
              brand_id: selectedBrandId,
              nome: categoryName,
              ativo: true
            }]).select().single();
            
            if (newCat) {
              categoriaIdParaArquivo = String(newCat.id);
              categories.push({ id: categoriaIdParaArquivo, nome: newCat.nome });
            }
          }
        }

        for (let j = 0; j < pages.length; j++) {
          const { base64, mimeType } = pages[j];
          setStatus({ 
            type: 'info', 
            message: `Analisando arquivo ${i + 1} de ${uploadedFiles.length}: ${file.name} ${pages.length > 1 ? `(Parte ${j + 1}/${pages.length})` : ''}` 
          });
          
          let extractedProducts = await extractProductsFromMedia(base64, mimeType, useCatalogNameAsCategory ? undefined : categories);
          if (!Array.isArray(extractedProducts)) {
            console.warn(`extractedProducts não é um array:`, extractedProducts);
            extractedProducts = [];
          }
          
          totalProducts += extractedProducts.length;

          for (const extracted of extractedProducts) {
            // Gerar SKU determinístico se não houver um para evitar duplicatas em re-uploads
            let sku = extracted.sku ? String(extracted.sku).trim().toUpperCase() : '';
            
            if (!sku) {
              const nameHash = extracted.nome ? extracted.nome.split('').reduce((a: number, b: string) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : Math.random();
              sku = `AUTO-${Math.abs(nameHash).toString(36).toUpperCase()}`;
            }
            
            processedSkus.push(sku);

            const { data: existing, error: fetchError } = await supabase
              .from('products')
              .select('id, nome, preco_unitario, imagem, sku')
              .eq('company_id', companyId)
              .ilike('sku', sku)
              .maybeSingle();

            if (fetchError) {
              console.error('Erro ao buscar produto existente:', fetchError);
            }

            let finalNome = extracted.nome ? String(extracted.nome).trim() : `Produto sem nome (${sku})`;
            let parsedPrecoUnitario = parseNumber(extracted.preco_unitario, 0);
            let parsedPrecoBox = parseNumber(extracted.preco_box, 0);

            let pendingStatus = 'none';

            if (existing) {
              const oldPriceWithMargin = margin > 0 ? (existing.preco_unitario || 0) * (1 + margin / 100) : (existing.preco_unitario || 0);
              const newPriceWithMargin = margin > 0 ? parsedPrecoUnitario * (1 + margin / 100) : parsedPrecoUnitario;

              if (catalogType === 'replenishment' && (existing.preco_unitario || 0) !== parsedPrecoUnitario) {
                setPriceChanges(prev => [...prev, { 
                  sku: sku, 
                  old: oldPriceWithMargin, 
                  new: newPriceWithMargin 
                }]);
                pendingStatus = 'price_changed';
              }
            }

            const validStatus = ['normal', 'baixo', 'ultimas', 'esgotado'];
            const statusEstoque = validStatus.includes(extracted.status_estoque) ? extracted.status_estoque : 'normal';

            let categoriaId = categoriaIdParaArquivo;
            if (!useCatalogNameAsCategory && extracted.category_name) {
              const foundCat = categories.find(c => c.nome.toLowerCase() === extracted.category_name.toLowerCase());
              if (foundCat) {
                categoriaId = foundCat.id;
              }
            }

            const productData: any = {
              company_id: companyId,
              brand_id: selectedBrandId,
              sku: sku,
              nome: finalNome,
              preco_unitario: parsedPrecoUnitario,
              preco_box: parsedPrecoBox,
              qtd_box: parseNumber(extracted.qtd_box, 1),
              venda_somente_box: !!extracted.venda_somente_box,
              has_box_discount: !!extracted.has_box_discount,
              is_last_units: !!extracted.is_last_units,
              multiplo_venda: 1,
              status_estoque: statusEstoque,
              category_id: categoriaId,
              categoria_pendente: !categoriaId,
              imagem_pendente: existing ? !existing.imagem : true 
            };

            if (existing && existing.imagem) {
              productData.imagem = existing.imagem;
            }

            try {
              if (existing) {
                const { error: updateError } = await supabase.from('products').update(productData).eq('id', existing.id);
                if (updateError) throw updateError;
              } else {
                const { error: insertError } = await supabase.from('products').insert([productData]);
                if (insertError) throw insertError;
              }
            } catch (err: any) {
              console.error('Erro ao salvar produto:', err);
              setStatus({ type: 'error', message: `Erro ao salvar produto ${sku}: ${err.message}` });
            }
          }
          setProgress(Math.round(((i * pages.length + j + 1) / (uploadedFiles.length * pages.length)) * 100));
        }
      }

      // Se for catálogo semanal, identificar produtos ausentes
      if (catalogType === 'weekly') {
        const { data: existingProducts } = await supabase
          .from('products')
          .select('*')
          .eq('company_id', companyId)
          .eq('brand_id', selectedBrandId);

        if (existingProducts) {
          const missing = existingProducts.filter(p => !processedSkus.includes(p.sku.toUpperCase().trim()));
          if (missing.length > 0) {
            setMissingProducts(missing);
            setShowMissingAlert(true);
          }
        }
      }

      setIsUploading(false);
      setUploadedFiles([]);
      
      if (priceChanges.length > 0) {
        setShowPriceAlert(true);
      }

      if (totalProducts === 0) {
        setStatus({ 
          type: 'warning', 
          message: `Processamento concluído, mas NENHUM produto foi identificado nos arquivos enviados.` 
        });
      } else {
        setStatus({ 
          type: 'success', 
          message: `Processamento concluído! ${totalProducts} produtos identificados e enviados para pendências.` 
        });
      }
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error(error);
      setIsUploading(false);
      setStatus({ type: 'error', message: `Erro no processamento: ${error.message}` });
    }
  };

  const handleInactivateMissing = async (markAsOutOfStock: boolean) => {
    if (!supabase || missingProducts.length === 0) return;

    if (markAsOutOfStock) {
      const ids = missingProducts.map(p => p.id);
      await supabase.from('products').update({ status_estoque: 'esgotado' }).in('id', ids);
      setStatus({ type: 'success', message: `${missingProducts.length} produtos foram identificados como ausentes e marcados como esgotados.` });
    } else {
      setStatus({ type: 'info', message: `Os produtos ausentes foram mantidos com o estoque inalterado.` });
    }
    
    setMissingProducts([]);
    setShowMissingAlert(false);
  };

  const handleResetCatalog = async () => {
    if (!supabase || !companyId) return;
    
    setIsResetting(true);
    try {
      let query = supabase.from('products').delete().eq('company_id', companyId);
      
      if (selectedBrandId) {
        query = query.eq('brand_id', selectedBrandId);
      }
      
      const { error } = await query;
      
      if (error) throw error;
      
      setStatus({ type: 'success', message: `Catálogo ${selectedBrandId ? 'da marca' : 'completo'} resetado com sucesso!` });
      setShowResetConfirm(false);
    } catch (error: any) {
      console.error(error);
      setStatus({ type: 'error', message: `Erro ao resetar catálogo: ${error.message}` });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-12 pb-32"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary border border-primary/10 shadow-inner">
              <Upload size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Upload de Catálogo</h1>
              <p className="text-slate-500 font-medium">Atualize seu estoque ou adicione novos produtos com IA</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-100/50 backdrop-blur-sm p-1.5 rounded-[24px] flex gap-1 shadow-inner border border-slate-200/50">
            <button 
              onClick={() => { setUploadMode('catalog'); setUploadedFiles([]); setStatus(null); }}
              className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${uploadMode === 'catalog' ? 'bg-white text-primary shadow-xl shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Sparkles size={14} strokeWidth={3} />
              Catálogo (IA)
            </button>
            <button 
              onClick={() => { setUploadMode('stock'); setUploadedFiles([]); setStatus(null); }}
              className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${uploadMode === 'stock' ? 'bg-white text-primary shadow-xl shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Database size={14} strokeWidth={3} />
              Estoque (Excel)
            </button>
          </div>

          <button 
            onClick={() => setShowResetConfirm(true)}
            className="px-6 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-100 flex items-center gap-2 shadow-sm active:scale-95 group"
          >
            <Trash2 size={16} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
            Resetar
          </button>
          
          {uploadMode === 'catalog' && (
            <div className="bg-slate-100/50 backdrop-blur-sm p-1.5 rounded-[24px] flex gap-1 shadow-inner border border-slate-200/50">
              <button 
                onClick={() => setCatalogType('weekly')}
                className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${catalogType === 'weekly' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Semanal
              </button>
              <button 
                onClick={() => setCatalogType('replenishment')}
                className={`px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${catalogType === 'replenishment' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Reposição
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-10">
          <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-3 h-full bg-slate-50 group-hover:bg-primary transition-colors duration-500" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 bg-primary/5 rounded-[22px] flex items-center justify-center border border-primary/10 shadow-inner">
                <Layout size={28} className="text-primary" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Configurações</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Defina os parâmetros do upload</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Marca do Catálogo</label>
                  {selectedBrandId && (
                    <span className="text-[9px] font-black bg-primary/5 text-primary px-4 py-1.5 rounded-full border border-primary/10 uppercase tracking-[0.15em] shadow-sm">
                      Margem: {brands.find(b => b.id === selectedBrandId)?.margin_percentage || 0}%
                    </span>
                  )}
                </div>
                <div className="relative group/select">
                  <select 
                    className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none appearance-none font-black text-slate-700 cursor-pointer transition-all text-sm uppercase tracking-tight"
                    value={selectedBrandId || ''}
                    onChange={(e) => setSelectedBrandId(e.target.value)}
                  >
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-hover/select:text-primary transition-colors" size={24} strokeWidth={3} />
                </div>
              </div>
              
              {uploadMode === 'catalog' && (
                <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 group/check hover:border-primary/20 transition-all">
                  <label className="flex items-start gap-6 cursor-pointer">
                    <div className={`mt-1 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 ${useCatalogNameAsCategory ? 'bg-primary border-primary shadow-xl shadow-primary/20' : 'border-slate-200 bg-white group-hover/check:border-primary/50'}`}>
                      {useCatalogNameAsCategory && <CheckCircle2 size={18} className="text-white" strokeWidth={3} />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={useCatalogNameAsCategory} 
                      onChange={e => setUseCatalogNameAsCategory(e.target.checked)} 
                    />
                    <div className="flex flex-col space-y-1">
                      <span className="text-base font-black text-slate-900 tracking-tight uppercase">Criar categoria com nome do arquivo</span>
                      <span className="text-[11px] text-slate-400 font-black uppercase tracking-[0.1em] leading-relaxed">A IA tentará classificar cada produto automaticamente se desativado.</span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="p-8 bg-blue-50/50 rounded-[32px] border border-blue-100 flex gap-6 items-center">
              <div className="w-14 h-14 bg-white rounded-[20px] flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                <Zap className="text-blue-500" size={28} strokeWidth={2.5} />
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed font-black uppercase tracking-[0.05em]">
                {uploadMode === 'stock' 
                  ? 'A sincronização via Excel atualizará apenas o status de disponibilidade (Normal, Últimas Unidades ou Esgotado) com base nas quantidades.'
                  : catalogType === 'weekly' 
                    ? 'O catálogo semanal atualizará os preços e identificará produtos que saíram de linha para esta marca.' 
                    : 'O catálogo de reposição apenas adicionará ou atualizará produtos específicos sem afetar o status dos outros.'}
              </p>
            </div>
          </div>

          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[48px] p-16 flex flex-col items-center justify-center text-center transition-all duration-500 relative overflow-hidden ${
              isUploading ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-50' : 'border-slate-200 bg-white hover:border-primary hover:bg-primary/5 hover:shadow-2xl hover:shadow-primary/5 cursor-pointer group'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept={uploadMode === 'stock' ? ".xlsx,.xls" : ".pdf,image/*,.csv,.xlsx,.xls"} 
              multiple={uploadMode === 'catalog'}
              className="hidden" 
            />
            <div className="w-24 h-24 bg-primary/5 rounded-[32px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 border border-primary/10 shadow-inner relative z-10">
              <Upload size={48} className="text-primary" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3 uppercase relative z-10">{uploadMode === 'stock' ? 'Selecionar Excel de Estoque' : 'Adicionar Arquivos'}</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] relative z-10">{uploadMode === 'stock' ? 'Apenas arquivos .xlsx ou .xls' : 'PDF, PNG, JPG, CSV ou Excel'}</p>
            
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        </div>

        <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col space-y-10 relative group">
          <div className="absolute top-0 right-0 w-3 h-full bg-slate-50 group-hover:bg-primary transition-colors duration-500" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/5 rounded-[22px] flex items-center justify-center border border-primary/10 shadow-inner">
                <FileText size={28} className="text-primary" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Arquivos na Fila</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Itens prontos para processamento</p>
              </div>
            </div>
            <span className="text-[10px] font-black bg-slate-900 text-white px-5 py-2 rounded-full uppercase tracking-widest shadow-xl shadow-slate-900/20">{uploadedFiles.length} arquivos</span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[450px] space-y-4 pr-4 custom-scrollbar relative z-10">
            <AnimatePresence mode="popLayout">
              {uploadedFiles.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-slate-400 py-24 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100"
                >
                  <div className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                    <FileText size={40} className="opacity-10" strokeWidth={1.5} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Nenhum arquivo selecionado</p>
                </motion.div>
              ) : (
                uploadedFiles.map((item, idx) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={idx} 
                    className="flex items-center justify-between p-6 bg-slate-50 rounded-[32px] border border-slate-100 group/item hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 hover:border-primary/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-6 overflow-hidden">
                      <div className="w-16 h-16 bg-white rounded-[22px] flex items-center justify-center border border-slate-100 shrink-0 shadow-sm group-hover/item:scale-110 transition-transform duration-500">
                        {item.file.name.toLowerCase().endsWith('.xlsx') || item.file.name.toLowerCase().endsWith('.xls') ? <FileText size={24} className="text-emerald-500" strokeWidth={2.5} /> : item.file.type.includes('image') ? <ImageIcon size={24} className="text-blue-500" strokeWidth={2.5} /> : <FileText size={24} className="text-rose-500" strokeWidth={2.5} />}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-black text-slate-900 truncate tracking-tight uppercase">{item.file.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                          {item.pages.length > 1 && (
                            <span className="text-[9px] font-black bg-primary/5 text-primary px-3 py-1 rounded-full border border-primary/10 uppercase tracking-widest">{item.pages.length} PARTES</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90"
                    >
                      <Trash2 size={20} strokeWidth={2.5} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <button 
            disabled={isUploading || uploadedFiles.length === 0}
            onClick={processCatalog}
            className={`w-full py-6 rounded-[32px] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all duration-500 relative overflow-hidden group/btn ${
              isUploading || uploadedFiles.length === 0 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20 hover:-translate-y-1 hover:shadow-slate-900/40 active:translate-y-0'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            {isUploading ? (
              <>
                <Loader2 size={24} className="animate-spin" strokeWidth={3} />
                <span className="relative z-10">{uploadMode === 'stock' ? 'Sincronizando...' : 'Processando...'} {progress}%</span>
              </>
            ) : (
              <>
                {uploadMode === 'stock' ? <RefreshCw size={24} strokeWidth={3} className="group-hover/btn:rotate-180 transition-transform duration-700" /> : <Send size={24} strokeWidth={3} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />}
                <span className="relative z-10">{uploadMode === 'stock' ? 'Sincronizar Estoque' : 'Processar com IA'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-8 rounded-[32px] flex items-start gap-6 shadow-2xl relative overflow-hidden ${
              status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-emerald-200/20' :
              status.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-100 shadow-rose-200/20' :
              status.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-100 shadow-amber-200/20' :
              'bg-blue-50 text-blue-800 border border-blue-100 shadow-blue-200/20'
            }`}
          >
            <div className="absolute top-0 left-0 w-2 h-full opacity-50 bg-current" />
            {status.type === 'success' ? <CheckCircle2 className="shrink-0 text-emerald-500" size={28} strokeWidth={2.5} /> : <AlertCircle className="shrink-0 text-rose-500" size={28} strokeWidth={2.5} />}
            <p className="text-sm font-black uppercase tracking-tight leading-relaxed">{status.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals with modern styling */}
      <AnimatePresence>
        {showMissingAlert && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[56px] max-w-lg w-full p-12 shadow-2xl space-y-10 border border-slate-100 text-center"
            >
              <div className="w-24 h-24 bg-amber-50 rounded-[32px] flex items-center justify-center mx-auto border border-amber-100 shadow-inner">
                <AlertTriangle size={48} className="text-amber-500" strokeWidth={2} />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Produtos Ausentes</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                  Identificamos <strong className="text-slate-900">{missingProducts.length} produtos</strong> que estavam no catálogo anterior mas não foram encontrados neste novo catálogo semanal.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => handleInactivateMissing(true)}
                  className="w-full py-6 bg-rose-500 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-rose-500/30 hover:-translate-y-1 transition-all active:scale-95"
                >
                  Marcar como Esgotados
                </button>
                <button 
                  onClick={() => handleInactivateMissing(false)}
                  className="w-full py-6 bg-slate-100 text-slate-600 rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-200 transition-all active:scale-95"
                >
                  Manter Estoque Inalterado
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[56px] max-w-lg w-full p-12 shadow-2xl space-y-10 border border-slate-100 text-center"
            >
              <div className="w-24 h-24 bg-rose-50 rounded-[32px] flex items-center justify-center mx-auto border border-rose-100 shadow-inner">
                <Trash2 size={48} className="text-rose-500" strokeWidth={2} />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Resetar Catálogo</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                  Tem certeza que deseja excluir todos os produtos {selectedBrandId ? 'desta marca' : 'do catálogo'}? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleResetCatalog}
                  disabled={isResetting}
                  className="w-full py-6 bg-rose-500 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-rose-500/30 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isResetting ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Sim, Excluir Tudo'}
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-6 bg-slate-100 text-slate-600 rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showPriceAlert && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[56px] max-w-lg w-full p-12 shadow-2xl space-y-10 border border-slate-100 text-center overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="w-24 h-24 bg-blue-50 rounded-[32px] flex items-center justify-center mx-auto border border-blue-100 shadow-inner shrink-0">
                <AlertCircle size={48} className="text-blue-500" strokeWidth={2} />
              </div>
              <div className="space-y-4 shrink-0">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Mudanças de Preço</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                  Identificamos <strong className="text-slate-900">{priceChanges.length} produtos</strong> com alteração no preço final.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-[32px] p-6 space-y-3 bg-slate-50/50 custom-scrollbar">
                {priceChanges.map((pc, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-[20px] border border-slate-100 shadow-sm">
                    <span className="font-black text-xs text-slate-500 tracking-wider uppercase">{pc.sku}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-slate-300 line-through">R$ {pc.old.toFixed(2)}</span>
                      <span className="font-black text-primary text-sm">R$ {pc.new.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => { setShowPriceAlert(false); setPriceChanges([]); }}
                className="w-full py-6 bg-primary text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/30 hover:-translate-y-1 transition-all active:scale-95 shrink-0"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}

        {showUnregisteredAlert && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[56px] max-w-lg w-full p-12 shadow-2xl space-y-10 border border-slate-100 text-center overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="w-24 h-24 bg-rose-50 rounded-[32px] flex items-center justify-center mx-auto border border-rose-100 shadow-inner shrink-0">
                <AlertTriangle size={48} className="text-rose-500" strokeWidth={2} />
              </div>
              <div className="space-y-4 shrink-0">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">SKUs Não Cadastrados</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                  Identificamos <strong className="text-slate-900">{unregisteredSkus.length} SKUs</strong> no seu arquivo que não estão cadastrados no sistema para esta marca.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-[32px] p-6 space-y-3 bg-slate-50/50 custom-scrollbar">
                {unregisteredSkus.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-[20px] border border-slate-100 shadow-sm">
                    <span className="font-black text-xs text-slate-700 tracking-wider uppercase">{item.sku}</span>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-3 py-1.5 rounded-xl uppercase tracking-widest">QTD: {item.qtd}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-4 shrink-0">
                <button 
                  onClick={() => {
                    setShowUnregisteredAlert(false);
                    setShowSyncReport(true);
                  }}
                  className="w-full py-6 bg-primary text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/30 hover:-translate-y-1 transition-all active:scale-95"
                >
                  Ver Relatório Completo
                </button>
                <button 
                  onClick={() => {
                    setShowUnregisteredAlert(false);
                    setUnregisteredSkus([]);
                    setShowSyncReport(true);
                  }}
                  className="w-full py-6 bg-slate-100 text-slate-600 rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-200 transition-all active:scale-95"
                >
                  Ignorar e Continuar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showSyncReport && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[56px] max-w-lg w-full p-12 shadow-2xl space-y-10 border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto border border-emerald-100 shadow-inner shrink-0">
                <CheckCircle2 size={48} className="text-emerald-500" strokeWidth={2} />
              </div>
              <div className="text-center space-y-4 shrink-0">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Relatório de Sincronização</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                  Processamento concluído. Veja o resumo das alterações e pendências:
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-10 pr-4 custom-scrollbar">
                {unregisteredSkus.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 flex items-center gap-3 uppercase tracking-[0.2em]">
                      <AlertTriangle size={18} className="text-amber-500" strokeWidth={2.5} /> SKUs Não Cadastrados ({unregisteredSkus.length})
                    </h3>
                    <div className="bg-slate-50/50 rounded-[32px] p-6 space-y-3 border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-black italic uppercase tracking-widest mb-4 px-2">Estes SKUs estão no Excel mas não foram encontrados no sistema.</p>
                      {unregisteredSkus.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-[20px] border border-slate-100 shadow-sm">
                          <span className="font-black text-xs text-slate-700 tracking-wider uppercase">{item.sku}</span>
                          <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-3 py-1.5 rounded-xl uppercase tracking-widest">QTD: {item.qtd}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {lastUnitsSkus.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-amber-500 flex items-center gap-3 uppercase tracking-[0.2em]">
                      <AlertTriangle size={18} strokeWidth={2.5} /> Últimas Unidades ({lastUnitsSkus.length})
                    </h3>
                    <div className="bg-amber-50/50 rounded-[32px] p-6 space-y-3 border border-amber-100">
                      <p className="text-[10px] text-amber-400 font-black italic uppercase tracking-widest mb-4 px-2">Produtos atualizados para o status "Últimas Unidades" (estoque baixo).</p>
                      {lastUnitsSkus.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-[20px] border border-amber-100 shadow-sm">
                          <div className="flex flex-col">
                            <span className="font-black text-xs text-amber-900 tracking-tight uppercase">{item.nome}</span>
                            <span className="font-black text-[9px] text-amber-500 tracking-widest uppercase mt-1">{item.sku}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {outOfStockSkus.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-rose-500 flex items-center gap-3 uppercase tracking-[0.2em]">
                      <AlertCircle size={18} strokeWidth={2.5} /> Esgotados ({outOfStockSkus.length})
                    </h3>
                    <div className="bg-rose-50/50 rounded-[32px] p-6 space-y-3 border border-rose-100">
                      <p className="text-[10px] text-rose-400 font-black italic uppercase tracking-widest mb-4 px-2">Produtos atualizados para o status "Esgotado".</p>
                      {outOfStockSkus.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-[20px] border border-rose-100 shadow-sm">
                          <div className="flex flex-col">
                            <span className="font-black text-xs text-rose-900 tracking-tight uppercase">{item.nome}</span>
                            <span className="font-black text-[9px] text-rose-500 tracking-widest uppercase mt-1">{item.sku}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {lastUnitsSkus.length === 0 && outOfStockSkus.length === 0 && unregisteredSkus.length === 0 && (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Nenhuma alteração ou pendência detectada.</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => { 
                  setShowSyncReport(false); 
                  setLastUnitsSkus([]); 
                  setOutOfStockSkus([]); 
                  setUnregisteredSkus([]);
                }}
                className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-slate-900/30 hover:-translate-y-1 transition-all active:scale-95 shrink-0"
              >
                Fechar Relatório
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
