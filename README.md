# Gerenciamento de Status

Aplicação Next.js, React, TypeScript, shadcn-ui e Supabase para acompanhar tarefas atuais, futuras e organizadas por sprint.

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

- `/login`: login e cadastro por e-mail/senha ou acesso com Google.
- `/status`: cadastro e tabela de acompanhamento das tarefas.
- `/sprints`: tarefas da sprint atual ou da sprint selecionada.
- `/future-tasks`: cadastro e acompanhamento de tarefas ainda sem planejamento definido.
- `/settings`: edição das tags de Status e Ambiente e gerenciamento de sprints.

## Supabase

Execute o SQL de `supabase/schema.sql`. As tabelas usam RLS com `auth.uid()` para que cada conta acesse apenas os próprios registros. O schema inclui as tabelas `task_statuses`, `sprints`, `tag_options` e `user_settings`.

No painel do Supabase:

1. Mantenha o provedor de e-mail habilitado em **Authentication > Providers**.
2. Habilite o Google e informe o Client ID e o Client Secret criados no Google Cloud.
3. No Google Cloud, use `https://SEU-PROJECT-REF.supabase.co/auth/v1/callback` como URI de redirecionamento autorizada.
4. Em **Authentication > URL Configuration**, configure a URL da aplicação e permita o caminho `/status` entre as URLs de redirecionamento.

O schema recria as chaves para `auth.users` com `NOT VALID` para não apagar nem bloquear registros do antigo acesso compartilhado. Esses registros legados precisam ser atribuídos manualmente a uma conta real antes de validar as constraints.
