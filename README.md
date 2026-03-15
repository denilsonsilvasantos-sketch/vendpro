# VendPro - Catálogo e Pedidos B2B/B2C

O VendPro é uma plataforma moderna e completa para gestão de catálogos e vendas em atacado e varejo, projetada especialmente para distribuidores (focada inicialmente no nicho de cosméticos e beleza).

## 🚀 Principais Funcionalidades

- **Catálogo Inteligente:** Exibição de produtos com regras dinâmicas de preço (Varejo e Atacado/Box).
- **Gestão de Carrinho:** Controle de pedido mínimo por fornecedor e cálculo automático de descontos por volume.
- **Múltiplos Perfis (RBAC):** Acesso customizado para Administradores, Empresas, Vendedores e Clientes.
- **Importação via IA:** Leitura de notas fiscais e planilhas para cadastro automático de produtos.
- **Gestão de Pedidos:** Acompanhamento de status de orçamentos e vendas.
- **Painel Administrativo:** Dashboard com métricas de vendas, produtos mais vendidos e gestão de estoque.

## 🛠 Tecnologias Utilizadas

- **Frontend:** React 18, TypeScript, Vite
- **Estilização:** Tailwind CSS
- **Animações:** Framer Motion
- **Ícones:** Lucide React
- **Roteamento/Estado:** React Hooks customizados

## 📦 Como executar o projeto

1. Instale as dependências:
```bash
npm install
```

2. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse no navegador:
O aplicativo estará rodando na porta `3000` (ou a porta configurada no seu ambiente).

## 📄 Estrutura do Projeto

- `/src/components`: Componentes reutilizáveis de UI (Cards, Modais, Badges).
- `/src/pages`: Telas principais do sistema (Catálogo, Carrinho, Dashboard, Produtos).
- `/src/hooks`: Hooks customizados (ex: `useCart` para gestão de estado do carrinho).
- `/src/services`: Integrações com APIs externas (ex: `aiService.ts` para leitura de notas).
- `/src/types.ts`: Definições de tipagem do TypeScript.

---
*Documentação gerada para manter o padrão de qualidade e facilitar o onboarding de novos desenvolvedores.*