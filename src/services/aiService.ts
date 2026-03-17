import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function classifyCategory(productName: string, categories: { id: number, nome: string }[]) {
  if (categories.length === 0) return null;

  const prompt = `Classifique o produto "${productName}" em uma das seguintes categorias: ${categories.map(c => c.nome).join(', ')}. 
  Retorne apenas o nome da categoria ou "pendente" se não tiver certeza.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

  const prompt = `Analise este catálogo e extraia todos os produtos visíveis. 
  Para cada produto, identifique: nome, SKU/Cód (se houver), preço unitário, preço da caixa (box), quantidade na caixa (qtd_box), variações e quantidade de variações.
  
  REGRAS IMPORTANTES DE EXTRAÇÃO:
  1. NOME COMPLETO: Extraia o nome completo do produto exatamente como está no PDF, sem abreviar e sem omitir nenhuma parte.
  2. PREÇOS: Preste muita atenção aos preços. Extraia o preço unitário e o preço box APENAS COMO NÚMEROS E VÍRGULAS (ex: "10,50"). NÃO INCLUA "R$" ou textos como "Avulso". Se o preço estiver faltando, retorne "0". Se houver "Avulso: x,xx", esse é o preço unitário e o item DEVE ter has_box_discount = true. Se houver "A partir de X un", esse é o preço de atacado/box (preco_box) e X é a quantidade (qtd_box).
  3. VARIAÇÕES: Se o produto tiver variações (ex: cores, tamanhos, modelos), extraia a lista de variações (variacoes) e a quantidade de variações (qtd_variacoes).
  4. STATUS DE ESTOQUE (status_estoque): 
     - Se houver uma tarja ou texto "Esgotado", defina status_estoque como "esgotado".
     - Se houver "Últimas Unidades", defina status_estoque como "ultimas".
     - Se houver "Estoque Baixo", defina status_estoque como "baixo".
     - Caso contrário, defina como "normal".
  5. DESCONTO NO BOX (has_box_discount): true se houver a expressão "A partir de X un", "Avulso", ou se o preço unitário for menor ao comprar a caixa fechada.
  6. SOMENTE BOX (venda_somente_box): true se houver expressões como "somente no box", "venda fechada", "apenas caixa".
  7. ÚLTIMAS UNIDADES (is_last_units): true se o status_estoque for "ultimas" ou "baixo".
  
  Retorne os dados em formato JSON seguindo este esquema:
  {
    "products": [
      {
        "sku": string,
        "nome": string,
        "descricao": string,
        "preco_unitario": string,
        "preco_box": string,
        "qtd_box": string,
        "venda_somente_box": boolean,
        "has_box_discount": boolean,
        "is_last_units": boolean,
        "status_estoque": string,
        "variacoes": string,
        "qtd_variacoes": string
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
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sku: { type: Type.STRING },
                  nome: { type: Type.STRING },
                  descricao: { type: Type.STRING },
                  preco_unitario: { type: Type.STRING },
                  preco_box: { type: Type.STRING },
                  qtd_box: { type: Type.STRING },
                  venda_somente_box: { type: Type.BOOLEAN },
                  has_box_discount: { type: Type.BOOLEAN },
                  is_last_units: { type: Type.BOOLEAN },
                  status_estoque: { type: Type.STRING },
                  variacoes: { type: Type.STRING },
                  qtd_variacoes: { type: Type.STRING }
                },
                required: ["nome"]
              }
            }
          },
          required: ["products"]
        }
      }
    });

    let jsonText = response.text || "{}";
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(jsonText);
    return parsed.products || [];
  } catch (error: any) {
    console.error("Erro ao extrair produtos da mídia:", error);
    throw new Error(error.message || "Erro desconhecido ao processar o arquivo com a IA.");
  }
}
