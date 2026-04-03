import { supabase } from "../integrations/supabaseClient";

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase não inicializado");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error("Supabase não inicializado");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithCompany(email: string, password: string, companyName: string) {
  if (!supabase) throw new Error("Supabase não inicializado");

  // 1. Sign up user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error("Erro ao criar usuário");

  // 2. Create Company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert([{ nome: companyName }])
    .select('id, nome')
    .single();
  if (companyError) throw companyError;

  // 3. Create Profile
  const { error: profileError } = await supabase
    .from("profiles")
    .insert([{ 
      user_id: authData.user.id, 
      company_id: company.id, 
      role: 'admin' 
    }]);
  if (profileError) throw profileError;

  return { user: authData.user, company };
}

export async function signOut() {
  if (!supabase) throw new Error("Supabase não inicializado");
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
    
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (err) {
    console.warn('Erro ao obter usuário atual:', err);
    return null;
  }
}
