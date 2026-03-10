import { supabase } from "../integrations/supabaseClient";

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

export async function createCustomer(companyId: string, customerData: any) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("customers")
    .insert([{ ...customerData, company_id: companyId }])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar cliente:", error);
    return null;
  }
  return data;
}
