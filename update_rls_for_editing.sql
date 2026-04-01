-- Script para permitir a edição e exclusão de itens de pedidos no Supabase (RLS)
-- Execute este script no SQL Editor do seu painel Supabase.

-- 1. Melhorar as políticas da tabela 'orders'
-- Permite que a empresa gerencie (SELECT, INSERT, UPDATE, DELETE) todos os seus pedidos
DROP POLICY IF EXISTS "Companies can view all orders" ON orders;
CREATE POLICY "Companies can manage all their orders" ON orders
    FOR ALL USING (company_id = get_user_company_id());

-- Permite que vendedores atualizem seus próprios pedidos (ex: mudar status ou total após editar itens)
CREATE POLICY "Sellers can update their own orders" ON orders
    FOR UPDATE USING (seller_id = get_user_seller_id());


-- 2. Melhorar as políticas da tabela 'order_items'
-- Remove a política antiga de apenas visualização
DROP POLICY IF EXISTS "Users can view items of their orders" ON order_items;
DROP POLICY IF EXISTS "Users can insert items to their orders" ON order_items;

-- Permite que usuários gerenciem os itens de seus pedidos (SELECT, INSERT, UPDATE, DELETE)
-- A segurança é herdada da tabela de pedidos (orders)
CREATE POLICY "Users can manage items of their orders" ON order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id
            AND (
                orders.company_id = get_user_company_id() OR
                orders.seller_id = get_user_seller_id() OR
                orders.customer_id = get_user_customer_id()
            )
        )
    );

-- 3. Índices de Performance (Opcional, mas recomendado para velocidade)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
