import { supabase } from "../integrations/supabaseClient";

export async function registerCompany(companyData: any) {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  // 1. Insert into companies table first to get the ID
  const { data: company, error: companyError } = await supabase
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

  if (companyError) {
    console.error("Erro ao cadastrar empresa:", companyError);
    return { success: false, message: companyError.message };
  }

  // 2. Create user in Supabase Auth with metadata for the profile trigger
  if (companyData.email && companyData.senha) {
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: companyData.email,
        password: companyData.senha,
        options: {
          data: {
            role: 'company',
            company_id: company.id,
            nome: companyData.nome
          }
        }
      });
      if (authError) {
        console.warn("Aviso: Falha ao criar usuário no Auth:", authError.message);
      }
    } catch (err) {
      console.error("Erro ao tentar registrar no Auth:", err);
    }
  }

  return { success: true, company };
}

export async function loginCompany(identifier: string, senha?: string) {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  // 1. Find the company in the database
  const { data: company, error } = await supabase
    .from("companies")
    .select("*")
    .or(`cnpj.eq.${identifier},email.eq.${identifier}`)
    .eq("senha", senha)
    .maybeSingle();

  if (error || !company) {
    console.error("Erro ao fazer login:", error);
    return { success: false, message: "Identificador ou senha incorretos" };
  }

  // 2. Supabase Auth Integration for RLS
  if (company.email && company.senha) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: company.email,
      password: company.senha,
    });

    if (signInError) {
      // If sign in fails, try to sign up (first time login)
      await supabase.auth.signUp({
        email: company.email,
        password: company.senha,
        options: {
          data: {
            role: 'company',
            company_id: company.id,
            nome: company.nome
          }
        }
      });
    }
  }

  return { success: true, company };
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
