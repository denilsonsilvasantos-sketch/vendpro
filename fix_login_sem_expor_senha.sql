-- ============================================================
-- FIX: login sem expor a coluna "senha" nas respostas da API
-- ============================================================
-- Não apaga nem altera nenhum dado existente. Cria 4 funções
-- (RPC) que fazem a checagem de senha DENTRO do banco e nunca
-- devolvem a coluna "senha" pro navegador.
-- Só roda com sucesso se as senhas continuarem em texto puro
-- na coluna "senha" (não mexe nesse formato agora).
-- ============================================================

-- 1. Login de cliente por CNPJ
CREATE OR REPLACE FUNCTION public.login_customer_by_cnpj(p_cnpj text, p_senha text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer customers%ROWTYPE;
BEGIN
  SELECT * INTO v_customer
  FROM customers
  WHERE cnpj = regexp_replace(p_cnpj, '\D', '', 'g')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_customer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'CNPJ não cadastrado');
  END IF;

  IF p_senha IS NOT NULL AND v_customer.senha IS DISTINCT FROM p_senha THEN
    RETURN jsonb_build_object('success', false, 'error', 'Senha incorreta');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'customer', to_jsonb(v_customer) - 'senha',
    'seller', (SELECT to_jsonb(s) - 'senha' FROM sellers s WHERE s.id = v_customer.seller_id),
    'company', (SELECT to_jsonb(c) - 'senha' FROM companies c WHERE c.id = v_customer.company_id)
  );
END;
$$;

-- 2. Login de cliente por código de acesso
CREATE OR REPLACE FUNCTION public.login_customer_by_code(p_code text, p_senha text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer customers%ROWTYPE;
BEGIN
  SELECT * INTO v_customer
  FROM customers
  WHERE codigo_acesso = upper(p_code)
  LIMIT 1;

  IF v_customer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de acesso inválido');
  END IF;

  IF p_senha IS NOT NULL AND v_customer.senha IS DISTINCT FROM p_senha THEN
    RETURN jsonb_build_object('success', false, 'error', 'Senha incorreta');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'customer', to_jsonb(v_customer) - 'senha',
    'seller', (SELECT to_jsonb(s) - 'senha' FROM sellers s WHERE s.id = v_customer.seller_id),
    'company', (SELECT to_jsonb(c) - 'senha' FROM companies c WHERE c.id = v_customer.company_id)
  );
END;
$$;

-- 3. Login de empresa por CNPJ
CREATE OR REPLACE FUNCTION public.login_company_by_cnpj(p_cnpj text, p_senha text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company companies%ROWTYPE;
BEGIN
  SELECT * INTO v_company
  FROM companies
  WHERE cnpj = regexp_replace(p_cnpj, '\D', '', 'g')
    AND senha = p_senha
  LIMIT 1;

  IF v_company.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Identificador ou senha incorretos');
  END IF;

  RETURN jsonb_build_object('success', true, 'company', to_jsonb(v_company) - 'senha');
END;
$$;

-- 4. Login de vendedor (por código+senha) ou busca de cliente (por código, sem senha)
CREATE OR REPLACE FUNCTION public.login_seller_or_lookup_by_code(p_code text, p_senha text DEFAULT NULL, p_type text DEFAULT 'seller')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sellers jsonb;
BEGIN
  IF p_type = 'customer' THEN
    SELECT jsonb_agg(to_jsonb(s) - 'senha' || jsonb_build_object('companies', to_jsonb(c) - 'senha'))
    INTO v_sellers
    FROM sellers s
    LEFT JOIN companies c ON c.id = s.company_id
    WHERE upper(trim(p_code)) IN (s.codigo_vinculo, s.codigo_cliente);
  ELSE
    SELECT jsonb_agg(to_jsonb(s) - 'senha' || jsonb_build_object('companies', to_jsonb(c) - 'senha'))
    INTO v_sellers
    FROM sellers s
    LEFT JOIN companies c ON c.id = s.company_id
    WHERE s.codigo_vinculo = upper(trim(p_code))
      AND (p_senha IS NULL OR s.senha = trim(p_senha));
  END IF;

  IF v_sellers IS NULL OR jsonb_array_length(v_sellers) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Código ou senha incorretos');
  END IF;

  RETURN jsonb_build_object('success', true, 'sellers', v_sellers);
END;
$$;

-- Permite que o app (chave anônima) chame essas 4 funções
GRANT EXECUTE ON FUNCTION public.login_customer_by_cnpj(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_customer_by_code(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_company_by_cnpj(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_seller_or_lookup_by_code(text, text, text) TO anon, authenticated;
