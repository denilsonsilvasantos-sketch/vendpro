import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function classifyCategory(productName: string, categories: { id: number, nome: string }[]) {
  if (!process.env.GEMINI_API_KEY) return null;

  const prompt = `Classifique o produto "${productName}" em uma das seguintes categorias: ${categories.map(c => c.nome).join(', ')}. 
  Retorne apenas o nome da categoria ou "pendente" se não tiver certeza.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  const categoryName = response.text?.trim();
  const category = categories.find(c => c.nome === categoryName);
  
  return category ? category.id : null;
}
