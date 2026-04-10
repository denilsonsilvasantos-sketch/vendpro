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
  order_index?: number;
}

export interface Company {
  id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  primary_color?: string;
  minimum_order_value: number;
  payment_policy?: string;
  shipping_policy?: string;
}

export interface Seller {
  id: string;
  company_id: string;
  nome: string;
  whatsapp?: string;
  codigo_vinculo: string;
  senha?: string;
  codigo_cliente?: string;
  ativo: boolean;
  marcas_bloqueadas?: string[];
  skus_bloqueados?: string[];
  comissao?: number;
  comissao_por_marca?: Record<string, number>;
}

export interface Customer {
  id: string;
  seller_id?: string;
  company_id?: string;
  nome: string;
  nome_empresa?: string;
  cnpj?: string;
  whatsapp?: string;
  cidade?: string;
  codigo_acesso?: string;
  senha?: string;
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
  order_index?: number;
}

export interface Product {
  id: string;
  company_id: string;
  category_id?: string;
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
  imagens?: string[];
  categoria_pendente: boolean;
  imagem_pendente: boolean;
  nome_pendente?: boolean;
  novo_nome?: string;
  variacoes?: string;
  qtd_variacoes?: number;
  estoque?: number;
  pending_status?: 'none' | 'not_found_full' | 'price_changed' | 'box_changed';
  last_seen_date?: string;
  last_seen_catalog_type?: 'full' | 'partial';
  last_price?: number;
  last_box_qty?: number;
  categoria_nome?: string;
  brand_nome?: string;
  margin_percentage?: number;
  created_at?: string;
  is_new?: boolean;
  is_back_in_stock?: boolean;
  new_until?: string;
  back_in_stock_until?: string;
  is_promo?: boolean;
  promo_price_unit?: number;
  promo_price_box?: number;
  promo_box_qty?: number;
  promo_until?: string;
  promo_sellers?: string[];
  promo_customers?: string[];
  tipo_variacao?: 'grade' | 'escolha_livre' | 'variedades';
  variacoes_disponiveis?: {
    nome: string; // e.g., "Cor", "Tamanho"
    opcoes: string[]; // e.g., ["Azul", "Vermelho"], ["P", "M", "G"]
  }[];
  variacoes_flat?: { sku: string; nome: string; esgotado?: boolean }[];
}

export interface CartItem extends Product {
  quantity: number;
  selected_variation?: Record<string, string>; // e.g., { "Cor": "Azul", "Tamanho": "M" }
}

export interface Order {
  id: string;
  company_id: string;
  customer_id: string;
  seller_id: string;
  brand_id: string;
  total: number;
  subtotal?: number;
  discount_type?: string;
  discount_value?: number;
  status: 'pending' | 'typed' | 'finished' | 'cancelled';
  whatsapp_sent: boolean;
  client_name?: string;
  payment_method?: string;
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
  subtotal: number;
  variacoes?: Record<string, string>;
}

export interface BannerData {
  id: string;
  company_id: string;
  tag?: string;
  title?: string;
  sub?: string;
  cta?: string;
  className?: string;
  image_url?: string;
  visuals?: { emoji: string; name: string; price: string }[];
  link_url?: string;
  order_index: number;
}

export interface TopBarMessage {
  id: string;
  company_id: string;
  text: string;
  order_index: number;
}

export type UserRole = 'company' | 'seller' | 'customer' | null;

export interface AuthState {
  role: UserRole;
  user: any;
  sellerCode?: string;
}
