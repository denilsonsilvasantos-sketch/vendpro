import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Trash2, Send, AlertTriangle, RefreshCw } from 'lucide-react';
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
  
  const [outOfStockSkus, setOutOfStockSkus] = useState<{ sku: string, name: string }[]>([]);
  const [lastUnitsSkus, setLastUnitsSkus] = useState<{ sku: string, name: string }[]>([]);
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
      const { data: existingProducts } = await supabase
        .from('products')
        .select('id, sku, name, status_estoque')
        .eq('company_id', companyId)
        .eq('brand_id', selectedBrandId);

      if (!existingProducts) throw new Error('Erro ao buscar produtos existentes.');

      const existingSkusMap = new Map(existingProducts.map(p => [p.sku.toUpperCase().trim(), p]));
      const excelSkusSet = new Set(excelData.map(d => d.sku));
      
      const updates: { id: string, status_estoque: string }[] = [];
      const unregistered: { sku: string, qtd: number }[] = [];
      const newOutOfStock: { sku: string, name: string }[] = [];
      const newLastUnits: { sku: string, name: string }[] = [];

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
              newOutOfStock.push({ sku: existing.sku, name: existing.name });
            } else if (newStatus === 'ultimas') {
              newLastUnits.push({ sku: existing.sku, name: existing.name });
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
            newOutOfStock.push({ sku: product.sku, name: product.name });
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

      if (unregistered.length > 0) {
        setShowUnregisteredAlert(true);
      } else if (newOutOfStock.length > 0 || newLastUnits.length > 0) {
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
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Upload de Catálogo</h1>
        <div className="flex flex-wrap gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mr-4">
            <button 
              onClick={() => { setUploadMode('catalog'); setUploadedFiles([]); setStatus(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${uploadMode === 'catalog' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText size={16} />
              Catálogo (IA)
            </button>
            <button 
              onClick={() => { setUploadMode('stock'); setUploadedFiles([]); setStatus(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${uploadMode === 'stock' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <RefreshCw size={16} />
              Estoque (Excel)
            </button>
          </div>

          <button 
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Resetar Catálogo
          </button>
          {uploadMode === 'catalog' && (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2"><ImageIcon size={20} className="text-primary" /> Configurações</h2>
            
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 uppercase">Marca do Catálogo</label>
                {selectedBrandId && (
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Margem: {brands.find(b => b.id === selectedBrandId)?.margin_percentage || 0}%
                  </span>
                )}
              </div>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                value={selectedBrandId || ''}
                onChange={(e) => setSelectedBrandId(e.target.value)}
              >
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
              
              {uploadMode === 'catalog' && (
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${useCatalogNameAsCategory ? 'bg-primary border-primary' : 'border-slate-200 group-hover:border-primary/50'}`}>
                      {useCatalogNameAsCategory && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={useCatalogNameAsCategory} 
                      onChange={e => setUseCatalogNameAsCategory(e.target.checked)} 
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">Criar categoria com nome do arquivo</span>
                      <span className="text-[10px] text-slate-400">Se desativado, a IA tentará classificar cada produto em categorias existentes.</span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
              <AlertCircle className="text-blue-500 shrink-0" size={20} />
              <p className="text-xs text-blue-700 leading-relaxed">
                {uploadMode === 'stock' 
                  ? 'A sincronização de estoque via Excel atualizará apenas o status de disponibilidade (Normal, Últimas Unidades ou Esgotado) com base nas quantidades informadas.'
                  : catalogType === 'weekly' 
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
              accept={uploadMode === 'stock' ? ".xlsx,.xls" : ".pdf,image/*,.csv,.xlsx,.xls"} 
              multiple={uploadMode === 'catalog'}
              className="hidden" 
            />
            <Upload size={32} className="text-primary mb-2" />
            <h3 className="font-bold">{uploadMode === 'stock' ? 'Selecionar Excel de Estoque' : 'Adicionar Arquivos'}</h3>
            <p className="text-xs text-slate-500">{uploadMode === 'stock' ? 'Apenas arquivos .xlsx ou .xls' : 'PDF, PNG, JPG, CSV ou Excel'}</p>
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
                      {item.file.name.toLowerCase().endsWith('.xlsx') || item.file.name.toLowerCase().endsWith('.xls') ? <FileText size={16} className="text-green-600" /> : item.file.type.includes('image') ? <ImageIcon size={16} className="text-blue-500" /> : <FileText size={16} className="text-red-500" />}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium truncate">{item.file.name}</p>
                      <p className="text-[10px] text-slate-400">{(item.file.size / 1024 / 1024).toFixed(2)} MB {item.pages.length > 1 ? `(${item.pages.length} partes)` : ''}</p>
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
                {uploadMode === 'stock' ? 'Sincronizando...' : 'Processando...'} {progress}%
              </>
            ) : (
              <>
                {uploadMode === 'stock' ? <RefreshCw size={20} /> : <Send size={20} />}
                {uploadMode === 'stock' ? 'Sincronizar Estoque Agora' : 'Finalizar e Processar com IA'}
              </>
            )}
          </button>
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
                Marcar como Esgotados
              </button>
              <button 
                onClick={() => handleInactivateMissing(false)}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Manter Estoque Inalterado
              </button>
            </div>
          </div>
        </div>
      )}

      {showPriceAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} className="text-blue-600" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Mudanças de Preço de Venda Detectadas</h2>
              <p className="text-slate-500 text-sm">
                Identificamos <strong>{priceChanges.length} produtos</strong> com alteração no preço final (já aplicada a margem da marca).
              </p>
            </div>
            <div className="max-h-[200px] overflow-y-auto border border-slate-100 rounded-xl p-4 space-y-2">
              {priceChanges.map((pc, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="font-mono text-slate-500">{pc.sku}</span>
                  <div className="flex gap-2">
                    <span className="text-slate-400 line-through">R$ {pc.old.toFixed(2)}</span>
                    <span className="font-bold text-primary">R$ {pc.new.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => { setShowPriceAlert(false); setPriceChanges([]); }}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/60 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {showUnregisteredAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} className="text-orange-600" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Produtos Não Cadastrados</h2>
              <p className="text-slate-500 text-sm">
                Identificamos <strong>{unregisteredSkus.length} SKUs</strong> no Excel que não existem no sistema para esta marca. Eles precisam ser cadastrados manualmente ou via upload de catálogo.
              </p>
            </div>
            <div className="max-h-[200px] overflow-y-auto border border-slate-100 rounded-xl p-4 space-y-2">
              {unregisteredSkus.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs p-1 border-b border-slate-50 last:border-0">
                  <span className="font-mono font-bold">{item.sku}</span>
                  <span className="text-slate-500">Qtd: {item.qtd}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => { 
                setShowUnregisteredAlert(false); 
                setUnregisteredSkus([]); 
                if (outOfStockSkus.length > 0 || lastUnitsSkus.length > 0) {
                  setShowSyncReport(true);
                }
              }}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/60 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {showSyncReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto shrink-0">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <div className="text-center space-y-2 shrink-0">
              <h2 className="text-xl font-bold">Relatório de Sincronização</h2>
              <p className="text-slate-500 text-sm">
                A sincronização foi concluída com sucesso. Veja as alterações realizadas:
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {lastUnitsSkus.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-orange-600 flex items-center gap-2">
                    <AlertTriangle size={16} /> Últimas Unidades ({lastUnitsSkus.length})
                  </h3>
                  <div className="bg-orange-50 rounded-xl p-4 space-y-2 border border-orange-100">
                    {lastUnitsSkus.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs border-b border-orange-200/50 last:border-0 pb-1 last:pb-0">
                        <div className="flex flex-col">
                          <span className="font-bold text-orange-900">{item.name}</span>
                          <span className="font-mono text-[10px] text-orange-700">{item.sku}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {outOfStockSkus.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} /> Esgotados ({outOfStockSkus.length})
                  </h3>
                  <div className="bg-red-50 rounded-xl p-4 space-y-2 border border-red-100">
                    {outOfStockSkus.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs border-b border-red-200/50 last:border-0 pb-1 last:pb-0">
                        <div className="flex flex-col">
                          <span className="font-bold text-red-900">{item.name}</span>
                          <span className="font-mono text-[10px] text-red-700">{item.sku}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lastUnitsSkus.length === 0 && outOfStockSkus.length === 0 && (
                <div className="text-center py-8 text-slate-400 italic text-sm">
                  Nenhuma alteração de status detectada.
                </div>
              )}
            </div>

            <button 
              onClick={() => { setShowSyncReport(false); setLastUnitsSkus([]); setOutOfStockSkus([]); }}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/60 transition-colors shrink-0"
            >
              Fechar Relatório
            </button>
          </div>
        </div>
      )}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Resetar Catálogo?</h2>
              <p className="text-slate-500 text-sm">
                Tem certeza que deseja apagar <strong>TODOS</strong> os produtos {selectedBrandId ? 'desta marca' : 'do catálogo'}? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleResetCatalog}
                disabled={isResetting}
                className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isResetting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                Sim, Apagar Tudo
              </button>
              <button 
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
