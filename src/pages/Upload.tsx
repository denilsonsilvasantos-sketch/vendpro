import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Trash2, Send, AlertTriangle, RefreshCw, ChevronDown, Sparkles, Database, Zap, Download, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../integrations/supabaseClient';
import { extractProductsFromMedia, classifyCategory } from '../services/aiService';
import { Brand, Product } from '../types';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [selectedCatalogBrands, setSelectedCatalogBrands] = useState<string[]>([]);
  const [selectedCatalogCategories, setSelectedCatalogCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false);
  const [includeLastUnits, setIncludeLastUnits] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchCatalogCategories() {
      if (!supabase || selectedCatalogBrands.length === 0) {
        setAvailableCategories([]);
        setSelectedCatalogCategories([]);
        return;
      }
      const { data } = await supabase
        .from('categories')
        .select('id, nome, brand_id')
        .in('brand_id', selectedCatalogBrands)
        .order('nome');
      setAvailableCategories(data || []);
    }
    fetchCatalogCategories();
  }, [selectedCatalogBrands]);

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
    } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            resolve([{ base64: btoa(unescape(encodeURIComponent(text))), mimeType: 'text/html' }]);
          } catch (error) { reject(error); }
        };
        reader.onerror = error => reject(error);
        reader.readAsText(file);
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
        if (uploadMode === 'stock' && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.html') || fileName.endsWith('.htm'))) {
          newFiles.push({ file, pages: [] });
        } else {
          newFiles.push({ file, pages: await processFileToBase64(file) });
        }
      } catch (error) {
        alert(`Erro ao processar ${file.name}`);
      }
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => setUploadedFiles(prev => prev.filter((_, i) => i !== index));

  const extractFromHtml = (html: string): any[] => {
    const results: any[] = [];
    // Regex para capturar SKU e Quantidade do formato Pluggar
    // SKU: <p class="bold font-size-14 pull-right"> SKU: 10582</p>
    // QTD: <p class="font-size-12"> <i class="fas fa-play-circle text-success mr-2"></i> Disponível: 25</p>
    
    const productBlocks = html.split(/<tr[^>]*class=["'](?:even|odd)["'][^>]*>/i);
    
    productBlocks.forEach(block => {
      const skuMatch = block.match(/SKU:\s*([A-Z0-9-]+)/i);
      const qtdMatch = block.match(/Disponível:\s*(\d+)/i);
      // Nome: Geralmente em um link ou span antes do SKU
      const nomeMatch = block.match(/<p[^>]*class=["']bold font-size-14 pull-left["'][^>]*>([^<]+)<\/p>/i) || 
                        block.match(/<a[^>]*>([^<]+)<\/a>/i) || 
                        block.match(/<span[^>]*class=["']product-name["'][^>]*>([^<]+)<\/span>/i);
      
      const unidadeMatch = block.match(/Unidade:\s*([A-Z]+)/i);
      
      // Preço Padrão (Unitário)
      const precoPadraoMatch = block.match(/Padrão<\/p>\s*<p[^>]*>\s*R\$\s*([\d.,]+)/i) || block.match(/R\$\s*([\d.,]+)/i);
      
      // TABELA 4 (Desconto no Box ou Preço do Box)
      const precoTabela4Match = block.match(/TABELA 4<\/p>\s*<p[^>]*>\s*R\$\s*([\d.,]+)/i);
      
      if (skuMatch && qtdMatch) {
        const sku = skuMatch[1].trim().toUpperCase();
        const nome = nomeMatch ? nomeMatch[1].trim() : '';
        const unidade = unidadeMatch ? unidadeMatch[1].trim().toUpperCase() : 'UN';
        const precoPadrao = precoPadraoMatch ? parseNumber(precoPadraoMatch[1]) : undefined;
        const precoTabela4 = precoTabela4Match ? parseNumber(precoTabela4Match[1]) : undefined;
        
        // Extrai Qtd Box do nome (ex: BX C/12 ou (Emb C/12))
        const qtdBoxMatch = nome.match(/BX\s*C\/(\d+)/i) || 
                           nome.match(/C\/(\d+)/i) || 
                           nome.match(/Emb\s*C\/(\d+)/i) ||
                           nome.match(/(\d+)\s*un/i);
        const qtdBox = qtdBoxMatch ? parseInt(qtdBoxMatch[1], 10) : 1;

        results.push({
          sku,
          qtd: parseInt(qtdMatch[1], 10),
          nome,
          unidade,
          precoPadrao,
          precoTabela4,
          qtdBox
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
      let authUser = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        authUser = user;
      } catch (err) {
        const { data: { session } } = await supabase.auth.getSession();
        authUser = session?.user || null;
      }

      if (authUser) {
        console.log('Sincronização de estoque iniciada por:', authUser.email, 'para empresa:', companyId);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
        if (profile && profile.company_id !== companyId) {
          console.warn('AVISO: O company_id do perfil não coincide com o companyId do componente!');
        }
      } else {
        console.log('Sincronização de estoque iniciada (sem sessão Auth) para empresa:', companyId);
      }

      const file = uploadedFiles[0].file;
      const fileName = file.name.toLowerCase();
      let syncData: any[] = [];

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
          const nomeKey = Object.keys(row).find(k => /nome|produto|descrição|description/i.test(k));
          const precoKey = Object.keys(row).find(k => /preço|preco|valor|price|unitario|padrao/i.test(k));
          const precoBoxKey = Object.keys(row).find(k => /box|tabela 4|tabela4/i.test(k));
          const unidadeKey = Object.keys(row).find(k => /unidade|un|tipo/i.test(k));

          if (skuKey) {
            const sku = String(row[skuKey]).trim().toUpperCase();
            const nome = nomeKey ? String(row[nomeKey]).trim() : '';
            const qtdBoxMatch = nome.match(/BX\s*C\/(\d+)/i) || nome.match(/C\/(\d+)/i) || nome.match(/Emb\s*C\/(\d+)/i);
            
            if (sku) syncData.push({ 
              sku, 
              qtd: parseNumber(qtdKey ? row[qtdKey] : 0, 0),
              nome: nome || undefined,
              precoPadrao: precoKey ? parseNumber(row[precoKey]) : undefined,
              precoTabela4: precoBoxKey ? parseNumber(row[precoBoxKey]) : undefined,
              unidade: unidadeKey ? String(row[unidadeKey]).trim().toUpperCase() : 'UN',
              qtdBox: qtdBoxMatch ? parseInt(qtdBoxMatch[1], 10) : 1
            });
          }
        });
      }

      if (syncData.length === 0) throw new Error('Não foi possível identificar produtos no arquivo.');
      
      const { data: existingProducts } = await supabase.from('products').select('id, sku, nome, status_estoque, estoque, preco_unitario, preco_box, venda_somente_box, has_box_discount, qtd_box').eq('company_id', companyId).eq('brand_id', selectedBrandId);
      if (!existingProducts) throw new Error('Erro ao buscar produtos.');
      
      const existingMap = new Map(existingProducts.map(p => [p.sku.toUpperCase().trim(), p]));
      const fileSkus = new Set(syncData.map(d => d.sku));
      const updates: any[] = [];
      const unregistered: { sku: string, qtd: number }[] = [];
      const newOutOfStock: { sku: string, nome: string }[] = [];
      const newLastUnits: { sku: string, nome: string }[] = [];

      for (const d of syncData) {
        const existing = existingMap.get(d.sku);
        if (existing) {
          const newStatus = d.qtd === 0 ? 'esgotado' : d.qtd < 10 ? 'ultimas' : 'normal';
          
          const nameChanged = d.nome && d.nome !== existing.nome;
          
          // Lógica de Preço e Flags
          let precoUnitario = d.precoPadrao;
          let precoBox = d.precoTabela4 !== undefined ? d.precoTabela4 : existing.preco_box;
          let vendaSomenteBox = d.unidade === 'BX';
          let hasBoxDiscount = d.precoTabela4 !== undefined && d.unidade === 'UN';
          
          // Se for venda somente box, o preço padrão do arquivo é o preço do box
          if (vendaSomenteBox) {
            precoBox = d.precoPadrao;
            // O preço unitário no banco deve ser o preço do box dividido pela quantidade
            if (precoBox !== undefined) {
              precoUnitario = precoBox / (d.qtdBox || 1);
            }
          }

          const priceChanged = (precoUnitario !== undefined && Math.abs(precoUnitario - (existing.preco_unitario || 0)) > 0.001) || 
                               (precoBox !== undefined && Math.abs(precoBox - (existing.preco_box || 0)) > 0.001);
          
          const flagsChanged = vendaSomenteBox !== existing.venda_somente_box || 
                               hasBoxDiscount !== existing.has_box_discount ||
                               (d.qtdBox !== undefined && d.qtdBox !== existing.qtd_box);

          if (existing.status_estoque !== newStatus || existing.estoque !== d.qtd || nameChanged || priceChanged || flagsChanged) {
            const updateObj: any = { 
              id: existing.id, 
              status_estoque: newStatus, 
              estoque: d.qtd,
              venda_somente_box: vendaSomenteBox,
              has_box_discount: hasBoxDiscount,
              qtd_box: d.qtdBox || existing.qtd_box
            };
            if (nameChanged) updateObj.nome = d.nome;
            if (precoUnitario !== undefined) updateObj.preco_unitario = precoUnitario;
            if (precoBox !== undefined) updateObj.preco_box = precoBox;
            
            updates.push(updateObj);
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
          await Promise.all(updates.slice(i, i + batchSize).map(u => {
            const { id, ...data } = u;
            return supabase!.from('products').update(data).eq('id', id);
          }));
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
      let authUser = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        authUser = user;
      } catch (err) {
        const { data: { session } } = await supabase.auth.getSession();
        authUser = session?.user || null;
      }

      if (authUser) {
        console.log('Upload iniciado por:', authUser.email, 'para empresa:', companyId);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
        if (profile && profile.company_id !== companyId) {
          console.warn('AVISO: O company_id do perfil não coincide com o companyId do componente!');
        }
      } else {
        console.log('Upload iniciado (sem sessão Auth) para empresa:', companyId);
      }

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
            const { data: newCat, error: catError } = await supabase.from('categories').insert([{ company_id: companyId, brand_id: selectedBrandId, nome: categoryName, ativo: true }]).select('id, nome').single();
            if (catError) {
              console.error('Erro ao criar categoria:', catError);
              throw new Error(`Erro ao criar categoria (RLS?): ${catError.message}`);
            }
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
            let parsedPrecoUnitario = parseNumber(extracted.preco_unitario, 0);
            const parsedPrecoBox = parseNumber(extracted.preco_box, 0);
            const parsedQtdBox = parseNumber(extracted.qtd_box, 1);

            // Regra: Se for venda somente box, o preço unitário é o preço box dividido pela quantidade
            if (!!extracted.venda_somente_box && parsedPrecoBox > 0 && parsedQtdBox > 0) {
              parsedPrecoUnitario = parsedPrecoBox / parsedQtdBox;
            }

            if (existing && catalogType === 'replenishment' && (existing.preco_unitario || 0) !== parsedPrecoUnitario) {
              const m = margin > 0 ? (1 + margin / 100) : 1;
              setPriceChanges(prev => [...prev, { sku, old: (existing.preco_unitario || 0) * m, new: parsedPrecoUnitario * m }]);
              pendingStatus = 'price_changed';
            }
            const validStatus = ['normal', 'baixo', 'ultimas', 'esgotado'];
            let statusEstoque = validStatus.includes(extracted.status_estoque) ? extracted.status_estoque : 'normal';
            
            // Se a IA marcou como últimas unidades, garante que o status reflita isso
            if (extracted.is_last_units && statusEstoque === 'normal') {
              statusEstoque = 'ultimas';
            }
            
            // Se o estoque for 0, garante que o status seja esgotado
            if (extracted.estoque === 0) {
              statusEstoque = 'esgotado';
            }
            
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
            
            let result;
            if (existing) {
              result = await supabase.from('products').update(productData).eq('id', existing.id);
            } else {
              result = await supabase.from('products').insert([productData]);
            }

            if (result.error) {
              console.error('Erro ao salvar produto:', result.error);
              throw new Error(`Erro no banco de dados (RLS?): ${result.error.message}`);
            }
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

  const toggleCatalogBrand = (brandId: string) => {
    setSelectedCatalogBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId) 
        : [...prev, brandId]
    );
  };

  const generatePdfCatalog = async () => {
    if (selectedCatalogBrands.length === 0) {
      setStatus({ type: 'warning', message: 'Selecione pelo menos uma marca para gerar o catálogo.' });
      return;
    }

    setIsGeneratingPdf(true);
    setDownloadProgress(0);
    setStatus({ type: 'info', message: 'Gerando catálogo PDF...' });

    try {
      // Fetch products and categories
      let productQuery = supabase!
        .from('products')
        .select('*')
        .in('brand_id', selectedCatalogBrands);

      if (selectedCatalogCategories.length > 0) {
        productQuery = productQuery.in('category_id', selectedCatalogCategories);
      }

      if (!includeOutOfStock) {
        productQuery = productQuery.neq('status_estoque', 'esgotado');
      }
      if (!includeLastUnits) {
        productQuery = productQuery.neq('status_estoque', 'ultimas');
      }

      const [productsRes, brandsRes, categoriesRes] = await Promise.all([
        productQuery.order('brand_id').order('category_id').order('nome'),
        supabase!
          .from('brands')
          .select('id, name')
          .in('id', selectedCatalogBrands),
        supabase!
          .from('categories')
          .select('id, nome')
          .in('brand_id', selectedCatalogBrands)
      ]);

      if (productsRes.error) throw productsRes.error;
      if (brandsRes.error) throw brandsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      const products = productsRes.data || [];
      const brandsMap = new Map((brandsRes.data || []).map(b => [b.id, b.name]));
      const categoriesMap = new Map((categoriesRes.data || []).map(c => [c.id, c.nome]));

      if (products.length === 0) {
        throw new Error('Nenhum produto encontrado com os filtros selecionados.');
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const cardWidth = 60;
      const cardHeight = 85;
      const gap = 5;
      const cols = 3;
      
      let currentX = margin;
      let currentY = 40;

      // Header
      const drawHeader = (pageNumber: number) => {
        doc.setFontSize(22);
        doc.setTextColor(236, 72, 153); // text-primary
        doc.text('Catálogo de Produtos', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // text-slate-500
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} | Página ${pageNumber}`, pageWidth / 2, 28, { align: 'center' });
      };

      drawHeader(1);

      // Helper to load image
      const loadImage = (url: string): Promise<string | null> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(null); return; }
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      // Group by brand then category
      const grouped: Record<string, Record<string, any[]>> = {};
      products.forEach(p => {
        const brandName = brandsMap.get(p.brand_id) || 'Sem Marca';
        const categoryName = categoriesMap.get(p.category_id) || 'Sem Categoria';
        if (!grouped[brandName]) grouped[brandName] = {};
        if (!grouped[brandName][categoryName]) grouped[brandName][categoryName] = [];
        grouped[brandName][categoryName].push(p);
      });

      let pageCount = 1;
      const totalProducts = products.length;
      let processedProducts = 0;

      for (const [brandName, categories] of Object.entries(grouped)) {
        // Brand Title
        if (currentY > pageHeight - 40) {
          doc.addPage();
          pageCount++;
          drawHeader(pageCount);
          currentY = 40;
        }

        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text(brandName, margin, currentY);
        currentY += 10;

        for (const [categoryName, categoryProducts] of Object.entries(categories)) {
          // Category Title
          if (currentY > pageHeight - 30) {
            doc.addPage();
            pageCount++;
            drawHeader(pageCount);
            currentY = 40;
          }

          doc.setFontSize(14);
          doc.setTextColor(100, 116, 139);
          doc.text(categoryName, margin, currentY);
          currentY += 8;

          let colIndex = 0;

          for (const p of categoryProducts) {
            processedProducts++;
            setDownloadProgress(Math.round((processedProducts / totalProducts) * 100));

            if (currentY + cardHeight > pageHeight - margin) {
              doc.addPage();
              pageCount++;
              drawHeader(pageCount);
              currentY = 40;
              colIndex = 0;
            }

            const x = margin + colIndex * (cardWidth + gap);
            const y = currentY;

            // Card Border
            doc.setDrawColor(241, 245, 249); // slate-100
            doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2);

            // Image
            if (p.imagem) {
              const base64 = await loadImage(p.imagem);
              if (base64) {
                try {
                  doc.addImage(base64, 'JPEG', x + 2, y + 2, cardWidth - 4, 45);
                } catch (e) {
                  console.error('Error adding image to PDF', e);
                }
              }
            } else {
              doc.setFillColor(248, 250, 252); // slate-50
              doc.rect(x + 2, y + 2, cardWidth - 4, 45, 'F');
              doc.setFontSize(8);
              doc.setTextColor(203, 213, 225);
              doc.text('Sem imagem', x + cardWidth / 2, y + 25, { align: 'center' });
            }

            // Product Info
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(9);
            const nameLines = doc.splitTextToSize(p.nome, cardWidth - 6);
            doc.text(nameLines.slice(0, 2), x + 3, y + 52);

            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`SKU: ${p.sku}`, x + 3, y + 62);

            // Price
            doc.setFontSize(10);
            doc.setTextColor(236, 72, 153);
            doc.text(`R$ ${Number(p.preco_unitario || 0).toFixed(2)}`, x + 3, y + 68);

            // Box Price
            if (p.preco_box && p.preco_box > 0) {
              doc.setFontSize(7);
              doc.setTextColor(100, 116, 139);
              doc.text(`Box: R$ ${Number(p.preco_box).toFixed(2)} (${p.qtd_box} un)`, x + 3, y + 73);
            }

            // Status Badge
            if (p.status_estoque === 'esgotado' || p.status_estoque === 'ultimas') {
              const statusText = p.status_estoque === 'esgotado' ? 'ESGOTADO' : 'ÚLTIMAS';
              const badgeColor = p.status_estoque === 'esgotado' ? [244, 63, 94] : [245, 158, 11];
              doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
              doc.roundedRect(x + 3, y + 78, 25, 4, 1, 1, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(6);
              doc.text(statusText, x + 15.5, y + 81, { align: 'center' });
            }

            colIndex++;
            if (colIndex >= cols) {
              colIndex = 0;
              currentY += cardHeight + gap;
            }
          }

          if (colIndex > 0) {
            currentY += cardHeight + gap;
          }
          currentY += 5; // Extra space between categories
        }
        currentY += 10; // Extra space between brands
      }

      doc.save(`Catalogo_VendPro_${new Date().getTime()}.pdf`);
      setStatus({ type: 'success', message: 'Catálogo gerado com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      setStatus({ type: 'error', message: `Erro ao gerar catálogo: ${error.message}` });
    } finally {
      setIsGeneratingPdf(false);
    }
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
                {mode === 'catalog' ? <><Sparkles size={10} strokeWidth={3} /> Catálogo (PDF/Excel/IA)</> : <><Database size={10} strokeWidth={3} /> Estoque (Excel/HTML)</>}
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

          {/* Download Section */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Download size={12} className="text-primary" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Download de Catálogo</span>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtros do Catálogo</p>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${includeOutOfStock ? 'bg-rose-500 border-rose-500' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
                    {includeOutOfStock && <CheckCircle2 size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <input type="checkbox" className="hidden" checked={includeOutOfStock} onChange={e => setIncludeOutOfStock(e.target.checked)} />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Incluir Esgotados</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${includeLastUnits ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
                    {includeLastUnits && <CheckCircle2 size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <input type="checkbox" className="hidden" checked={includeLastUnits} onChange={e => setIncludeLastUnits(e.target.checked)} />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Incluir Últimas Unidades</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecione as marcas</p>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                {brands.map(brand => (
                  <label key={brand.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${selectedCatalogBrands.includes(brand.id) ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedCatalogBrands.includes(brand.id) ? 'bg-primary border-primary' : 'bg-white border-slate-200'}`}>
                      {selectedCatalogBrands.includes(brand.id) && <CheckCircle2 size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedCatalogBrands.includes(brand.id)} onChange={() => toggleCatalogBrand(brand.id)} />
                    <span className={`text-[10px] font-bold truncate ${selectedCatalogBrands.includes(brand.id) ? 'text-primary' : 'text-slate-600'}`}>{brand.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedCatalogBrands.length > 0 && availableCategories.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtrar por categorias (opcional)</p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {availableCategories.map(cat => (
                    <label key={cat.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${selectedCatalogCategories.includes(cat.id) ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedCatalogCategories.includes(cat.id) ? 'bg-primary border-primary' : 'bg-white border-slate-200'}`}>
                        {selectedCatalogCategories.includes(cat.id) && <CheckCircle2 size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedCatalogCategories.includes(cat.id)} onChange={() => {
                        setSelectedCatalogCategories(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]);
                      }} />
                      <span className={`text-[10px] font-bold truncate ${selectedCatalogCategories.includes(cat.id) ? 'text-primary' : 'text-slate-600'}`}>{cat.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={generatePdfCatalog}
              disabled={isGeneratingPdf || selectedCatalogBrands.length === 0}
              className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                isGeneratingPdf || selectedCatalogBrands.length === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'pink-gradient text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isGeneratingPdf ? (
                <div className="flex flex-col items-center gap-1 w-full px-4">
                  <div className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    <span className="truncate">Gerando PDF... {downloadProgress}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <>
                  <Printer size={12} />
                  Gerar Catálogo PDF
                </>
              )}
            </button>
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
