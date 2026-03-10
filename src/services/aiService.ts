import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function classifyCategory(productName: string, categories: { id: number, nome: string }[]) {
  if (!process.env.GEMINI_API_KEY || categories.length === 0) return null;

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
  if (!process.env.GEMINI_API_KEY) return [];

  const prompt = `Analise este catálogo e extraia todos os produtos visíveis. 
  Para cada produto, identifique: nome, SKU (se houver), preço unitário, preço da caixa (box), quantidade na caixa (qtd_box) e se é venda somente por caixa.
  Retorne os dados em formato JSON seguindo este esquema:
  Array<{
    sku: string,
    nome: string,
    descricao: string,
    preco_unitario: number,
    preco_box: number,
    qtd_box: number,
    venda_somente_box: boolean
  }>`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        { text: prompt }
      ],
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
              venda_somente_box: { type: Type.BOOLEAN }
            },
            required: ["nome", "preco_unitario"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Erro ao extrair produtos da mídia:", error);
    return [];
  }
}
