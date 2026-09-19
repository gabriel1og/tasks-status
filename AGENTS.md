# AGENTS.md

Guia para agentes trabalhando neste projeto. Leia este arquivo antes de editar codigo, schema ou documentacao.

## Contexto do projeto

Este projeto é um hub pessoal para gerenciar tarefas e apontamentos de horas. Ele foi criado como uma aplicacao simples em Next.js, React, TypeScript, Tailwind/shadcn-ui e Supabase.

O fluxo principal fica em:

- `/login`: login e cadastro por e-mail/senha ou Google via Supabase Auth (no momento pausada).
- `/dashboard`: entrada do hub, com acesso aos dominios de tarefas e apontamento de horas.
- `/status`: cadastro, listagem, edicao e remocao de tarefas.
- `/environments`: matriz editavel de disponibilidade, analise entre ambientes e comparacao opcional entre Frontend e Backend.
- `/queries`: queries salvas por conta, favoritos e pastas; `/queries/new` cria e `/queries/[id]` exibe resultados e edita criterios.
- `/settings`: cadastro, edicao e remocao das tags usadas nas colunas de Status e Ambiente.
- `/time-tracking`: entrada do dominio de apontamento de horas; a visao geral e os apontamentos ainda sao placeholders autenticados.
- `/time-tracking/categories`: gerenciamento de categorias ativas e arquivadas, com nome e cor editaveis.
- `/time-tracking/settings`: configuracao da meta diaria individual, armazenada em minutos.

As tarefas possuem as colunas principais:

- `nome`
- `azure`
- `sprint`
- `status`
- `ambiente`

## Decisoes ja tomadas

- `docs/time-tracking/mvp-scope.md` e a fonte de verdade das regras do MVP de apontamento de horas.
- `docs/adr/0001-modular-monolith.md` registra a separacao entre tarefas e horas dentro do monolito modular.
- Apontamentos usam tarefa manual e nao possuem FK ou integracao com `task_statuses` e `sprints`.
- O app usa Supabase Auth com e-mail/senha e Google OAuth (no momento pausada).
- O `user_id` dos registros corresponde ao `id` da conta autenticada.
- As queries do frontend devem sempre filtrar pelo `user.id`, mesmo que o RLS do Supabase tambem esteja configurado.
- O RLS usa `auth.uid() = user_id` para isolar os dados de cada conta.
- A rota antiga `/configuracoes` foi substituida por `/settings`.
- O card de informacoes do usuario foi removido da tela de configuracoes.
- O projeto deve manter suporte real a light mode, dark mode e system mode pelo seletor no header.
- Os selects usam seta customizada global em `app/globals.css`; ao adicionar novos selects, reaproveite as classes existentes e nao reintroduza seta nativa grudada no canto.
- Tarefas armazenam `status` e `ambiente` como texto. Ao renomear uma tag mantendo o mesmo tipo, atualize tambem as tarefas que usavam o nome antigo.
- A rota `/environments` reutiliza `task_environment_statuses` como fonte de verdade e garante as tags padrao Sem Ambiente, Desenvolvimento, Homologacao e Producao para suas colunas fixas.
- `task_statuses.areas` informa se Frontend e/ou Backend participam da tarefa. `task_environment_area_statuses` guarda o estado de cada area em cada ambiente; ausencia de area significa "nao se aplica", enquanto ausencia de status significa "nao informado".

## Estrutura importante

- `app/dashboard/page.tsx`: entrada autenticada do hub e acesso aos dois dominios.
- `docs/time-tracking/mvp-scope.md`: regras aprovadas e limites do MVP de apontamento de horas.
- `docs/adr/0001-modular-monolith.md`: decisao arquitetural e limites entre os dominios.
- `docs/time-tracking/testing-strategy.md`: piramide e criterios de teste do dominio de horas.
- `app/status/page.tsx`: dashboard de tarefas, formulario de nova tarefa, tabela e edicao inline.
- `app/time-tracking/*`: rotas estruturais do dominio de apontamento de horas.
- `app/settings/page.tsx`: gerenciamento das tags de Status e Ambiente.
- `app/login/page.tsx`: login, cadastro e acesso com Google via Supabase Auth (no momento pausada).
- `components/app-shell.tsx`: layout autenticado, menu lateral, header e logout.
- `lib/app-navigation.ts`: fonte unica dos grupos e itens de navegacao do hub.
- `components/auth-guard.tsx`: protecao client-side baseada na sessao do Supabase.
- `components/theme-mode-menu.tsx`: menu de tema Claro, Escuro e Sistema.
- `components/ui/*`: componentes base no estilo shadcn-ui.
- `components/environments/*`: matriz de ambientes, comparacao entre areas, resumo de consistencia e modal de informacoes da tarefa.
- `lib/default-tags.ts`: tags iniciais criadas quando ainda nao ha tags no Supabase.
- `lib/environment-tracking.ts`: ambientes operacionais padrao e regras da analise de compatibilidade.
- `lib/supabase.ts`: cliente Supabase.
- `lib/time-tracking/*`: categorias padrao, regras puras e repository do dominio de horas.
- `components/queries/*`: biblioteca, editor de condicoes e resultados das queries.
- `lib/query-repository.ts`: persistencia e leitura paginada dos registros da conta.
- `lib/task-queries.ts`: validacao e avaliacao das condicoes salvas.
- `types/queries.ts`: tipos das queries, condicoes e pastas.
- `types/database.ts`: tipos TypeScript das tabelas usadas pela UI.
- `types/time-tracking.ts`: contratos manuais do dominio de horas.
- `supabase/schemas/*`: schemas declarativos organizados por dominio.
- `supabase/migrations/*`: historico incremental usado para reconstruir o banco.

## Banco de dados e Supabase

Use `npm run supabase:db:reset` para reconstruir o banco local pelas migrations.

Tabelas atuais:

- `user_settings`: existe no schema, mas a UI atual nao usa card de perfil.
- `tag_options`: tags de `status` e `ambiente`, com nome e cor.
- `task_statuses`: tarefas acompanhadas pela equipe.
- `task_environment_statuses`: disponibilidade de cada tarefa por tag de ambiente.
- `task_environment_area_statuses`: estado opcional de Frontend ou Backend por tarefa e ambiente.
- `saved_queries`: criterios das queries, pasta e favorito por usuario.
- `query_folders`: pastas de queries por usuario; ao excluir uma pasta, o trigger move suas queries para a raiz.
- `time_tracking_settings`: meta diaria atual de cada usuario.
- `time_categories`: categorias editaveis e arquivaveis de apontamento.
- `time_entries`: apontamentos manuais de data, duracao, tarefa e categoria.

Queries consultam todos os campos de `TaskStatusRow` e incluem tarefas atuais e futuras. Ao adicionar campos de tarefa, atualize tambem `lib/task-query-fields.ts` e os testes em `tests/`. A FK composta de query/pasta deve manter a mesma conta. Nunca remova tarefas ao excluir uma query ou pasta.

Cuidados ao alterar o schema:

- Mantenha as policies alinhadas com `auth.uid()` e o `user_id` da conta autenticada.
- Se a UI criar, editar ou remover registros, garanta policies correspondentes de `insert`, `update`, `delete` e `select`.
- Preserve as chaves estrangeiras para `auth.users`; use `not valid` enquanto houver registros legados ainda nao migrados.
- Preserve os `drop policy if exists` antes de recriar policies, pois isso facilita reaplicar o SQL durante ajustes.
- O dominio de horas nao referencia `task_statuses` ou `sprints`; a tarefa do apontamento e texto manual.
- Categorias utilizadas devem ser arquivadas, nunca removidas em cascata com seus apontamentos.

## Padroes de UI

- Preserve o estilo operacional e compacto do app. Ele e uma ferramenta interna, nao uma landing page.
- Use componentes em `components/ui` sempre que possivel.
- Use icones de `lucide-react` em botoes de acao.
- Para acoes compactas, prefira botoes de icone com `aria-label`.
- Mantenha textos visiveis em portugues.
- Evite criar cards dentro de cards. Cards devem enquadrar blocos principais ou itens repetidos.
- Ao mexer em tema, altere tokens em `app/globals.css` e valide light/dark.
- A fonte Inter esta importada via CSS global. Se o build falhar por rede ao buscar fontes, registre isso no fechamento antes de mudar a estrategia.

## Comandos

Instalar dependencias:

```powershell
npm install
```

Rodar desenvolvimento:

```powershell
npm run dev
```

Validar TypeScript:

```powershell
node_modules\.bin\tsc.cmd --noEmit
```

Validar build:

```powershell
npm.cmd run build
```

Fallback de build quando o `npm` simples falhar:

```powershell
node_modules\.bin\next.cmd build
```

## Armadilhas conhecidas neste workspace

- No Windows deste ambiente, `npm run ...` pode cair em um shim quebrado com erro de `npm-cli.js` ausente. Tente `npm.cmd run ...` ou os binarios locais em `node_modules\.bin`.
- `npm run lint` / ESLint direto pode falhar porque o projeto usa ESLint 9 mas ainda nao possui `eslint.config.*`. Nao trate isso automaticamente como erro da feature.
- Builds podem gerar `tsconfig.tsbuildinfo`; se aparecer como arquivo nao versionado depois da validacao, limpe-o com cuidado.
- Evite deixar servidor local rodando ao final, a menos que o usuario tenha pedido explicitamente para testar no navegador.
- O projeto pode ter mudancas locais do usuario. Antes de editar, confira `git status --short --branch` e nao reverta arquivos fora do escopo.

## Fluxo recomendado para proximas alteracoes

1. Rode `git status --short --branch`.
2. Leia os arquivos diretamente relacionados antes de editar.
3. Mantenha mudancas pequenas e no padrao do app.
4. Se alterar comportamento persistido, revise o schema declarativo do dominio, crie uma migration incremental e regenere os tipos.
5. Nao rode build, testes ou validacao TypeScript por padrao; o usuario fara essas validacoes manualmente.
6. Informe claramente que as validacoes nao foram executadas quando concluir a tarefa.
   OBS: Nunca crie um servidor local (https://localhost:3000), a não ser que eu peça explicitamente.

## Resumo das features implementadas nos chats

- Projeto base Next.js/React/TypeScript com Tailwind/shadcn-ui e Supabase.
- Tela de login, menu autenticado, tabela de tarefas e tela de configuracoes.
- Login e cadastro por e-mail/senha e integracao com Google via Supabase Auth (no momento pausada).
- Rota `/settings` no lugar de `/configuracoes`.
- Remocao do perfil de usuario da tela de configuracoes.
- Light/dark/system mode no header com persistencia em `localStorage`.
- Ajustes globais de dark/light tokens.
- Correcao global da seta dos selects.
- Criacao, edicao e remocao de tarefas.
- Matriz exclusiva e editavel de disponibilidade por ambiente em `/environments`.
- Analise de compatibilidade, percentual de organizacao e filtro por diagnostico.
- Comparacao opcional entre Frontend e Backend dentro de cada ambiente.
- Criacao, edicao e remocao de tags de Status e Ambiente.
- Propagacao de renome de status/ambiente para tarefas existentes.
- Policies de update no Supabase para tags e tarefas.
- Categorias de horas editaveis, arquivaveis, reativaveis e removiveis quando nao utilizadas.
- Meta diaria individual de apontamento, com valor inicial de 6h e persistencia em minutos.
