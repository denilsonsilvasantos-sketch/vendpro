import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function classifyCategory(productName: string, categories: { id: number, nome: string }[]) {
  if (categories.length === 0) return null;

  const prompt = `Classifique o produto "${productName}" em uma das seguintes categorias: ${categories.map(c => c.nome).join(', ')}. 
  Retorne apenas o nome da categoria ou "pendente" se não tiver certeza.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });

    const categoryName = response.text?.trim();
    const category = categories.find(c => c.nome === categoryName);
    
    return category ? category.id : null;
  } catch (error) {
    console.error("Erro na classificação de categoria:", error);
    return null;
  }
}

export async function extractProductsFromMedia(base64Data: string, mimeType: string) {
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
        "qtd_variacoes": "string"
      }
    ]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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
    console.error("Erro ao extrair produtos da mídia:", error);
    throw new Error(error.message || "Erro desconhecido ao processar o arquivo com a IA.");
  }
}
