import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Trash2, Send, AlertTriangle, RefreshCw, ChevronDown, Sparkles, Database, Zap } from 'lucide-react';
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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchBrands() {
      if (!supabase || companyId === null) return;
      const { data } = await supabase.from('brands').select('*').eq('company_id', companyId).order('name');
      const sorted = (data || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setBrands(sorted);
      if (sorted.length > 0) setSelectedBrandId(sorted[0].id);
    }
    fetchBrands();
  }, [companyId]);

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const processFileToBase64 = async (file: File): Promise<{ base64: string, mimeType: string }[]> => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
            resolve([{ base64: btoa(unescape(encodeURIComponent(csv))), mimeType: 'text/csv' }]);
          } catch (error) { reject(error); }
        };
        reader.onerror = error => reject(error);
        reader.readAsArrayBuffer(file);
      });
    } else if (fileName.endsWith('.pdf')) {
      try {
        const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
        const pageCount = pdfDoc.getPageCount();
        const results: { base64: string, mimeType: string }[] = [];
        for (let i = 0; i < pageCount; i += 2) {
          const newPdf = await PDFDocument.create();
          const end = Math.min(i + 2, pageCount);
          const pages = await newPdf.copyPages(pdfDoc, Array.from({ length: end - i }, (_, k) => i + k));
          pages.forEach(p => newPdf.addPage(p));
          const blob = new Blob([await newPdf.save() as any], { type: 'application/pdf' });
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });
          results.push({ base64, mimeType: 'application/pdf' });
        }
        return results;
      } catch (error) {
        return [{ base64: await fileToBase64(file), mimeType: 'application/pdf' }];
      }
    } else {
      return [{ base64: await fileToBase64(file), mimeType: file.type }];
    }
  };

  const parseNumber = (val: any, fallback = 0): number => {
    if (typeof val === 'number') return val;
    if (!val) return fallback;
    let s = String(val).trim().replace(/[^\d.,-]/g, '');
    if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? fallback : n;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const newFiles: { file: File, pages: { base64: string, mimeType: string }[] }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.toLowerCase();
      if (uploadMode === 'stock' && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
        alert(`${file.name} não é um formato suportado. Modo estoque aceita .xlsx, .xls, .html ou .htm`);
        continue;
      }
      try {
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.html') || fileName.endsWith('.htm')) newFiles.push({ file, pages: [] });
        else newFiles.push({ file, pages: await processFileToBase64(file) });
      } catch (error) {
        alert(`Erro ao processar ${file.name}`);
      }
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => setUploadedFiles(prev => prev.filter((_, i) => i !== index));

  const extractFromHtml = (html: string): { sku: string, qtd: number }[] => {
    const results: { sku: string, qtd: number }[] = [];
    // Regex para capturar SKU e Quantidade do formato Pluggar
    // SKU: <p class="bold font-size-14 pull-right"> SKU: 10582</p>
    // QTD: <p class="font-size-12"> <i class="fas fa-play-circle text-success mr-2"></i> Disponível: 25</p>
    
    const productBlocks = html.split(/<tr[^>]*class=["'](?:even|odd)["'][^>]*>/i);
    
    productBlocks.forEach(block => {
      const skuMatch = block.match(/SKU:\s*([A-Z0-9-]+)/i);
      const qtdMatch = block.match(/Disponível:\s*(\d+)/i);
      
      if (skuMatch && qtdMatch) {
        results.push({
          sku: skuMatch[1].trim().toUpperCase(),
          qtd: parseInt(qtdMatch[1], 10)
        });
      }
    });
    
    return results;
  };

  const processStockSync = async () => {
    if (!companyId || !selectedBrandId || uploadedFiles.length === 0 || !supabase) {
      setStatus({ type: 'error', message: 'Selecione uma marca e adicione o arquivo primeiro.' });
      return;
    }
    setIsUploading(true);
    setStatus({ type: 'info', message: 'Sincronizando estoque...' });
    setProgress(0);
    try {
      const file = uploadedFiles[0].file;
      const fileName = file.name.toLowerCase();
      let syncData: { sku: string, qtd: number }[] = [];

      if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        const text = await file.text();
        syncData = extractFromHtml(text);
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        jsonData.forEach((row: any) => {
          const skuKey = Object.keys(row).find(k => /sku|codigo|cod|ref|referencia/i.test(k));
          const qtdKey = Object.keys(row).find(k => /quantidade|qtd|estoque|stock|qnt|disponivel/i.test(k));
          if (skuKey) {
            const sku = String(row[skuKey]).trim().toUpperCase();
            if (sku) syncData.push({ sku, qtd: parseNumber(qtdKey ? row[qtdKey] : 0, 0) });
          }
        });
      }

      if (syncData.length === 0) throw new Error('Não foi possível identificar produtos no arquivo.');
      
      const { data: existingProducts } = await supabase.from('products').select('id, sku, nome, status_estoque, estoque').eq('company_id', companyId).eq('brand_id', selectedBrandId);
      if (!existingProducts) throw new Error('Erro ao buscar produtos.');
      
      const existingMap = new Map(existingProducts.map(p => [p.sku.toUpperCase().trim(), p]));
      const fileSkus = new Set(syncData.map(d => d.sku));
      const updates: { id: string, status_estoque: string, estoque: number }[] = [];
      const unregistered: { sku: string, qtd: number }[] = [];
      const newOutOfStock: { sku: string, nome: string }[] = [];
      const newLastUnits: { sku: string, nome: string }[] = [];

      for (const d of syncData) {
        const existing = existingMap.get(d.sku);
        if (existing) {
          const newStatus = d.qtd === 0 ? 'esgotado' : d.qtd < 10 ? 'ultimas' : 'normal';
          // Atualiza se o status mudou OU se a quantidade numérica mudou
          if (existing.status_estoque !== newStatus || existing.estoque !== d.qtd) {
            updates.push({ id: existing.id, status_estoque: newStatus, estoque: d.qtd });
            if (newStatus === 'esgotado') newOutOfStock.push({ sku: existing.sku, nome: existing.nome });
            else if (newStatus === 'ultimas') newLastUnits.push({ sku: existing.sku, nome: existing.nome });
          }
        } else unregistered.push(d);
      }

      // Produtos que estão no banco mas não no arquivo (marcar como esgotado se for semanal/completo)
      // Por enquanto mantemos a lógica de marcar como esgotado o que sumiu do arquivo
      for (const p of existingProducts) {
        if (!fileSkus.has(p.sku.toUpperCase().trim()) && p.status_estoque !== 'esgotado') {
          updates.push({ id: p.id, status_estoque: 'esgotado', estoque: 0 });
          newOutOfStock.push({ sku: p.sku, nome: p.nome });
        }
      }

      if (updates.length > 0) {
        const batchSize = 20;
        for (let i = 0; i < updates.length; i += batchSize) {
          await Promise.all(updates.slice(i, i + batchSize).map(u => 
            supabase!.from('products').update({ 
              status_estoque: u.status_estoque,
              estoque: u.estoque 
            }).eq('id', u.id)
          ));
          setProgress(Math.round(((i + Math.min(batchSize, updates.length - i)) / updates.length) * 100));
        }
      }
      setUnregisteredSkus(unregistered); setOutOfStockSkus(newOutOfStock); setLastUnitsSkus(newLastUnits);
      if (unregistered.length > 0) setShowUnregisteredAlert(true); else setShowSyncReport(true);
      setIsUploading(false); setUploadedFiles([]);
      setStatus({ type: 'success', message: `Sincronização concluída! ${updates.length} produtos atualizados.` });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      setIsUploading(false);
      setStatus({ type: 'error', message: `Erro: ${error.message}` });
    }
  };

  const processCatalog = async () => {
    if (uploadMode === 'stock') { processStockSync(); return; }
    if (!companyId || !selectedBrandId || uploadedFiles.length === 0 || !supabase) {
      setStatus({ type: 'error', message: 'Selecione uma marca e adicione arquivos primeiro.' });
      return;
    }
    setIsUploading(true); setStatus({ type: 'info', message: 'A IA está analisando os arquivos...' }); setProgress(0);
    try {
      const { data: brandData } = await supabase.from('brands').select('name, margin_percentage').eq('id', selectedBrandId).single();
      const margin = brandData?.margin_percentage || 0;
      const { data: initialCategories } = await supabase.from('categories').select('id, nome').eq('company_id', companyId).eq('brand_id', selectedBrandId);
      let categories: { id: string, nome: string }[] = (initialCategories || []).map(c => ({ id: String(c.id), nome: c.nome }));
      const processedSkus: string[] = [];
      let totalProducts = 0;
      for (let i = 0; i < uploadedFiles.length; i++) {
        const { file, pages } = uploadedFiles[i];
        let categoriaIdParaArquivo: string | null = null;
        if (useCatalogNameAsCategory) {
          const categoryName = file.name.replace(/\.[^/.]+$/, '').replace(/[0-9]/g, '').trim() || 'Geral';
          const existingCat = categories.find(c => c.nome.toLowerCase() === categoryName.toLowerCase());
          if (existingCat) { categoriaIdParaArquivo = existingCat.id; }
          else {
            const { data: newCat } = await supabase.from('categories').insert([{ company_id: companyId, brand_id: selectedBrandId, nome: categoryName, ativo: true }]).select('id, nome').single();
            if (newCat) { categoriaIdParaArquivo = String(newCat.id); categories.push({ id: categoriaIdParaArquivo, nome: newCat.nome }); }
          }
        }
        for (let j = 0; j < pages.length; j++) {
          const { base64, mimeType } = pages[j];
          setStatus({ type: 'info', message: `Analisando ${i + 1}/${uploadedFiles.length}: ${file.name}${pages.length > 1 ? ` (Parte ${j + 1}/${pages.length})` : ''}` });
          let extractedProducts = await extractProductsFromMedia(base64, mimeType, useCatalogNameAsCategory ? undefined : categories);
          
          // Small delay between chunks to avoid overwhelming the API
          if (j < pages.length - 1 || i < uploadedFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          if (!Array.isArray(extractedProducts)) extractedProducts = [];
          totalProducts += extractedProducts.length;
          for (const extracted of extractedProducts) {
            let sku = extracted.sku ? String(extracted.sku).trim().toUpperCase() : '';
            if (!sku) { const h = extracted.nome ? extracted.nome.split('').reduce((a: number, b: string) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : Math.random(); sku = `AUTO-${Math.abs(h).toString(36).toUpperCase()}`; }
            processedSkus.push(sku);
            const { data: existing } = await supabase.from('products').select('id, nome, preco_unitario, imagem, sku').eq('company_id', companyId).eq('brand_id', selectedBrandId).ilike('sku', sku).maybeSingle();
            let pendingStatus = 'none';
            const parsedPrecoUnitario = parseNumber(extracted.preco_unitario, 0);
            const parsedPrecoBox = parseNumber(extracted.preco_box, 0);
            if (existing && catalogType === 'replenishment' && (existing.preco_unitario || 0) !== parsedPrecoUnitario) {
              const m = margin > 0 ? (1 + margin / 100) : 1;
              setPriceChanges(prev => [...prev, { sku, old: (existing.preco_unitario || 0) * m, new: parsedPrecoUnitario * m }]);
              pendingStatus = 'price_changed';
            }
            const validStatus = ['normal', 'baixo', 'ultimas', 'esgotado'];
            const statusEstoque = validStatus.includes(extracted.status_estoque) ? extracted.status_estoque : 'normal';
            let categoriaId = categoriaIdParaArquivo;
            if (!useCatalogNameAsCategory && extracted.category_name) {
              const foundCat = categories.find(c => c.nome.toLowerCase() === extracted.category_name.toLowerCase());
              if (foundCat) categoriaId = foundCat.id;
            }
            const productData: any = { 
              company_id: companyId, 
              brand_id: selectedBrandId, 
              sku, 
              nome: extracted.nome ? String(extracted.nome).trim() : `Produto (${sku})`, 
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
              imagem_pendente: existing ? !existing.imagem : true, 
              tipo_variacao: extracted.tipo_variacao || null, 
              variacoes_disponiveis: extracted.variacoes_disponiveis || null,
              variacoes_flat: extracted.variacoes_flat || null
            };
            if (existing?.imagem) productData.imagem = existing.imagem;
            try {
              if (existing) await supabase.from('products').update(productData).eq('id', existing.id);
              else await supabase.from('products').insert([productData]);
            } catch (err: any) { console.error('Erro ao salvar:', err); }
          }
          setProgress(Math.round(((i * pages.length + j + 1) / (uploadedFiles.length * pages.length)) * 100));
        }
      }
      if (catalogType === 'weekly') {
        const { data: existingProducts } = await supabase.from('products').select('*').eq('company_id', companyId).eq('brand_id', selectedBrandId);
        if (existingProducts) {
          const missing = existingProducts.filter(p => !processedSkus.includes(p.sku.toUpperCase().trim()));
          if (missing.length > 0) { setMissingProducts(missing); setShowMissingAlert(true); }
        }
      }
      setIsUploading(false); setUploadedFiles([]);
      if (priceChanges.length > 0) setShowPriceAlert(true);
      setStatus({ type: totalProducts === 0 ? 'warning' : 'success', message: totalProducts === 0 ? 'Nenhum produto identificado nos arquivos.' : `Concluído! ${totalProducts} produtos identificados.` });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      setIsUploading(false);
      setStatus({ type: 'error', message: `Erro: ${error.message}` });
    }
  };

  const handleInactivateMissing = async (markAsOutOfStock: boolean) => {
    if (!supabase || missingProducts.length === 0) return;
    if (markAsOutOfStock) await supabase.from('products').update({ status_estoque: 'esgotado' }).in('id', missingProducts.map(p => p.id));
    setStatus({ type: 'success', message: markAsOutOfStock ? `${missingProducts.length} produtos marcados como esgotados.` : 'Estoque mantido inalterado.' });
    setMissingProducts([]); setShowMissingAlert(false);
  };

  const handleResetCatalog = async () => {
    if (!supabase || !companyId) return;
    setIsResetting(true);
    try {
      let query = supabase.from('products').delete().eq('company_id', companyId);
      if (selectedBrandId) query = query.eq('brand_id', selectedBrandId);
      const { error } = await query;
      if (error) throw error;
      setStatus({ type: 'success', message: 'Catálogo resetado com sucesso!' });
      setShowResetConfirm(false);
    } catch (error: any) { setStatus({ type: 'error', message: `Erro: ${error.message}` }); }
    finally { setIsResetting(false); }
  };

  const statusColors: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    error: 'bg-rose-50 text-rose-800 border-rose-100',
    warning: 'bg-amber-50 text-amber-800 border-amber-100',
    info: 'bg-blue-50 text-blue-800 border-blue-100',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Upload size={16} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">Upload de Catálogo</h1>
            <p className="text-xs text-slate-400">Atualize estoque ou adicione produtos com IA</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode toggle */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex gap-0.5">
            {(['catalog', 'stock'] as UploadMode[]).map(mode => (
              <button key={mode} onClick={() => { setUploadMode(mode); setUploadedFiles([]); setStatus(null); }}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5 ${uploadMode === mode ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {mode === 'catalog' ? <><Sparkles size={10} strokeWidth={3} /> Catálogo (IA)</> : <><Database size={10} strokeWidth={3} /> Estoque (Excel/HTML)</>}
              </button>
            ))}
          </div>

          {uploadMode === 'catalog' && (
            <div className="bg-slate-100 p-0.5 rounded-lg flex gap-0.5">
              {(['weekly', 'replenishment'] as CatalogType[]).map(t => (
                <button key={t} onClick={() => setCatalogType(t)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all ${catalogType === t ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  {t === 'weekly' ? 'Semanal' : 'Reposição'}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setShowResetConfirm(true)} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-rose-600 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 transition-all flex items-center gap-1.5">
            <Trash2 size={10} strokeWidth={3} /> Resetar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Config */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Zap size={12} className="text-primary" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Configurações</span>
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Marca</label>
              <div className="relative">
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-primary/40 appearance-none"
                  value={selectedBrandId || ''} onChange={e => setSelectedBrandId(e.target.value)}>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>

            {uploadMode === 'catalog' && (
              <label className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:border-primary/20 transition-all">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${useCatalogNameAsCategory ? 'bg-primary border-primary' : 'border-slate-300 bg-white'}`}>
                  {useCatalogNameAsCategory && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                </div>
                <input type="checkbox" className="hidden" checked={useCatalogNameAsCategory} onChange={e => setUseCatalogNameAsCategory(e.target.checked)} />
                <div>
                  <p className="text-xs font-bold text-slate-700">Criar categoria com nome do arquivo</p>
                  <p className="text-[9px] text-slate-400">A IA classifica automaticamente se desativado</p>
                </div>
              </label>
            )}

            <div className={`p-2.5 rounded-lg border text-xs leading-relaxed ${uploadMode === 'stock' ? 'bg-blue-50 border-blue-100 text-blue-700' : catalogType === 'weekly' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
              {uploadMode === 'stock' ? 'Atualiza status de disponibilidade via Excel ou HTML (Normal, Últimas, Esgotado).'
                : catalogType === 'weekly' ? 'Catálogo semanal: atualiza preços e identifica produtos fora de linha.'
                  : 'Reposição: adiciona/atualiza produtos específicos sem afetar os demais.'}
            </div>
          </div>

          {/* Drop zone */}
          <div onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isUploading ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' : 'border-slate-200 bg-white hover:border-primary hover:bg-primary/5'}`}>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept={uploadMode === 'stock' ? '.xlsx,.xls,.html,.htm' : '.pdf,image/*,.csv,.xlsx,.xls'} multiple={uploadMode === 'catalog'} className="hidden" />
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <Upload size={20} className="text-primary" strokeWidth={2.5} />
            </div>
            <p className="text-xs font-black text-slate-700 uppercase mb-1">{uploadMode === 'stock' ? 'Selecionar Arquivo de Estoque' : 'Adicionar Arquivos'}</p>
            <p className="text-[9px] text-slate-400">{uploadMode === 'stock' ? 'Excel (.xlsx) ou HTML do Pluggar' : 'PDF, PNG, JPG, CSV ou Excel'}</p>
          </div>
        </div>

        {/* File queue */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-primary" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Fila de Arquivos</span>
            </div>
            <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full">{uploadedFiles.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-48 divide-y divide-slate-50">
            <AnimatePresence mode="popLayout">
              {uploadedFiles.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-slate-300">
                  <FileText size={24} strokeWidth={1.5} className="mb-2 opacity-30" />
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Nenhum arquivo</p>
                </div>
              ) : uploadedFiles.map((item, idx) => (
                <motion.div layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.98 }} key={idx}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-all">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 shrink-0">
                    {item.file.type.includes('image') ? <ImageIcon size={14} className="text-blue-500" strokeWidth={2} /> : <FileText size={14} className="text-rose-500" strokeWidth={2} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{item.file.name}</p>
                    <p className="text-[9px] text-slate-400">{(item.file.size / 1024 / 1024).toFixed(2)} MB{item.pages.length > 1 ? ` · ${item.pages.length} partes` : ''}</p>
                  </div>
                  <button onClick={() => removeFile(idx)} className="w-6 h-6 flex items-center justify-center text-slate-200 hover:text-rose-500 rounded-md transition-all">
                    <Trash2 size={12} strokeWidth={2.5} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="p-3 border-t border-slate-100">
            <button disabled={isUploading || uploadedFiles.length === 0} onClick={processCatalog}
              className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${isUploading || uploadedFiles.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white shadow-lg hover:-translate-y-0.5 active:translate-y-0'}`}>
              {isUploading
                ? <><Loader2 size={14} className="animate-spin" /> {uploadMode === 'stock' ? 'Sincronizando' : 'Processando'}... {progress}%</>
                : uploadMode === 'stock' ? <><RefreshCw size={14} strokeWidth={3} /> Sincronizar Estoque</> : <><Send size={14} strokeWidth={3} /> Processar com IA</>}
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <AnimatePresence>
        {status && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`p-3 rounded-xl flex items-center gap-3 border text-xs font-bold ${statusColors[status.type]}`}>
            {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {status.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {[
          { show: showMissingAlert, icon: <AlertTriangle size={32} className="text-amber-500" />, bg: 'bg-amber-50 border-amber-100', title: 'Produtos Ausentes', desc: `${missingProducts.length} produtos não encontrados neste catálogo.`, actions: [{ label: 'Marcar como Esgotados', onClick: () => handleInactivateMissing(true), primary: true }, { label: 'Manter Inalterado', onClick: () => handleInactivateMissing(false), primary: false }] },
          { show: showResetConfirm, icon: <Trash2 size={32} className="text-rose-500" />, bg: 'bg-rose-50 border-rose-100', title: 'Resetar Catálogo', desc: `Excluir todos os produtos ${selectedBrandId ? 'desta marca' : ''}? Não pode ser desfeito.`, actions: [{ label: isResetting ? 'Excluindo...' : 'Sim, Excluir Tudo', onClick: handleResetCatalog, primary: true }, { label: 'Cancelar', onClick: () => setShowResetConfirm(false), primary: false }] },
        ].map((modal, i) => modal.show && (
          <div key={i} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto border ${modal.bg}`}>{modal.icon}</div>
              <div><h2 className="text-base font-black text-slate-900">{modal.title}</h2><p className="text-xs text-slate-500 mt-1">{modal.desc}</p></div>
              <div className="flex flex-col gap-2">
                {modal.actions.map((a, j) => (
                  <button key={j} onClick={a.onClick} className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${a.primary ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{a.label}</button>
                ))}
              </div>
            </motion.div>
          </div>
        ))}

        {(showPriceAlert || showUnregisteredAlert || showSyncReport) && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col max-h-[80vh]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center"><AlertCircle size={18} className="text-blue-500" /></div>
                <h2 className="text-sm font-black text-slate-900">
                  {showPriceAlert ? `Mudanças de Preço (${priceChanges.length})` : showUnregisteredAlert ? `SKUs Não Cadastrados (${unregisteredSkus.length})` : 'Relatório de Sincronização'}
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 mb-4">
                {showPriceAlert && priceChanges.map((pc, i) => (
                  <div key={i} className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-black text-slate-500 uppercase">{pc.sku}</span>
                    <div className="flex items-center gap-2"><span className="text-[10px] text-slate-300 line-through">R$ {pc.old.toFixed(2)}</span><span className="text-xs font-black text-primary">R$ {pc.new.toFixed(2)}</span></div>
                  </div>
                ))}
                {showUnregisteredAlert && unregisteredSkus.map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-black text-slate-700 uppercase">{item.sku}</span>
                    <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md">QTD: {item.qtd}</span>
                  </div>
                ))}
                {showSyncReport && (
                  <div className="space-y-3">
                    {outOfStockSkus.length > 0 && <div><p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Esgotados ({outOfStockSkus.length})</p>{outOfStockSkus.map((s, i) => <div key={i} className="px-3 py-1.5 bg-rose-50 rounded-lg text-[10px] font-bold text-rose-800">{s.nome}</div>)}</div>}
                    {lastUnitsSkus.length > 0 && <div><p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Últimas Unidades ({lastUnitsSkus.length})</p>{lastUnitsSkus.map((s, i) => <div key={i} className="px-3 py-1.5 bg-amber-50 rounded-lg text-[10px] font-bold text-amber-800">{s.nome}</div>)}</div>}
                    {unregisteredSkus.length > 0 && <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Não Cadastrados ({unregisteredSkus.length})</p>{unregisteredSkus.map((s, i) => <div key={i} className="px-3 py-1.5 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600">{s.sku} — QTD: {s.qtd}</div>)}</div>}
                    {outOfStockSkus.length === 0 && lastUnitsSkus.length === 0 && unregisteredSkus.length === 0 && <p className="text-xs text-slate-300 text-center py-4">Nenhuma alteração detectada.</p>}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {showUnregisteredAlert && (
                  <button onClick={() => { setShowUnregisteredAlert(false); setShowSyncReport(true); }}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all">Ver Relatório</button>
                )}
                <button onClick={() => { setShowPriceAlert(false); setPriceChanges([]); setShowUnregisteredAlert(false); setShowSyncReport(false); setLastUnitsSkus([]); setOutOfStockSkus([]); setUnregisteredSkus([]); }}
                  className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-black hover:bg-primary/90 transition-all">
                  {showSyncReport ? 'Fechar' : 'Entendido'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
