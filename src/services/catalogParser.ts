import * as XLSX from 'xlsx';
import { decodeHtmlEntities } from '../utils/text';

export interface ParsedCatalogProduct {
  sku: string;
  nome: string;
  barcode?: string;
  preco_unitario: number;
  preco_box: number;
  qtd_box: number;
  unidade: string;
  multiplo_venda: number;
  estoque?: number;
  status_estoque: 'normal' | 'baixo' | 'ultimas' | 'esgotado';
  category_name?: string;
  source: 'excel' | 'html' | 'pdf';
  low_confidence?: boolean;
}

export function parseNumber(val: any, fallback = 0): number {
  if (typeof val === 'number') return val;
  if (!val) return fallback;
  let s = String(val).trim().replace(/[^\d.,-]/g, '');
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n;
}

function statusFromQtd(qtd: number | undefined): 'normal' | 'baixo' | 'ultimas' | 'esgotado' {
  if (qtd === undefined) return 'normal';
  if (qtd === 0) return 'esgotado';
  if (qtd < 10) return 'ultimas';
  return 'normal';
}

function extractQtdBoxAndMultiplo(nome: string): { qtdBox: number, multiploVenda: number } {
  const qtdBoxMatch = nome.match(/BX\s*C\/(\d+)/i) || nome.match(/C\/(\d+)/i) || nome.match(/Emb\s*C\/(\d+)/i);
  const multiploMatch = nome.match(/!(\d+)/) || nome.match(/Variação de (\d+) Modelos/i);
  return {
    qtdBox: qtdBoxMatch ? parseInt(qtdBoxMatch[1], 10) : 1,
    multiploVenda: multiploMatch ? parseInt(multiploMatch[1], 10) : 1,
  };
}

// ---------- Excel / CSV ----------

export async function parseExcelCatalog(file: File): Promise<ParsedCatalogProduct[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[workbook.SheetNames[0]]);
  const results: ParsedCatalogProduct[] = [];

  for (const row of rows) {
    const keys = Object.keys(row);
    const skuKey = keys.find(k => /sku|codigo|cod|ref|referencia/i.test(k));
    const nomeKey = keys.find(k => /nome|produto|descrição|description/i.test(k));
    const precoKey = keys.find(k => /preço|preco|valor|price|unitario|padrao/i.test(k));
    const precoBoxKey = keys.find(k => /box|tabela 4|tabela4/i.test(k));
    const qtdKey = keys.find(k => /quantidade|qtd|estoque|stock|qnt|disponivel/i.test(k));
    const unidadeKey = keys.find(k => /unidade|un|tipo/i.test(k));
    const barcodeKey = keys.find(k => /barcode|codigo de barras|código de barras|bar code|ean|cod\.barras|cod barras/i.test(k));
    const categoriaKey = keys.find(k => /categoria|category|grupo/i.test(k));

    if (!skuKey || !row[skuKey]) continue;
    const sku = String(row[skuKey]).trim().toUpperCase();
    const nome = nomeKey ? String(row[nomeKey]).trim() : '';
    const { qtdBox, multiploVenda } = extractQtdBoxAndMultiplo(nome);
    const estoque = qtdKey ? parseNumber(row[qtdKey], 0) : undefined;
    const unidade = unidadeKey ? String(row[unidadeKey]).trim().toUpperCase() : 'UN';
    let precoUnitario = precoKey ? parseNumber(row[precoKey]) : 0;
    let precoBox = precoBoxKey ? parseNumber(row[precoBoxKey]) : 0;
    const vendaSomenteBox = unidade === 'BX';
    if (vendaSomenteBox && precoBox === 0 && precoUnitario > 0) {
      precoBox = precoUnitario;
      precoUnitario = precoBox / (qtdBox || 1);
    }

    results.push({
      sku,
      nome: decodeHtmlEntities(nome || `Produto ${sku}`),
      barcode: barcodeKey ? String(row[barcodeKey]).trim() : undefined,
      preco_unitario: precoUnitario,
      preco_box: precoBox,
      qtd_box: qtdBox,
      unidade,
      multiplo_venda: multiploVenda,
      estoque,
      status_estoque: statusFromQtd(estoque),
      category_name: categoriaKey ? decodeHtmlEntities(String(row[categoriaKey]).trim()) : undefined,
      source: 'excel',
    });
  }

  return results;
}

// ---------- HTML (formato Pluggar) ----------

export function parseHtmlCatalog(html: string): ParsedCatalogProduct[] {
  const results: ParsedCatalogProduct[] = [];
  const productBlocks = html.split(/<tr[^>]*class=["'](?:even|odd)["'][^>]*>/i);

  productBlocks.forEach(block => {
    const skuMatch = block.match(/SKU:\s*([A-Z0-9-]+)/i);
    if (!skuMatch) return;

    const qtdMatch = block.match(/Disponível:\s*(\d+)/i);
    const barcodeMatch = block.match(/Cod\.Barras:\s*(\d+)/i);
    const nomeMatch = block.match(/<p[^>]*class=["']bold font-size-14 pull-left["'][^>]*>([^<]+)<\/p>/i) ||
                      block.match(/<a[^>]*>([^<]+)<\/a>/i) ||
                      block.match(/<span[^>]*class=["']product-name["'][^>]*>([^<]+)<\/span>/i);
    const unidadeMatch = block.match(/Unidade:\s*([A-Z]+)/i);
    const precoPadraoMatch = block.match(/Padrão<\/p>\s*<p[^>]*>\s*R\$\s*([\d.,]+)/i) || block.match(/R\$\s*([\d.,]+)/i);
    const precoTabela4Match = block.match(/TABELA 4<\/p>\s*<p[^>]*>\s*R\$\s*([\d.,]+)/i);

    const sku = skuMatch[1].trim().toUpperCase();
    const nome = nomeMatch ? nomeMatch[1].trim() : '';
    const unidade = unidadeMatch ? unidadeMatch[1].trim().toUpperCase() : 'UN';
    const { qtdBox, multiploVenda } = extractQtdBoxAndMultiplo(nome);
    const estoque = qtdMatch ? parseInt(qtdMatch[1], 10) : undefined;

    let precoUnitario = precoPadraoMatch ? parseNumber(precoPadraoMatch[1]) : 0;
    let precoBox = precoTabela4Match ? parseNumber(precoTabela4Match[1]) : 0;
    const vendaSomenteBox = unidade === 'BX';
    if (vendaSomenteBox) {
      precoBox = precoPadraoMatch ? parseNumber(precoPadraoMatch[1]) : 0;
      if (precoBox) precoUnitario = precoBox / (qtdBox || 1);
    }

    results.push({
      sku,
      nome: decodeHtmlEntities(nome || `Produto ${sku}`),
      barcode: barcodeMatch ? barcodeMatch[1].trim() : undefined,
      preco_unitario: precoUnitario,
      preco_box: precoBox,
      qtd_box: qtdBox,
      unidade,
      multiplo_venda: multiploVenda,
      estoque,
      status_estoque: statusFromQtd(estoque),
      source: 'html',
    });
  });

  return results;
}

// ---------- PDF (texto bruto, sem IA) ----------

async function getPdfPagesLines(file: File): Promise<string[][]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pagesLines: string[][] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number, str: string }[]>();

    for (const item of content.items as any[]) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x: item.transform[4], str: item.str });
    }

    const pageLines: string[] = [];
    const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const line = rows.get(y)!.sort((a, b) => a.x - b.x).map(r => r.str).join(' ').replace(/\s+/g, ' ').trim();
      if (line) pageLines.push(line);
    }
    pagesLines.push(pageLines);
  }

  return pagesLines;
}

function parseLinesIntoProducts(lines: string[]): ParsedCatalogProduct[] {
  const priceRe = /R\$\s*([\d.,]+)/;
  const skuRe = /(?:SKU|C[OÓ]D(?:IGO)?|REF(?:ER[EÊ]NCIA)?)(?!\.?\s*(?:DE\s*)?BARRAS)[\s:.\-]{0,3}([A-Z0-9][A-Z0-9\-.\/]{1,19})/i;
  const barcodeRe = /(?:EAN|GTIN|C[OÓ]D\.?\s*(?:DE\s*)?BARRAS?)[\s:.\-]{0,3}(\d{8,14})/i;

  const results: ParsedCatalogProduct[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const skuMatch = lines[i].match(skuRe);
    if (!skuMatch) continue;

    const sku = skuMatch[1].trim().toUpperCase();
    if (seen.has(sku)) continue;

    // janela centrada no SKU (o preço/barcode geralmente vêm logo depois; o nome, logo antes).
    // Busca primeiro nas linhas seguintes ao SKU pra não pegar o preço do produto anterior.
    const windowLines = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 4));
    const afterText = lines.slice(i, Math.min(lines.length, i + 4)).join(' | ');
    const beforeText = lines.slice(Math.max(0, i - 2), i).join(' | ');
    const priceMatch = afterText.match(priceRe) || beforeText.match(priceRe);
    if (!priceMatch) continue; // sem preço próximo, não dá pra confiar que é um produto

    const barcodeMatch = afterText.match(barcodeRe) || beforeText.match(barcodeRe);

    // nome: prioriza a linha imediatamente anterior ao SKU (padrão mais comum);
    // se ela também for código/preço/barcode, usa a linha mais longa da janela
    let nome = '';
    const prevLine = lines[i - 1];
    if (prevLine && !priceRe.test(prevLine) && !skuRe.test(prevLine) && !barcodeRe.test(prevLine)) {
      nome = prevLine.trim();
    } else {
      for (const l of windowLines) {
        if (priceRe.test(l) || skuRe.test(l) || barcodeRe.test(l)) continue;
        if (l.length > nome.length) nome = l;
      }
    }

    seen.add(sku);
    results.push({
      sku,
      nome: decodeHtmlEntities(nome || `Produto ${sku}`),
      barcode: barcodeMatch ? barcodeMatch[1] : undefined,
      preco_unitario: parseNumber(priceMatch[1]),
      preco_box: 0,
      qtd_box: 1,
      unidade: 'UN',
      multiplo_venda: 1,
      status_estoque: 'normal',
      source: 'pdf',
      low_confidence: true,
    });
  }

  return results;
}

export async function parsePdfCatalog(file: File): Promise<ParsedCatalogProduct[]> {
  const pagesLines = await getPdfPagesLines(file);

  // Detect if this is the dotted/labeled Catalog format
  let isCatalogFormat = false;
  let catalogMatches = 0;
  for (const pageL of pagesLines) {
    const pageText = pageL.join(' ');
    const hasBoxOrPct = /(?:BOX|PCT):\s*[\d.,]+/i.test(pageText);
    const hasUni = /UNI:\s*[\d.,]+/i.test(pageText);
    const hasSkuCandidate = /\b\d{1,4}(?:\.\d{1,4}){2,3}\b/.test(pageText);
    if ((hasBoxOrPct || hasUni) && hasSkuCandidate) {
      catalogMatches++;
    }
  }
  if (catalogMatches >= Math.min(2, pagesLines.length)) {
    isCatalogFormat = true;
  }

  if (isCatalogFormat) {
    console.log('Detected Vivai/JB Catalog PDF format. Parsing page-by-page...');
    const results: ParsedCatalogProduct[] = [];
    const seen = new Set<string>();

    for (const pageL of pagesLines) {
      const pageText = pageL.join(' ');

      // Look for a SKU candidate (dotted sequence of numbers, excluding common date formats like DD/MM/YYYY)
      const skuMatches = pageText.match(/\b\d{1,4}(?:\.\d{1,4}){2,3}\b/g) || [];
      let sku = '';
      for (const cand of skuMatches) {
        if (!/^\d{2}\.\d{2}\.\d{4}$/.test(cand)) {
          sku = cand.trim().toUpperCase();
          break;
        }
      }
      if (!sku) continue;

      if (seen.has(sku)) continue;
      seen.add(sku);

      // BOX or PCT price
      const bpMatch = pageText.match(/(?:BOX|PCT):\s*([\d.,]+)/i);
      const boxPrice = bpMatch ? parseNumber(bpMatch[1]) : 0;

      // UNI price
      const upMatch = pageText.match(/UNI:\s*([\d.,]+)/i);
      const unitPrice = upMatch ? parseNumber(upMatch[1]) : 0;

      // BOX C/12 quantity (e.g. "BOX C/12", "PCT C/12", "BOX C/24", etc.)
      const bqMatch = pageText.match(/(?:BOX|PCT|C)\s*\/(\d+)/i) || pageText.match(/(?:BOX|PCT)\s+C\/(\d+)/i) || pageText.match(/C\/(\d+)/i);
      const boxQty = bqMatch ? parseInt(bqMatch[1]) : 12;

      let finalUnitPrice = unitPrice;
      let finalBoxPrice = boxPrice;
      if (finalUnitPrice === 0 && finalBoxPrice > 0 && boxQty > 0) {
        finalUnitPrice = finalBoxPrice / boxQty;
      }
      if (finalBoxPrice === 0 && finalUnitPrice > 0 && boxQty > 0) {
        finalBoxPrice = finalUnitPrice * boxQty;
      }

      // Name extraction: Usually, the name is on the second line (after the SKU) or contains description words
      let nome = '';
      if (pageL.length > 1) {
        const cleanLines = pageL.filter(l => 
          !l.includes(sku) && 
          !/(?:BOX|PCT|UNI):\s*[\d.,]+/i.test(l) && 
          !/(?:BOX|PCT|C)\s*\/(\d+)/i.test(l) &&
          !/BOX\s+C/i.test(l) &&
          !/PCT\s+C/i.test(l) &&
          !/^\d{2}\.\d{2}\.\d{4}$/.test(l)
        );
        if (cleanLines.length > 0) {
          nome = cleanLines[0];
          if (cleanLines.length > 1 && cleanLines[1].length > nome.length && cleanLines[1].length < 50) {
            nome = cleanLines[1];
          }
        }
      }
      if (!nome) nome = `Produto ${sku}`;

      nome = decodeHtmlEntities(nome.trim());

      results.push({
        sku,
        nome,
        preco_unitario: finalUnitPrice,
        preco_box: finalBoxPrice,
        qtd_box: boxQty,
        unidade: pageText.toUpperCase().includes('PCT') ? 'UN' : 'UN',
        multiplo_venda: 1,
        status_estoque: 'normal',
        source: 'pdf',
        low_confidence: false,
      });
    }
    return results;
  }

  // Fallback to old line-by-line parsing
  const flatLines: string[] = [];
  pagesLines.forEach(pl => flatLines.push(...pl));
  return parseLinesIntoProducts(flatLines);
}

// ---------- Roteador por tipo de arquivo ----------

export async function parseCatalogFile(file: File): Promise<ParsedCatalogProduct[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    return parseExcelCatalog(file);
  }
  if (name.endsWith('.html') || name.endsWith('.htm')) {
    const text = await file.text();
    return parseHtmlCatalog(text);
  }
  if (name.endsWith('.pdf')) {
    return parsePdfCatalog(file);
  }
  throw new Error(`Formato de arquivo não suportado para leitura sem IA: ${file.name}`);
}
