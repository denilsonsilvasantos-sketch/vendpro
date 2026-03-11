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
  Para cada produto, identifique: nome, SKU (se houver), preço unitário, preço da caixa (box), quantidade na caixa (qtd_box).
  Identifique também as seguintes condições:
  - "venda_somente_box": true se houver expressões como "somente no box", "venda fechada", "apenas caixa".
  - "is_last_units": true se houver expressões como "últimas unidades", "queima de estoque", "fim de linha".
  - "has_box_discount": true se o preço unitário for menor ao comprar a caixa fechada.
  
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
    is_last_units: boolean
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
              is_last_units: { type: Type.BOOLEAN }
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
