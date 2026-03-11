export interface Brand {
  id: string;
  company_id: string;
  name: string;
  logo_url?: string;
  margin_percentage: number;
  minimum_order_value: number;
  shipping_policy?: string;
  payment_policy?: string;
  stock_policy?: string;
  payment_methods?: string[];
}

export interface Company {
  id: string;
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
  id: string;
  company_id: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  codigo_vinculo: string;
  ativo: boolean;
}

export interface SellerBrand {
  seller_id: string;
  brand_id: string;
}

export interface Customer {
  id: string;
  seller_id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  responsavel?: string;
  ativo: boolean;
  seller_nome?: string;
}

export interface Category {
  id: string;
  company_id: string;
  brand_id: string;
  nome: string;
  palavras_chave?: string;
  ativo: boolean;
}

export interface Product {
  id: string;
  company_id: string;
  categoria_id?: string;
  brand_id?: string;
  sku: string;
  nome: string;
  descricao?: string;
  marca?: string;
  preco_unitario: number;
  preco_box: number;
  qtd_box: number;
  venda_somente_box: boolean;
  has_box_discount: boolean;
  is_last_units: boolean;
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
  categoria_nome?: string;
  brand_nome?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  company_id: string;
  customer_id: string;
  seller_id: string;
  brand_id: string;
  total: number;
  status: 'pending' | 'attended' | 'finished' | 'cancelled';
  whatsapp_sent: boolean;
  created_at: string;
  items: OrderItem[];
  customer_nome?: string;
  brand_nome?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  sku: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
}

export type UserRole = 'company' | 'seller' | 'customer' | null;

export interface AuthState {
  role: UserRole;
  user: any;
  sellerCode?: string;
}
