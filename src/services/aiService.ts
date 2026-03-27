import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

export async function classifyCategory(productName: string, categories: { id: string, nome: string }[]) {
  if (categories.length === 0) return null;

  const prompt = `Classifique o produto "${productName}" em uma das seguintes categorias: ${categories.map(c => c.nome).join(', ')}. 
  Retorne apenas o nome da categoria ou "pendente" se não tiver certeza.`;

  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const categoryName = response.text?.trim();
      const category = categories.find(c => c.nome === categoryName);
      
      return category ? category.id : null;
    } catch (error: any) {
      lastError = error;
      const isRetryable = error.message?.includes('503') || 
                        error.message?.includes('Deadline expired') || 
                        error.message?.includes('UNAVAILABLE');
      
      if (isRetryable && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, (2 ** attempt) * 1000));
        continue;
      }
      
      console.error("Erro na classificação de categoria:", error);
      return null;
    }
  }

  return null;
}

export async function extractProductsFromMedia(base64Data: string, mimeType: string, categories?: { id: string, nome: string }[]) {
  const categoriesList = categories?.map(c => c.nome).join(', ') || '';
  
  const prompt = `Analise este catálogo (pode ser uma imagem, PDF ou planilha) e extraia ABSOLUTAMENTE TODOS os produtos visíveis. 
  Não pule nenhum item. Se houver tabelas, percorra cada linha. Se houver várias páginas, extraia de todas.
  
  Para cada produto, identifique com precisão:
  - nome: Nome completo do produto (MUITO IMPORTANTE)
  - sku: Código, SKU ou Referência (se houver). Se não houver, deixe em branco.
  - preco_unitario: Preço por unidade (ex: 10,50). Se houver apenas preço de caixa, calcule o unitário dividindo pela quantidade.
  - preco_box: Preço da caixa fechada (se houver)
  - qtd_box: Quantidade de itens na caixa (ex: 12)
  - venda_somente_box: true se o produto só for vendido em caixa fechada
  - has_box_discount: true se houver desconto para compra em caixa
  - status_estoque: Tente identificar se está esgotado ou com poucas unidades. Use: "normal", "baixo", "ultimas" ou "esgotado".
  - variacoes: Cores, tamanhos ou sabores disponíveis (ex: "Azul, Verde, P, M, G")
  - qtd_variacoes: Número total de variações (ex: 5)
  ${categories ? `- category_name: Escolha a categoria mais adequada APENAS entre estas: [${categoriesList}]. Se não encontrar uma correspondência exata, deixe em branco.` : ''}

  IMPORTANTE: 
  1. Extraia TODOS os produtos. Se a lista for longa, continue extraindo até o fim.
  2. Se o preço estiver em formato brasileiro (R$ 1.234,56), mantenha a precisão decimal.
  3. Se houver descrições longas, resuma-as para economizar espaço no JSON.
  
  Retorne os dados em formato JSON seguindo este esquema rigoroso:
  {
    "products": [
      {
        "sku": "string",
        "nome": "string",
        "descricao": "string",
        "preco_unitario": "string",
        "preco_box": "string",
        "qtd_box": "string",
        "venda_somente_box": boolean,
        "has_box_discount": boolean,
        "is_last_units": boolean,
        "status_estoque": "normal | baixo | ultimas | esgotado",
        "variacoes": "string",
        "qtd_variacoes": "string"${categories ? ',\n        "category_name": "string"' : ''}
      }
    ]
  }`;

  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192
        }
      });

      let jsonText = response.text || "{}";
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        
        if (parsed.products) return parsed.products;
        if (parsed.produtos) return parsed.produtos;
        if (parsed.items) return parsed.items;
        if (parsed.itens) return parsed.itens;
        
        const keys = Object.keys(parsed);
        if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
          return parsed[keys[0]];
        }
        
        return [];
      } catch (parseError) {
        console.error("Erro ao parsear JSON da IA:", jsonText);
        
        // Tentar recuperar JSON truncado se possível
        if (jsonText.includes('"products": [')) {
          try {
            let partialJson = jsonText.split('"products": [')[1];
            // Tentar fechar o array e o objeto
            // Encontrar o último objeto completo
            const lastObjectEnd = partialJson.lastIndexOf('}');
            if (lastObjectEnd !== -1) {
              partialJson = '[' + partialJson.substring(0, lastObjectEnd + 1) + ']';
              const recovered = JSON.parse(partialJson);
              console.log(`Recuperados ${recovered.length} produtos de JSON truncado.`);
              return recovered;
            }
          } catch (e) {
            console.error("Falha ao recuperar JSON truncado");
          }
        }
        
        return [];
      }
    } catch (error: any) {
      lastError = error;
      const isRetryable = error.message?.includes('503') || 
                        error.message?.includes('Deadline expired') || 
                        error.message?.includes('UNAVAILABLE');
      
      if (isRetryable && attempt < maxRetries - 1) {
        console.warn(`Tentativa ${attempt + 1} falhou com erro de timeout/indisponibilidade. Tentando novamente em ${2 ** attempt}s...`);
        await new Promise(resolve => setTimeout(resolve, (2 ** attempt) * 1000));
        continue;
      }
      
      console.error("Erro ao extrair produtos da mídia:", error);
      throw new Error(error.message || "Erro desconhecido ao processar o arquivo com a IA.");
    }
  }

  throw lastError;
}

export async function querySalesInsights(
  question: string,
  salesData: { nome: string; sku: string; total_qtd: number; total_valor: number }[]
): Promise<string> {
  if (salesData.length === 0) {
    return 'Ainda não há dados de vendas suficientes para responder esta pergunta.';
  }

  const context = salesData
    .map((d, i) => `${i + 1}. ${d.nome} (SKU: ${d.sku}) — Qtd vendida: ${d.total_qtd} | Total: R$ ${d.total_valor.toFixed(2)}`)
    .join('\n');

  const prompt = `Você é um assistente de análise de vendas para um sistema de pedidos B2B de cosméticos e beleza.
Os dados abaixo estão ordenados do produto mais vendido para o menos vendido (por valor total).

DADOS DE VENDAS:
${context}

PERGUNTA DO USUÁRIO: ${question}

Responda de forma clara, objetiva e em português brasileiro. Se a pergunta pedir uma lista, use numeração. Seja direto.`;

  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text?.trim() || 'Não foi possível gerar uma resposta.';
    } catch (error: any) {
      lastError = error;
      const isRetryable = error.message?.includes('503') || 
                        error.message?.includes('Deadline expired') || 
                        error.message?.includes('UNAVAILABLE');
      
      if (isRetryable && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, (2 ** attempt) * 1000));
        continue;
      }
      
      console.error('Erro na consulta de insights:', error);
      throw new Error(error.message || 'Erro ao consultar a IA.');
    }
  }

  throw lastError;
}

export async function searchProductByImage(base64Data: string, mimeType: string) {
  const prompt = `Identifique o produto nesta imagem. Retorne apenas de 3 a 5 palavras-chave principais que descrevam o produto para serem usadas em uma busca no catálogo. Exemplo: "Batom Matte Vermelho", "Esmalte Impala Cremoso".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]
      }
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Erro na busca por imagem:", error);
    return "";
  }
}

export async function removeImageBackground(base64Data: string, mimeType: string) {
  const prompt = "Remove the background of this product image and place it on a pure white background. Keep the product exactly as it is, maintaining all its details, colors, and textures. The output should be only the product on a clean, solid white background.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("Não foi possível processar a imagem.");
  } catch (error: any) {
    console.error("Erro ao remover fundo da imagem:", error);
    throw new Error(error.message || "Erro ao processar a imagem com a IA.");
  }
}
