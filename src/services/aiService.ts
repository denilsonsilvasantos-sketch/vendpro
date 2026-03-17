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
  
  Retorne os dados em formato JSON seguindo este esquema:
  {
    "products": [
      {
        "sku": "string (opcional)",
        "nome": "string (obrigatório)",
        "descricao": "string (opcional)",
        "preco_unitario": "string (ex: 10,50)",
        "preco_box": "string (ex: 100,00)",
        "qtd_box": "string (ex: 10)",
        "venda_somente_box": boolean,
        "has_box_discount": boolean,
        "is_last_units": boolean,
        "status_estoque": "normal | baixo | ultimas | esgotado",
        "variacoes": "string (opcional)",
        "qtd_variacoes": "string (opcional)"
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
        responseMimeType: "application/json"
      }
    });

    let jsonText = response.text || "{}";
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
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
  } catch (error: any) {
    console.error("Erro ao extrair produtos da mídia:", error);
    throw new Error(error.message || "Erro desconhecido ao processar o arquivo com a IA.");
  }
}
