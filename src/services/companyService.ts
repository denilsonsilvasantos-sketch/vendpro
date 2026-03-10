import { supabase } from "../integrations/supabaseClient";

export async function registerCompany(companyData: any) {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  const { data, error } = await supabase
    .from("companies")
    .insert([companyData])
    .select()
    .single();

  if (error) {
    console.error("Erro ao cadastrar empresa:", error);
    return { success: false, message: error.message };
  }

  return { success: true, company: data };
}

export async function loginCompany(cnpj: string) {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("cnpj", cnpj)
    .single();

  if (error) {
    console.error("Erro ao fazer login:", error);
    return { success: false, message: "Empresa não encontrada" };
  }

  return { success: true, company: data };
}
