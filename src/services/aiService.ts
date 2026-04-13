import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
  
  const prompt = `Analise este catálogo e extraia ABSOLUTAMENTE TODOS os produtos. 
  Não pule nenhum item. Se houver tabelas, percorra cada linha.
  
  Para cada produto, identifique:
  - nome: Nome completo (NÃO inclua o nome da marca ou categoria no nome do produto)
  - sku: Código ou SKU
  - preco_unitario: Preço por unidade (ex: 10,50). Se for SOMENTE BOX, este valor deve ser o preco_box dividido pela qtd_box.
  - preco_box: Preço da caixa fechada (se houver)
  - qtd_box: Quantidade na caixa (ex: 12)
  - venda_somente_box: boolean
  - has_box_discount: boolean
  - status_estoque: "normal", "baixo", "ultimas" ou "esgotado"
  - tipo_variacao: 'grade', 'escolha_livre' ou 'variedades'
  - variacoes_disponiveis: Se 'escolha_livre', array {nome, opcoes[]}
  - variacoes_flat: Se 'variedades', array {sku, nome}
  ${categories ? `- category_name: Escolha entre [${categoriesList}]` : ''}

  IMPORTANTE: Seja conciso nas descrições. Extraia TODOS os produtos.
  
  Retorne APENAS o JSON no formato:
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
        "status_estoque": "string",
        "tipo_variacao": "string",
        "variacoes_disponiveis": [],
        "variacoes_flat": []${categories ? ',\n        "category_name": "string"' : ''}
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
            
            // Se terminou no meio de uma chave ou valor, tenta limpar o final
            // Encontrar o último objeto que parece completo (termina com })
            const lastObjectEnd = partialJson.lastIndexOf('}');
            if (lastObjectEnd !== -1) {
              // Cortar até o último objeto completo
              let cleanedPartial = partialJson.substring(0, lastObjectEnd + 1);
              
              // Garantir que todos os objetos anteriores estão fechados ou remover o último se estiver quebrado
              // Se o último } não for precedido por um objeto válido, pode ser arriscado, 
              // mas geralmente o Gemini trunca no meio de um campo.
              
              const recoveredJson = '[' + cleanedPartial + ']';
              const recovered = JSON.parse(recoveredJson);
              console.log(`Recuperados ${recovered.length} produtos de JSON truncado.`);
              return recovered;
            }
          } catch (e) {
            console.error("Falha ao recuperar JSON truncado:", e);
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

export async function generateSalesScript(product: any): Promise<string> {
  const prompt = `Você é um especialista em vendas B2B de cosméticos.
  Crie um roteiro de vendas (script) persuasivo e curto para o WhatsApp para o seguinte produto:
  
  PRODUTO: ${product.nome}
  SKU: ${product.sku}
  PREÇO: R$ ${product.preco_unitario?.toFixed(2)}
  ${product.has_box_discount ? `DESCONTO NO BOX: R$ ${product.preco_box?.toFixed(2)} (a partir de ${product.qtd_box} un)` : ''}
  ${product.venda_somente_box ? `VENDA SOMENTE NO BOX: R$ ${product.preco_box?.toFixed(2)}` : ''}
  
  O roteiro deve:
  1. Ter um gancho inicial atraente.
  2. Destacar 2-3 benefícios principais.
  3. Ter uma chamada para ação (CTA) clara.
  4. Usar emojis de forma profissional.
  5. Ser formatado para WhatsApp (negritos, quebras de linha).
  
  Responda APENAS com o texto do roteiro.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim() || "Não foi possível gerar o roteiro.";
  } catch (error) {
    console.error("Erro ao gerar roteiro de vendas:", error);
    return "Erro ao gerar roteiro. Tente novamente.";
  }
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
