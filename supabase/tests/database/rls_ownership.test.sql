begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- Duas contas isoladas e dados iniciais criados com privilegio administrativo.
insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'rls-owner-a@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'rls-owner-b@example.test');

insert into public.task_statuses (id, user_id, nome, status, ambiente)
values (
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'Tarefa privada do usuario B',
  'Em andamento',
  'Desenvolvimento'
);

insert into public.query_folders (id, user_id, nome)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Pasta do usuario A'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'Pasta do usuario B'
  );

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

select lives_ok(
  $$
    insert into public.task_statuses (id, user_id, nome, status, ambiente)
    values (
      '20000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'Tarefa do usuario A',
      'Backlog',
      'Sem Ambiente'
    )
  $$,
  'O usuario autenticado pode criar uma tarefa propria'
);

select results_eq(
  'select count(*) from public.task_statuses',
  array[1::bigint],
  'O usuario autenticado enxerga somente suas proprias tarefas'
);

select results_eq(
  'select count(*) from public.query_folders',
  array[1::bigint],
  'O isolamento por proprietario tambem se aplica as pastas de queries'
);

select lives_ok(
  $$
    update public.task_statuses
    set nome = 'Tarefa atualizada pelo usuario A'
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  'O usuario autenticado pode atualizar uma tarefa propria'
);

select results_eq(
  $$
    select nome
    from public.task_statuses
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  array['Tarefa atualizada pelo usuario A'::text],
  'A atualizacao da tarefa propria deve ser persistida'
);

select results_eq(
  $$
    update public.task_statuses
    set nome = 'Alteracao indevida'
    where id = '20000000-0000-0000-0000-000000000002'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'O usuario autenticado nao pode atualizar a tarefa de outra conta'
);

select results_eq(
  $$
    delete from public.task_statuses
    where id = '20000000-0000-0000-0000-000000000002'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'O usuario autenticado nao pode excluir a tarefa de outra conta'
);

select throws_ok(
  $$
    insert into public.task_statuses (id, user_id, nome, status, ambiente)
    values (
      '20000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000002',
      'Insercao indevida',
      'Backlog',
      'Sem Ambiente'
    )
  $$,
  '42501',
  null,
  'O usuario autenticado nao pode criar uma tarefa para outra conta'
);

select lives_ok(
  $$
    delete from public.task_statuses
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  'O usuario autenticado pode excluir uma tarefa propria'
);

select results_eq(
  'select count(*) from public.task_statuses',
  array[0::bigint],
  'A tarefa propria excluida nao deve mais aparecer para o usuario'
);

set local role anon;
set local request.jwt.claim.sub = '';

select results_eq(
  'select count(*) from public.task_statuses',
  array[0::bigint],
  'Uma sessao anonima nao pode ler tarefas'
);

select results_eq(
  'select count(*) from public.query_folders',
  array[0::bigint],
  'Uma sessao anonima nao pode ler pastas de queries'
);

reset role;

select results_eq(
  $$
    select nome
    from public.task_statuses
    where id = '20000000-0000-0000-0000-000000000002'
  $$,
  array['Tarefa privada do usuario B'::text],
  'As tentativas de alteracao e exclusao nao afetaram a tarefa da outra conta'
);

select * from finish();
rollback;
