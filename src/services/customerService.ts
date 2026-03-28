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

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Código de acesso inválido' };

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

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: authPassword,
  });

  if (signInError) {
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

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'CNPJ não cadastrado' };

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

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: authPassword,
  });

  if (signInError) {
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
    seller: sellerRes.data,
    company: companyRes.data
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
    senha: customerData.senha || generateCustomerPassword()
  };

  const { data, error } = await supabase
    .from("customers")
    .insert([dataToSave])
    .select('*')
    .single();

  if (error) {
    console.error("Erro detalhado do Supabase ao criar cliente:", error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}
