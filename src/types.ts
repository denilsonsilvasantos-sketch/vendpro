export interface Brand {
  id: number;
  company_id: number;
  nome: string;
  margin_percentage: number;
  minimum_order_value: number;
  shipping_policy?: string;
  free_shipping_threshold?: number;
  payment_methods?: string[];
}

export interface Company {
  id: number;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  minimum_order_value: number;
  payment_policy?: string;
  shipping_policy?: string;
}

export interface Seller {
  id: number;
  company_id: number;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  codigo_vinculo: string;
  ativo: boolean;
}

export interface Customer {
  id: number;
  seller_id: number;
  empresa: string;
  cnpj?: string;
  telefone?: string;
  responsavel?: string;
  ativo: boolean;
}

export interface Category {
  id: number;
  company_id: number;
  brand_id: number;
  nome: string;
  palavras_chave?: string;
  ativo: boolean;
}

export interface Product {
  id: number;
  company_id: number;
  categoria_id?: number;
  brand_id?: number;
  sku: string;
  nome: string;
  descricao?: string;
  marca?: string;
  preco_unitario: number;
  preco_box: number;
  qtd_box: number;
  venda_somente_box: boolean;
  multiplo_venda?: number;
  status_estoque: 'normal' | 'baixo' | 'ultimas' | 'esgotado';
  sugestao_revenda_max?: number;
  imagem?: string;
  categoria_pendente: boolean;
  imagem_pendente: boolean;
  pending_status?: 'none' | 'not_found_full' | 'price_changed' | 'box_changed';
  last_seen_date?: string;
  last_seen_catalog_type?: 'full' | 'partial';
  last_price?: number;
  last_box_qty?: number;
  ativo: boolean;
  categoria_nome?: string;
  brand_nome?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export type UserRole = 'company' | 'seller' | 'customer' | null;

export interface AuthState {
  role: UserRole;
  user: any;
  sellerCode?: string;
}
