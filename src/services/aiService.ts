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
  Para cada produto, identifique: nome, SKU/Cód (se houver), preço unitário, preço da caixa (box), quantidade na caixa (qtd_box).
  
  REGRAS IMPORTANTES DE EXTRAÇÃO:
  1. PREÇOS: Preste muita atenção aos preços. Se houver "Avulso", esse é o preço unitário. Se houver "A partir de X un", esse é o preço de atacado/box (preco_box) e X é a quantidade (qtd_box).
  2. STATUS DE ESTOQUE (status_estoque): 
     - Se houver uma tarja ou texto "Esgotado", defina status_estoque como "esgotado".
     - Se houver "Últimas Unidades", defina status_estoque como "ultimas".
     - Se houver "Estoque Baixo", defina status_estoque como "baixo".
     - Caso contrário, defina como "normal".
  3. DESCONTO NO BOX (has_box_discount): true se houver a expressão "A partir de X un" ou se o preço unitário for menor ao comprar a caixa fechada.
  4. SOMENTE BOX (venda_somente_box): true se houver expressões como "somente no box", "venda fechada", "apenas caixa".
  5. ÚLTIMAS UNIDADES (is_last_units): true se o status_estoque for "ultimas" ou "baixo".
  
  Retorne os dados em formato JSON seguindo este esquema:
  Array<{
    sku: string,
    nome: string,
    descricao: string,
    preco_unitario: number,
    preco_box: number,
    qtd_box: number,
    venda_somente_box: boolean,
    has_box_discount: boolean,
    is_last_units: boolean,
    status_estoque: string
  }>`;

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
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sku: { type: Type.STRING },
              nome: { type: Type.STRING },
              descricao: { type: Type.STRING },
              preco_unitario: { type: Type.NUMBER },
              preco_box: { type: Type.NUMBER },
              qtd_box: { type: Type.INTEGER },
              venda_somente_box: { type: Type.BOOLEAN },
              has_box_discount: { type: Type.BOOLEAN },
              is_last_units: { type: Type.BOOLEAN },
              status_estoque: { type: Type.STRING }
            },
            required: ["nome"]
          }
        }
      }
    });

    let jsonText = response.text || "[]";
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error("Erro ao extrair produtos da mídia:", error);
    throw new Error(error.message || "Erro desconhecido ao processar o arquivo com a IA.");
  }
}
