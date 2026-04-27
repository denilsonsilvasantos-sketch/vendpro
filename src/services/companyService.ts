import { supabase } from "../integrations/supabaseClient";

export async function registerCompany(companyData: any) {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  const cleanCnpj = companyData.cnpj.replace(/\D/g, '');
  const authEmail = companyData.email || `${cleanCnpj}@vendpro.com`;

  // 1. Insert into companies table first to get the ID
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert([{ 
      nome: companyData.nome,
      cnpj: cleanCnpj,
      responsavel: companyData.responsavel,
      telefone: companyData.telefone,
      email: authEmail,
      senha: companyData.senha
    }])
    .select()
    .single();

  if (companyError) {
    console.error("Erro ao cadastrar empresa:", companyError);
    return { success: false, message: companyError.message };
  }

  // 2. Create user in Supabase Auth with metadata for the profile trigger
  if (authEmail && companyData.senha) {
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: authEmail,
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

  const cleanIdentifier = identifier.replace(/\D/g, '');

  // 1. Find the company in the database
  console.log("Tentando login com CNPJ:", cleanIdentifier);
  const { data: company, error } = await supabase
    .from("companies")
    .select("*")
    .eq("cnpj", cleanIdentifier)
    .eq("senha", senha)
    .maybeSingle();

  if (error || !company) {
    console.error("Erro ao buscar empresa no banco:", error || "Empresa não encontrada");
    return { success: false, message: "Identificador ou senha incorretos" };
  }

  // 2. Supabase Auth Integration for RLS
  const authEmail = company.email || `${company.cnpj}@vendpro.com`;
  if (authEmail && company.senha) {
    console.log("Tentando login no Auth com email:", authEmail);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: company.senha,
    });

    if (signInError) {
      console.warn("Sign in failed, checking if user needs to be created:", signInError.message);
      
      // If the error is 'Email not confirmed', we can ignore it for now as RLS is disabled
      if (signInError.message.includes('Email not confirmed')) {
        console.warn("Login Auth: Email not confirmed, but proceeding as RLS is disabled.");
        return { success: true, company };
      }
      
      // If it's a dynamic user (dummy email), we can try to create it on the fly
      if (authEmail.endsWith('@vendpro.com')) {
        try {
          const { error: signUpError } = await supabase.auth.signUp({
            email: authEmail,
            password: company.senha,
            options: {
              data: {
                role: 'company',
                company_id: company.id,
                nome: company.nome
              }
            }
          });
          if (signUpError && !signUpError.message.includes('already registered')) {
            console.error("Erro ao tentar registrar no Auth durante login:", signUpError.message);
          }
        } catch (err) {
          console.error("Exceção ao tentar registrar no Auth durante login:", err);
        }
      } else {
        // Real email, login should work or they need to reset password
        console.error("Erro de autenticação para conta com email real:", signInError.message);
        return { success: false, message: "Erro de autenticação: " + signInError.message };
      }
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
