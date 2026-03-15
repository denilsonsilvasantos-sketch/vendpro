# Documento de Requisitos de Produto (PRD) - VendPro

## 1. Visão Geral
O VendPro é um sistema de catálogo digital e captação de pedidos (orçamentos) projetado para atender distribuidores que operam tanto no varejo (unidade) quanto no atacado (caixa fechada/box). O foco inicial é o nicho de cosméticos e beleza, mas a plataforma é agnóstica em relação aos produtos.

## 2. Perfis de Usuário (Personas)
O sistema opera com um Controle de Acesso Baseado em Funções (RBAC) com os seguintes perfis:

*   **Administrador (`admin`):** Controle total do sistema, incluindo gerenciamento de todas as empresas, vendedores e configurações globais.
*   **Empresa / Fornecedor (`company`):** Gerencia seu próprio catálogo, marcas, categorias, políticas de frete, pedido mínimo e visualiza os pedidos recebidos.
*   **Vendedor (`seller`):** Acessa o catálogo para montar pedidos para seus clientes. Possui acesso a preços de atacado e ferramentas de venda.
*   **Cliente (`customer`):** Acessa o catálogo de forma restrita para visualizar produtos e solicitar orçamentos. A visão do cliente pode ter restrições de preço dependendo da configuração da empresa.

## 3. Regras de Negócio: Preços e Produtos
A lógica de precificação é o coração do sistema e atende a três cenários principais de venda:

### 3.1. Venda Normal (Varejo)
*   O produto é vendido por unidade.
*   Utiliza o campo `preco_unitario`.
*   O incremento no carrinho respeita o campo `multiplo_venda` (ex: se for 3, o usuário só pode adicionar 3, 6, 9 unidades).

### 3.2. Venda com Desconto de Box (Atacado)
*   O produto pode ser comprado por unidade ou por caixa fechada.
*   Ativado pela flag `has_box_discount`.
*   Se a quantidade no carrinho atingir a `qtd_box`, o sistema aplica automaticamente o `preco_box` (que é o valor unitário com desconto).
*   **Exibição no Catálogo:** "A partir de X un: R$ Y" (onde Y é o preço unitário já com o desconto aplicado).

### 3.3. Venda Somente no Box
*   O produto **não** é vendido fracionado, apenas a caixa fechada inteira.
*   Ativado pela flag `venda_somente_box`.
*   A quantidade no carrinho representa o **número de caixas** (1 = 1 caixa, 2 = 2 caixas).
*   O valor exibido e somado no carrinho é o valor total da caixa (`preco_box`).
*   **Exibição no Catálogo:** "Box com X un: R$ Y" (onde Y é o valor total da caixa).
*   **Comportamento do Carrinho:** O botão de adicionar/remover pula de 1 em 1 (referente a 1 box).

## 4. Regras de Negócio: Carrinho e Pedidos
*   **Pedido Mínimo:** Cada empresa pode definir um valor mínimo de pedido (`minimum_order_value`). O carrinho valida esse valor e impede a finalização se o subtotal for menor.
*   **Troca de Empresa (Catálogo):** Se o usuário tem itens no carrinho e decide trocar de catálogo (empresa), o sistema exibe um aviso e o carrinho atual deve ser esvaziado. Isso ocorre porque as políticas comerciais, fretes e pedidos mínimos são individuais por empresa.
*   **Status de Estoque:** Produtos marcados como `esgotado` não podem ser adicionados ao carrinho. Produtos com `is_last_units` recebem um badge visual de alerta.

## 5. Importação via Inteligência Artificial
*   O sistema permite o upload de Notas Fiscais, planilhas ou textos para cadastro em lote de produtos.
*   A IA extrai automaticamente: Nome, SKU, Preço Unitário, Preço Box, Quantidade no Box e identifica se o produto possui desconto de box ou se é vendido somente no box.

## 6. Próximos Passos (Roadmap)
*   Integração com gateway de pagamento para fechamento real da venda (atualmente funciona como orçamento).
*   Integração com ERPs para sincronização de estoque em tempo real.
*   Geração de PDF do pedido finalizado para envio via WhatsApp.
