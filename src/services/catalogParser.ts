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
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Read as array of arrays first to find the header row at any offset
  const allRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
  if (allRows.length === 0) return [];

  // Find the header row (the one that has columns like sku, codigo, etc.)
  let headerRowIdx = 0;
  let maxMatches = 0;

  for (let r = 0; r < Math.min(15, allRows.length); r++) {
    const row = allRows[r];
    if (!Array.isArray(row)) continue;
    
    let matches = 0;
    for (const val of row) {
      if (!val) continue;
      const s = String(val).toLowerCase();
      if (/sku|codigo|cod|ref|referencia/i.test(s)) matches++;
      if (/nome|produto|descrição|description|detalhe/i.test(s)) matches++;
      if (/preço|preco|valor|price|unitario|custo|venda/i.test(s)) matches++;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      headerRowIdx = r;
    }
  }

  const headers = (maxMatches > 0 ? allRows[headerRowIdx] : allRows[0]) || [];
  const headerKeys = headers.map((h: any) => String(h || '').trim().toLowerCase());

  const skuIdx = headerKeys.findIndex(h => /sku|codigo|cod|ref|referencia/i.test(h));
  const nomeIdx = headerKeys.findIndex(h => /nome|produto|descrição|description|detalhe/i.test(h));
  const precoIdx = headerKeys.findIndex(h => /preço|preco|valor|price|unitario|venda|tabela\s*1/i.test(h));
  const precoBoxIdx = headerKeys.findIndex(h => /box|tabela\s*4|tabela4|atacado/i.test(h));
  const qtdIdx = headerKeys.findIndex(h => /quantidade|qtd|estoque|stock|qnt|disponivel|saldo/i.test(h));
  const unidadeIdx = headerKeys.findIndex(h => /unidade|un|tipo/i.test(h));
  const barcodeIdx = headerKeys.findIndex(h => /barcode|codigo de barras|código de barras|bar code|ean|cod\.barras|cod barras/i.test(h));
  const categoriaIdx = headerKeys.findIndex(h => /categoria|category|grupo/i.test(h));

  const results: ParsedCatalogProduct[] = [];
  const startRow = maxMatches > 0 ? headerRowIdx + 1 : 1;

  for (let r = startRow; r < allRows.length; r++) {
    const row = allRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawSku = skuIdx !== -1 ? row[skuIdx] : null;
    if (!rawSku) continue;

    const sku = String(rawSku).trim().toUpperCase();
    if (!sku || sku === 'UNDEFINED' || sku === 'NULL') continue;

    const nome = nomeIdx !== -1 && row[nomeIdx] ? String(row[nomeIdx]).trim() : '';
    const { qtdBox, multiploVenda } = extractQtdBoxAndMultiplo(nome);
    const estoque = qtdIdx !== -1 ? parseNumber(row[qtdIdx], 0) : undefined;
    const unidade = unidadeIdx !== -1 && row[unidadeIdx] ? String(row[unidadeIdx]).trim().toUpperCase() : 'UN';
    
    let precoUnitario = precoIdx !== -1 ? parseNumber(row[precoIdx]) : 0;
    let precoBox = precoBoxIdx !== -1 ? parseNumber(row[precoBoxIdx]) : 0;
    const vendaSomenteBox = unidade === 'BX';
    if (vendaSomenteBox && precoBox === 0 && precoUnitario > 0) {
      precoBox = precoUnitario;
      precoUnitario = precoBox / (qtdBox || 1);
    }

    results.push({
      sku,
      nome: decodeHtmlEntities(nome || `Produto ${sku}`),
      barcode: barcodeIdx !== -1 && row[barcodeIdx] ? String(row[barcodeIdx]).trim() : undefined,
      preco_unitario: precoUnitario,
      preco_box: precoBox,
      qtd_box: qtdBox,
      unidade,
      multiplo_venda: multiploVenda,
      estoque,
      status_estoque: statusFromQtd(estoque),
      category_name: categoriaIdx !== -1 && row[categoriaIdx] ? decodeHtmlEntities(String(row[categoriaIdx]).trim()) : undefined,
      source: 'excel',
    });
  }

  // Fallback to old sheet_to_json if header-row offset heuristics resulted in nothing
  if (results.length === 0) {
    const standardRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
    for (const sRow of standardRows) {
      const keys = Object.keys(sRow);
      const sSkuKey = keys.find(k => /sku|codigo|cod|ref|referencia/i.test(k));
      const sNomeKey = keys.find(k => /nome|produto|descrição|description|detalhe/i.test(k));
      const sPrecoKey = keys.find(k => /preço|preco|valor|price|unitario|venda/i.test(k));
      const sPrecoBoxKey = keys.find(k => /box|tabela\s*4|tabela4|atacado/i.test(k));
      const sQtdKey = keys.find(k => /quantidade|qtd|estoque|stock|qnt|disponivel/i.test(k));
      const sUnidadeKey = keys.find(k => /unidade|un|tipo/i.test(k));
      const sBarcodeKey = keys.find(k => /barcode|codigo de barras|código de barras|bar code|ean|cod\.barras|cod barras/i.test(k));
      const sCategoriaKey = keys.find(k => /categoria|category|grupo/i.test(k));

      if (!sSkuKey || !sRow[sSkuKey]) continue;
      const sku = String(sRow[sSkuKey]).trim().toUpperCase();
      const nome = sNomeKey ? String(sRow[sNomeKey]).trim() : '';
      const { qtdBox, multiploVenda } = extractQtdBoxAndMultiplo(nome);
      const estoque = sQtdKey ? parseNumber(sRow[sQtdKey], 0) : undefined;
      const unidade = sUnidadeKey ? String(sRow[sUnidadeKey]).trim().toUpperCase() : 'UN';
      let precoUnitario = sPrecoKey ? parseNumber(sRow[sPrecoKey]) : 0;
      let precoBox = sPrecoBoxKey ? parseNumber(sRow[sPrecoBoxKey]) : 0;
      if (unidade === 'BX' && precoBox === 0 && precoUnitario > 0) {
        precoBox = precoUnitario;
        precoUnitario = precoBox / (qtdBox || 1);
      }

      results.push({
        sku,
        nome: decodeHtmlEntities(nome || `Produto ${sku}`),
        barcode: sBarcodeKey ? String(sRow[sBarcodeKey]).trim() : undefined,
        preco_unitario: precoUnitario,
        preco_box: precoBox,
        qtd_box: qtdBox,
        unidade,
        multiplo_venda: multiploVenda,
        estoque,
        status_estoque: statusFromQtd(estoque),
        category_name: sCategoriaKey ? decodeHtmlEntities(String(sCategoriaKey).trim()) : undefined,
        source: 'excel',
      });
    }
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

// Fallback heurístico inteligente para PDFs de tabelas sem rótulos explícitos (ex: "Código / SKU / Ref")
function parseLinesHeuristically(lines: string[]): ParsedCatalogProduct[] {
  const results: ParsedCatalogProduct[] = [];
  const seen = new Set<string>();

  const stopWords = new Set([
    'BOX', 'PCT', 'UNI', 'UND', 'UN', 'PAG', 'FOLHA', 'R$', 'VALOR', 'TOTAL', 
    'PRECO', 'PREÇO', 'C/12', 'CX', 'TABELA', 'CATALOGO', 'CATÁLOGO', 'PÁGINA',
    'PAGINA', 'TELEFONE', 'CONTATO', 'VIVAI', 'JB', 'COSMETICOS', 'COSMÉTICOS',
    'EMPRESA', 'CLIENTE', 'PEDIDO', 'DATA', 'VENDEDOR', 'MARCA', 'COD', 'REF',
    'SKU', 'EAN', 'DUN', 'S/D'
  ]);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Procura por preço no formato brasileiro (ex: R$ 15,90 ou 15,90) ou decimal simples
    const priceMatch = line.match(/(?:R\$\s*)?(\d{1,4},\d{2})\b/) || line.match(/R\$\s*([\d.,]+)/);
    if (!priceMatch) continue;

    const priceVal = parseNumber(priceMatch[1]);
    if (priceVal <= 0) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 3) continue;

    // Busca um SKU/Código candidato nos primeiros 3 tokens
    let sku = '';
    let skuIdx = -1;

    for (let j = 0; j < Math.min(3, tokens.length); j++) {
      const token = tokens[j].toUpperCase().replace(/[:.\-]/g, '');
      if (
        tokens[j].length >= 3 && 
        tokens[j].length <= 15 && 
        /^[A-Z0-9\-./]+$/i.test(tokens[j]) && 
        !stopWords.has(token) &&
        !/^\d{2}\/\d{2}\/\d{4}$/.test(tokens[j]) && 
        !/^\d{1,4},\d{2}$/.test(tokens[j]) && 
        !/^R\$$/i.test(tokens[j])
      ) {
        sku = tokens[j].toUpperCase().trim();
        skuIdx = j;
        break;
      }
    }

    if (!sku || skuIdx === -1) continue;
    if (seen.has(sku)) continue;

    // Extrai o nome limpando as informações do SKU, do Preço, de R$, etc.
    const cleanTokens = tokens.filter((t, idx) => {
      if (idx === skuIdx) return false;
      if (t === priceMatch[0] || t.includes(priceMatch[1])) return false;
      if (t.toUpperCase() === 'R$') return false;
      const upper = t.toUpperCase().replace(/[.:]/g, '');
      if (['UN', 'UND', 'UNID', 'PC', 'PÇ', 'PÇA', 'CX', 'CAIXA', 'KIT', 'PCT', 'PACOTE'].includes(upper)) return false;
      return true;
    });

    const nome = cleanTokens.join(' ').trim();
    if (!nome || nome.length < 3) continue;

    seen.add(sku);
    results.push({
      sku,
      nome: decodeHtmlEntities(nome),
      preco_unitario: priceVal,
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

  // Detecta se este arquivo possui o formato de catálogo com marcadores BOX/PCT e UNI (ex: Vivai, JB Cosméticos)
  let isCatalogFormat = false;
  let catalogMatches = 0;
  for (const pageL of pagesLines) {
    const pageText = pageL.join(' ');
    // Tornamos os dois pontos opcionais e adicionamos suporte a "R$" para dar suporte a variações de impressão
    const hasBoxOrPct = /(?:BOX|PCT)\s*:?\s*(?:R\$\s*)?[\d.,]+/i.test(pageText);
    const hasUni = /UNI\s*:?\s*(?:R\$\s*)?[\d.,]+/i.test(pageText);
    const hasSkuCandidate = /\b\d{1,4}(?:\.\d{1,4}){2,3}\b/.test(pageText) || /\b[A-Z0-9-]{3,12}\b/i.test(pageText);
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

    const stopWords = new Set([
      'BOX', 'PCT', 'UNI', 'UND', 'UN', 'PAG', 'FOLHA', 'R$', 'VALOR', 'TOTAL', 
      'PRECO', 'PREÇO', 'C/12', 'CX', 'TABELA', 'CATALOGO', 'CATÁLOGO', 'PÁGINA',
      'PAGINA', 'TELEFONE', 'CONTATO', 'VIVAI', 'JB', 'COSMETICOS', 'COSMÉTICOS',
      'EMPRESA', 'CLIENTE', 'PEDIDO', 'DATA', 'VENDEDOR', 'MARCA', 'COD', 'REF',
      'SKU', 'EAN', 'DUN', 'S/D'
    ]);

    for (const pageL of pagesLines) {
      const pageText = pageL.join(' ');

      // Extração de SKU flexível para páginas do Catálogo
      let sku = '';
      
      // 1. Procurar por rótulos explícitos primeiro
      const labelMatch = pageText.match(/(?:SKU|C[OÓ]D(?:IGO)?|REF(?:ER[EÊ]NCIA)?)\s*[:.\-]?\s*([A-Z0-9-]{3,12})/i);
      if (labelMatch) {
        sku = labelMatch[1].trim().toUpperCase();
      } else {
        // 2. Procurar por formato com pontos (ex: 10.20.30)
        const dottedMatches = pageText.match(/\b\d{1,4}(?:\.\d{1,4}){2,3}\b/g) || [];
        for (const cand of dottedMatches) {
          if (!/^\d{2}\.\d{2}\.\d{4}$/.test(cand)) { // ignora datas comuns
            sku = cand.trim().toUpperCase();
            break;
          }
        }
        // 3. Heurística: primeiro token de linha que se parece com código
        if (!sku) {
          for (const l of pageL) {
            const firstToken = l.split(/\s+/)[0];
            if (firstToken && /^[A-Z0-9-]{3,12}$/i.test(firstToken)) {
              const upper = firstToken.toUpperCase().replace(/[:.\-]/g, '');
              if (!stopWords.has(upper) && !/^\d{1,4},\d{2}$/.test(firstToken)) {
                sku = firstToken.toUpperCase().trim();
                break;
              }
            }
          }
        }
      }

      if (!sku) continue;
      if (seen.has(sku)) continue;
      seen.add(sku);

      // Preço de BOX / PCT (suporta dois pontos opcionais e cifra de R$)
      const bpMatch = pageText.match(/(?:BOX|PCT)\s*:?\s*(?:R\$\s*)?([\d.,]+)/i);
      const boxPrice = bpMatch ? parseNumber(bpMatch[1]) : 0;

      // Preço UNI (suporta dois pontos opcionais e cifra de R$)
      const upMatch = pageText.match(/UNI\s*:?\s*(?:R\$\s*)?([\d.,]+)/i);
      const unitPrice = upMatch ? parseNumber(upMatch[1]) : 0;

      // Quantidade no BOX (ex: "BOX C/12", "C/24", etc.)
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

      // Nome do produto da página
      let nome = '';
      if (pageL.length > 1) {
        const cleanLines = pageL.filter(l => 
          !l.includes(sku) && 
          !/(?:BOX|PCT|UNI)\s*:?/i.test(l) && 
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

  // Fallback para leitura linha a linha
  const flatLines: string[] = [];
  pagesLines.forEach(pl => flatLines.push(...pl));

  // Tenta o parser de linha tradicional primeiro
  const traditionalResults = parseLinesIntoProducts(flatLines);
  if (traditionalResults.length > 0) {
    return traditionalResults;
  }

  // Se o tradicional não obteve nada (linhas sem SKU/COD de rótulo explícito), tenta a heurística de tabela
  return parseLinesHeuristically(flatLines);
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
