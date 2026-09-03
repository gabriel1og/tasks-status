# Gerenciamento de Status

Aplicação Next.js, React, TypeScript, shadcn-ui e Supabase para acompanhar status de tarefas por nome, Azure, sprint, status e ambiente.

## Como rodar

1. Instale as dependências:

```bash
npm install
```

2. Crie `.env.local` usando `.env.example` como base:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

3. No Supabase, execute o SQL de `supabase/schema.sql`.

4. Rode o projeto:

```bash
npm run dev
```

## Telas

- `/login`: login e cadastro por e-mail e senha.
- `/status`: cadastro e tabela de acompanhamento das tarefas.
- `/configuracoes`: dados do usuário e edição das tags de Status e Ambiente.

## Supabase

Ative o provedor de autenticação por e-mail/senha no painel do Supabase. As tabelas usam RLS para manter cada usuário vendo apenas os próprios dados.
