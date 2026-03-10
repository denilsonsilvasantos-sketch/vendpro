import { supabase } from "../integrations/supabaseClient";

export async function registerCompany(companyData: any) {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  const { data, error } = await supabase
    .from("companies")
    .insert([{ nome: companyData.nome }])
    .select()
    .single();

  if (error) {
    console.error("Erro ao cadastrar empresa:", error);
    return { success: false, message: error.message };
  }

  return { success: true, company: data };
}

export async function loginCompany(nome: string) {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .ilike("nome", nome)
    .single();

  if (error) {
    console.error("Erro ao fazer login:", error);
    return { success: false, message: "Empresa não encontrada" };
  }

  return { success: true, company: data };
}

export async function getCompanyById(id: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
  if (error) {
    console.error("Erro ao buscar empresa:", error);
    return null;
  }
  return data;
}
