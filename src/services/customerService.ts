import { supabase } from "../integrations/supabaseClient";

// Helper to generate a random code for customer access
export function generateCustomerAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CLI-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper to generate a short random password
export function generateCustomerPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pwd = '';
  for (let i = 0; i < 4; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export async function validateCustomerCode(code: string, password?: string) {
  if (!supabase) return { success: false, error: 'Supabase não inicializado' };

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('codigo_acesso', code.toUpperCase())
    .maybeSingle();

  if (error) {
    console.error("Erro Supabase ao buscar cliente por código:", error);
    return { success: false, error: error.message };
  }
  if (!data) {
    console.warn("Cliente não encontrado com código:", code);
    return { success: false, error: 'Código de acesso inválido' };
  }

  if (password && data.senha !== password) {
    return { success: false, error: 'Senha incorreta' };
  }

  // Fetch seller and company separately to avoid FK ambiguity
  const [sellerRes, companyRes] = await Promise.all([
    data.seller_id ? supabase.from('sellers').select('*').eq('id', data.seller_id).maybeSingle() : Promise.resolve({ data: null }),
    data.company_id ? supabase.from('companies').select('*').eq('id', data.company_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  // Supabase Auth Integration for RLS
  const email = `${data.codigo_acesso.toLowerCase()}@vendpro.com`;
  const authPassword = data.senha;

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: authPassword,
    });

    if (signInError) {
      if (signInError.message.includes('Email not confirmed')) {
        console.warn("Login Auth (validateCode): Email not confirmed, but proceeding as RLS is disabled.");
        return { 
          success: true, 
          customer: data,
          seller: sellerRes.data,
          company: companyRes.data
        };
      }
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: authPassword,
        options: {
          data: {
            role: 'customer',
            company_id: data.company_id,
            seller_id: data.seller_id,
            customer_id: data.id
          }
        }
      });
      
      if (signUpError) {
        console.error("Erro ao criar credenciais de segurança:", signUpError);
        // If it's a rate limit, we still allow login to the app state but warn
        if (signUpError.status === 429) {
          console.warn("Limite de tentativas atingido no Supabase Auth. O acesso pode ser limitado.");
        }
      }
    }
  } catch (authErr) {
    console.error("Erro no processo de autenticação:", authErr);
  }

  return { 
    success: true, 
    customer: data,
    seller: sellerRes.data,
    company: companyRes.data
  };
}

export async function getCustomers(companyId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId);

  if (error) {
    console.error("Erro ao buscar clientes:", error);
    return [];
  }
  return data;
}

export async function getCustomerByCnpj(cnpj: string, sellerId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("cnpj", cnpj)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar cliente por CNPJ:", error);
    return null;
  }
  return data;
}

export async function validateCustomerLogin(cnpj: string, password?: string) {
  if (!supabase) return { success: false, error: 'Supabase não inicializado' };

  const cleanCnpj = cnpj.replace(/\D/g, '');

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('cnpj', cleanCnpj)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro Supabase ao buscar cliente por CNPJ no login:", error);
    return { success: false, error: error.message };
  }
  if (!data) {
    console.warn("Cliente não encontrado com CNPJ no login:", cleanCnpj);
    return { success: false, error: 'CNPJ não cadastrado' };
  }

  if (password && data.senha !== password) {
    return { success: false, error: 'Senha incorreta' };
  }

  // Fetch seller and company separately to avoid FK ambiguity
  const [sellerRes, companyRes] = await Promise.all([
    data.seller_id ? supabase.from('sellers').select('*').eq('id', data.seller_id).maybeSingle() : Promise.resolve({ data: null }),
    data.company_id ? supabase.from('companies').select('*').eq('id', data.company_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  // Supabase Auth Integration for RLS
  const email = `${(data.codigo_acesso || data.id).toLowerCase()}@vendpro.com`;
  const authPassword = data.senha || 'vendpro123';

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: authPassword,
    });

    if (signInError) {
      if (signInError.message.includes('Email not confirmed')) {
        console.warn("Login Auth (validateLogin): Email not confirmed, but proceeding as RLS is disabled.");
        return { 
          success: true, 
          customer: data,
          seller: sellerRes.data,
          company: companyRes.data
        };
      }
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: authPassword,
        options: {
          data: {
            role: 'customer',
            company_id: data.company_id,
            seller_id: data.seller_id,
            customer_id: data.id
          }
        }
      });

      if (signUpError) {
        console.error("Erro ao criar credenciais de segurança no login:", signUpError);
        if (signUpError.status === 429) {
          console.warn("Limite de tentativas atingido no Supabase Auth. O acesso pode ser limitado.");
        }
      }
    }
  } catch (authErr) {
    console.error("Erro no processo de autenticação no login:", authErr);
  }

  return { 
    success: true, 
    customer: data,
    seller: sellerRes.data,
    company: companyRes.data
  };
}

export async function createCustomer(companyId: string, customerData: any) {
  if (!supabase) return { data: null, error: 'Supabase não inicializado' };
  
  // Clean CNPJ
  const cleanCnpj = customerData.cnpj ? customerData.cnpj.replace(/\D/g, '') : '';

  // Auto-generate access code if not provided
  let codigo_acesso = customerData.codigo_acesso;
  let senha = customerData.senha || generateCustomerPassword();
  let data = null;
  let error = null;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    const currentCode = codigo_acesso || generateCustomerAccessCode();
    
    // Explicitly pick fields to avoid passing extra fields like 'confirmarSenha'
    const dataToSave = {
      nome: customerData.nome,
      nome_empresa: customerData.nome_empresa,
      cnpj: cleanCnpj,
      whatsapp: customerData.whatsapp,
      senha: senha,
      seller_id: customerData.seller_id,
      company_id: companyId,
      codigo_acesso: currentCode,
      ativo: true,
      vendedor_marcas_bloqueadas: customerData.vendedor_marcas_bloqueadas || [],
      vendedor_skus_bloqueados: customerData.vendedor_skus_bloqueados || [],
      responsavel: customerData.nome || '', // Preenche responsavel com o mesmo valor de nome
    };

    console.log(`Tentativa ${attempts} de criar cliente no banco com código:`, currentCode);

    const { data: insertData, error: insertError } = await supabase
      .from("customers")
      .insert([dataToSave])
      .select('*')
      .single();

    if (!insertError) {
      data = insertData;
      codigo_acesso = currentCode;
      break;
    }

    // Se o erro for de unicidade no código de acesso, tentamos novamente com outro código
    if (insertError.code === '23505' && (insertError.message.includes('codigo_acesso') || insertError.details?.includes('codigo_acesso'))) {
      console.warn(`Colisão de código de acesso (${currentCode}), tentando novamente...`);
      codigo_acesso = null; // Força gerar um novo
      error = insertError;
      continue;
    }

    // Outros erros, paramos por aqui
    console.error("Erro fatal ao criar cliente no banco de dados:", insertError);
    return { data: null, error: insertError.message || "Erro ao inserir no banco de dados" };
  }

  if (!data) {
    return { data: null, error: error?.message || "Não foi possível gerar um código de acesso único após várias tentativas." };
  }

  // Create Supabase Auth account immediately for RLS support
  if (data) {
    const email = `${data.codigo_acesso.toLowerCase()}@vendpro.com`;
    const authPassword = data.senha;

    try {
      console.log("Criando credenciais Auth para cliente:", email);
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: authPassword,
        options: {
          data: {
            role: 'customer',
            company_id: data.company_id,
            seller_id: data.seller_id,
            customer_id: data.id
          }
        }
      });

      if (signUpError) {
        console.error("Erro ao criar credenciais de segurança no cadastro:", signUpError);
        // If rate limit (429), we don't fail the whole registration but warn
        if (signUpError.status === 429) {
          return { 
            data, 
            error: null, 
            warning: "Cadastro realizado, mas as credenciais de segurança demorarão alguns minutos para ativar devido ao limite de tentativas. Tente fazer login em instantes." 
          };
        }
        
        // For other Auth errors, we still return the data but with a warning
        return {
          data,
          error: null,
          warning: `Cadastro realizado, mas houve um erro ao configurar o acesso: ${signUpError.message}. Tente fazer login mais tarde.`
        };
      }
    } catch (authErr: any) {
      console.error("Erro inesperado no Auth durante cadastro:", authErr);
      return {
        data,
        error: null,
        warning: "Cadastro realizado, mas houve um erro técnico ao configurar o acesso. Por favor, tente fazer login em instantes."
      };
    }
  }

  return { data, error: null };
}
