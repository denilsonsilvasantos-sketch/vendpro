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
export function generateShortPassword() {
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
    .select('*, sellers!seller_id(*), companies!company_id(*)')
    .eq('codigo_acesso', code.toUpperCase())
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Código de acesso inválido' };

  // If password is provided, validate it
  if (password && data.senha !== password) {
    return { success: false, error: 'Senha incorreta' };
  }

  // Supabase Auth Integration for RLS
  const email = `${data.codigo_acesso.toLowerCase()}@vendpro.com`;
  const authPassword = data.senha;

  // Try to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: authPassword,
  });

  if (signInError) {
    // If sign in fails, try to sign up (first time login)
    await supabase.auth.signUp({
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
  }

  return { 
    success: true, 
    customer: data,
    seller: data.sellers,
    company: data.companies
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
    .select('*, sellers!seller_id(*), companies!company_id(*)')
    .eq('cnpj', cleanCnpj)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'CNPJ não cadastrado' };

  // If password is provided, validate it
  if (password && data.senha !== password) {
    return { success: false, error: 'Senha incorreta' };
  }

  // Supabase Auth Integration for RLS
  const email = `${(data.codigo_acesso || data.id).toLowerCase()}@vendpro.com`;
  const authPassword = data.senha || 'vendpro123';

  // Try to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: authPassword,
  });

  if (signInError) {
    // If sign in fails, try to sign up (first time login)
    await supabase.auth.signUp({
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
  }

  return { 
    success: true, 
    customer: data,
    seller: data.sellers,
    company: data.companies
  };
}

export async function createCustomer(companyId: string, customerData: any) {
  if (!supabase) return null;
  
  // Clean CNPJ
  const cleanCnpj = customerData.cnpj ? customerData.cnpj.replace(/\D/g, '') : '';

  // Auto-generate access code if not provided
  const dataToSave = {
    ...customerData,
    cnpj: cleanCnpj,
    company_id: companyId,
    codigo_acesso: customerData.codigo_acesso || generateCustomerAccessCode(),
    senha: customerData.senha || generateShortPassword()
  };

  const { data, error } = await supabase
    .from("customers")
    .insert([dataToSave])
    .select()
    .single();

  if (error) {
    console.error("Erro detalhado do Supabase ao criar cliente:", error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}
