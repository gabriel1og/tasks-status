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

## Acesso

O acesso e compartilhado pela equipe e usa um login local mockado:

- Usuario: `inbound`
- Senha: `inbound`

## Telas

- `/login`: login unico por usuario e senha.
- `/status`: cadastro e tabela de acompanhamento das tarefas.
- `/sprints`: tarefas da sprint atual ou da sprint selecionada.
- `/future-tasks`: cadastro e acompanhamento de tarefas ainda sem planejamento definido.
- `/settings`: edição das tags de Status e Ambiente e gerenciamento de sprints.

## Supabase

Execute o SQL de `supabase/schema.sql`. As tabelas usam um `user_id` fixo para centralizar os dados da equipe no acesso compartilhado. O schema inclui as tabelas `task_statuses`, `sprints`, `tag_options` e `user_settings`.
