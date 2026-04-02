import { supabase } from "../integrations/supabaseClient";

/**
 * Gera um código de vínculo aleatório (ex: VEND-8291)
 */
export function generateLinkCode(prefix: string = 'VEND'): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
}

/**
 * Gera uma senha curta aleatória (ex: 4567)
 */
export function generateSellerPassword(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function validateSellerCode(code: string, senha?: string, type: 'seller' | 'customer' = 'seller') {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  let query = supabase
    .from("sellers")
    .select("*, companies!company_id(*)");

  if (type === 'customer') {
    // Para clientes, aceitamos tanto o código de vínculo quanto o código de cliente
    query = query.or(`codigo_vinculo.eq.${code.trim().toUpperCase()},codigo_cliente.eq.${code.trim().toUpperCase()}`);
  } else {
    query = query.eq("codigo_vinculo", code.trim().toUpperCase());
  }

  if (type === 'seller' && senha) {
    query = query.eq("senha", senha.trim());
  }

  const { data: sellers, error } = await query;

  if (error) {
    console.error("Erro ao validar vendedor:", error);
    return { success: false };
  }

  if (!sellers || sellers.length === 0) {
    return { success: false, message: "Código ou senha incorretos" };
  }

  const seller = sellers[0];

  // Supabase Auth Integration for RLS (only for seller login)
  if (type === 'seller' && senha) {
    const email = `${seller.codigo_vinculo.toLowerCase()}@vendpro.com`;
    const authPassword = seller.senha;

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
            role: 'seller',
            company_id: seller.company_id,
            seller_id: seller.id
          }
        }
      });
    }
  }

  return {
    success: true,
    sellers,
    companies: sellers.map(s => s.companies).filter(Boolean)
  };
}

export async function createSeller(sellerData: any) {
  if (!supabase) return { success: false };

  // Se não tiver código ou senha, gera automaticamente
  const codigo_vinculo = sellerData.codigo_vinculo || generateLinkCode();
  const senha = sellerData.senha || generateSellerPassword();

  const { data, error } = await supabase
    .from("sellers")
    .insert([{
      ...sellerData,
      codigo_vinculo,
      senha
    }])
    .select('id, company_id, nome, whatsapp, codigo_vinculo, senha, codigo_cliente, ativo, marcas_bloqueadas, skus_bloqueados, comissao, comissao_por_marca')
    .single();

  if (error) {
    console.error("Erro ao criar vendedor:", error);
    
    // Tratamento específico para erro de UUID
    if (error.message.includes('invalid input syntax for type uuid')) {
      return { 
        success: false, 
        message: "Erro de sistema: Um dos identificadores (ID) está em formato inválido. Por favor, recarregue a página e tente novamente." 
      };
    }
    
    return { success: false, message: error.message };
  }

  return { success: true, seller: data };
}
