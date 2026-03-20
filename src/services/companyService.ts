import { supabase } from "../integrations/supabaseClient";

export async function registerCompany(companyData: any) {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  const { data, error } = await supabase
    .from("companies")
    .insert([{ 
      nome: companyData.nome,
      cnpj: companyData.cnpj,
      responsavel: companyData.responsavel,
      telefone: companyData.telefone,
      email: companyData.email,
      senha: companyData.senha
    }])
    .select()
    .single();

  if (error) {
    // Se falhar por causa da coluna email, tenta sem ela
    const isMissingColumn = error.message.includes('column') || 
                            error.message.includes('does not exist') || 
                            error.message.includes('schema cache');
                            
    if (isMissingColumn) {
      const { data: retryData, error: retryError } = await supabase
        .from("companies")
        .insert([{ 
          nome: companyData.nome,
          cnpj: companyData.cnpj,
          responsavel: companyData.responsavel,
          telefone: companyData.telefone,
          senha: companyData.senha
        }])
        .select()
        .single();
        
      if (retryError) {
        console.error("Erro ao cadastrar empresa (retry):", retryError);
        return { success: false, message: retryError.message };
      }
      return { success: true, company: retryData };
    }
    
    console.error("Erro ao cadastrar empresa:", error);
    return { success: false, message: error.message };
  }

  return { success: true, company: data };
}

export async function loginCompany(cnpj: string, senha?: string) {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  // Se for admin, faz login pelo nome
  if (cnpj.toUpperCase() === 'ADMIN') {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .ilike("nome", cnpj)
      .maybeSingle();
    
    if (error) {
      return { success: false, message: "Empresa não encontrada" };
    }
    if (!data) {
      return { success: false, message: "Empresa não encontrada" };
    }
    return { success: true, company: data };
  }

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("cnpj", cnpj)
    .eq("senha", senha)
    .maybeSingle();

  if (error) {
    console.error("Erro ao fazer login:", error);
    return { success: false, message: "CNPJ ou senha incorretos" };
  }

  if (!data) {
    return { success: false, message: "CNPJ ou senha incorretos" };
  }

  return { success: true, company: data };
}

export async function getCompanyById(id: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error("Erro ao buscar empresa:", error);
    return null;
  }
  return data;
}
