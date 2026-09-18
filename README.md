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
- `/environments`: matriz de disponibilidade, análise de compatibilidade e comparação opcional entre Frontend e Backend por ambiente.
- `/sprints`: hub da sprint atual ou selecionada, com tarefas, indicadores,
  objetivo, critérios de sucesso, observações e links úteis.
- `/future-tasks`: cadastro e acompanhamento de tarefas ainda sem planejamento definido.
- `/queries`: biblioteca de queries, favoritos e pastas.
- `/queries/new`: criação de uma query com prévia dos resultados.
- `/queries/[id]`: tarefas encontradas pela query salva e edição dos critérios.
- `/settings`: edição das tags de Status e Ambiente e gerenciamento de sprints.

## Supabase

Execute o SQL de `supabase/schema.sql`. As tabelas usam RLS com `auth.uid()` para que cada conta acesse apenas os próprios registros. O schema inclui as tabelas `task_statuses`, `task_environment_statuses`, `task_environment_area_statuses`, `sprints`, `tag_options`, `user_settings`, `saved_queries` e `query_folders`.

No painel do Supabase:

1. Mantenha o provedor de e-mail habilitado em **Authentication > Providers**.
2. Habilite o Google e informe o Client ID e o Client Secret criados no Google Cloud.
3. No Google Cloud, use `https://SEU-PROJECT-REF.supabase.co/auth/v1/callback` como URI de redirecionamento autorizada.
4. Em **Authentication > URL Configuration**, configure a URL da aplicação e permita o caminho `/status` entre as URLs de redirecionamento.

O schema recria as chaves para `auth.users` com `NOT VALID` para não apagar nem bloquear registros do antigo acesso compartilhado. Esses registros legados precisam ser atribuídos manualmente a uma conta real antes de validar as constraints.

## Rastreamento de ambientes

A rota `/environments` concentra as tarefas atuais em uma matriz com Local/Sem ambiente, Desenvolvimento, Homologação e Produção. Cada status pode ser alternado diretamente na célula e usa a mesma relação `task_environment_statuses` do monitoramento individual disponível em `/status`.

A visão `Frontend × Backend` usa um ambiente por vez e compara somente as áreas selecionadas na tarefa. Tarefas de uma única área mostram a outra como não aplicável, enquanto tarefas com as duas áreas podem ser classificadas como alinhadas, adiantadas, incompletas ou bloqueadas. Os estados ficam em `task_environment_area_statuses`; a ausência de uma área em `task_statuses.areas` significa que ela não participa da tarefa.

As tags padrão ausentes são criadas de forma idempotente ao carregar a rota, inclusive para contas existentes. Variações já cadastradas, como `Homologação`, `HMG`, `Produção` ou `Prod`, são reconhecidas sem duplicar a tag.

A análise considera incompatível uma tarefa que avançou para Homologação sem Desenvolvimento, chegou a Produção sem Homologação ou cujo ambiente atual não está marcado como disponível. Tarefas sem nenhum ambiente disponível são identificadas separadamente como sem rastreamento. O percentual de organização considera apenas as tarefas classificadas como compatíveis.

## Queries

Antes de usar a funcionalidade, reaplique `supabase/schema.sql` no SQL Editor do projeto Supabase. As novas tabelas guardam os critérios, favoritos e pastas de cada conta; nenhuma tarefa é copiada para uma query.

Na biblioteca, use **Criar nova query**, informe o nome e adicione condições. Escolha **Todas (E)** para exigir todas as condições ou **Qualquer uma (OU)** para aceitar pelo menos uma. Sem condições, a query retorna todas as tarefas da conta, incluindo tarefas futuras. É possível consultar nome, Azure, links Azure/LiveOps, sprint, IDs, status, ambiente, tarefa futura e data de criação.

Os operadores disponíveis dependem do campo: comparação de texto, contém, não contém, começa com, vazio/não vazio, datas e booleanos. Textos ignoram diferenças de maiúsculas e acentos; datas usam o dia no fuso local do navegador. Cada query aceita até 50 condições. A prévia do editor usa o rascunho; **Salvar** persiste as alterações. Ao abrir a query ou atualizar os resultados, o app lê as tarefas atuais da conta, percorrendo todas as páginas do Supabase.

Use a estrela para favoritar, o menu lateral da biblioteca para filtrar por pasta e o campo de pasta do editor para mover uma query. Pastas podem ser criadas, renomeadas e excluídas. Excluir uma pasta move suas queries para **Sem pasta**; excluir uma query mantém suas tarefas.

Testes dos filtros e da persistência (sem depender de uma conexão externa):

```powershell
node --test tests/*.test.cjs
```
