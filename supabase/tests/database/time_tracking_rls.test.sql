begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

insert into auth.users (id, email)
values
  ('11000000-0000-0000-0000-000000000001', 'time-owner-a@example.test'),
  ('11000000-0000-0000-0000-000000000002', 'time-owner-b@example.test');

insert into public.time_tracking_settings (user_id, daily_goal_minutes)
values ('11000000-0000-0000-0000-000000000002', 480);

insert into public.time_categories (id, user_id, name, color)
values
  (
    '41000000-0000-0000-0000-000000000001',
    '11000000-0000-0000-0000-000000000001',
    'Categoria do usuario A',
    '#2563eb'
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    '11000000-0000-0000-0000-000000000002',
    'Categoria privada do usuario B',
    '#7c3aed'
  );

insert into public.time_entries (
  id, user_id, entry_date, duration_minutes, task, category_id
)
values (
  '51000000-0000-0000-0000-000000000002',
  '11000000-0000-0000-0000-000000000002',
  '2026-09-18',
  90,
  'Apontamento privado do usuario B',
  '41000000-0000-0000-0000-000000000002'
);

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000001';

select lives_ok(
  $$ insert into public.time_tracking_settings (user_id) values ('11000000-0000-0000-0000-000000000001') $$,
  'O usuario pode criar a propria configuracao com meta padrao'
);

select lives_ok(
  $$
    insert into public.time_categories (id, user_id, name, color)
    values (
      '41000000-0000-0000-0000-000000000003',
      '11000000-0000-0000-0000-000000000001',
      'Segunda categoria do usuario A',
      '#16a34a'
    )
  $$,
  'O usuario pode criar uma categoria propria'
);

select lives_ok(
  $$
    insert into public.time_entries (
      id, user_id, entry_date, duration_minutes, task, category_id
    ) values (
      '51000000-0000-0000-0000-000000000001',
      '11000000-0000-0000-0000-000000000001',
      '2026-09-18',
      60,
      'Apontamento do usuario A',
      '41000000-0000-0000-0000-000000000001'
    )
  $$,
  'O usuario pode criar um apontamento proprio'
);

select results_eq('select count(*) from public.time_tracking_settings', array[1::bigint], 'A conta enxerga somente sua configuracao');
select results_eq('select count(*) from public.time_categories', array[2::bigint], 'A conta enxerga somente suas categorias');
select results_eq('select count(*) from public.time_entries', array[1::bigint], 'A conta enxerga somente seus apontamentos');

select results_eq(
  $$ update public.time_categories set name = 'Alteracao indevida' where id = '41000000-0000-0000-0000-000000000002' returning id $$,
  $$ select null::uuid where false $$,
  'O usuario nao pode atualizar uma categoria de outra conta'
);

select results_eq(
  $$ delete from public.time_entries where id = '51000000-0000-0000-0000-000000000002' returning id $$,
  $$ select null::uuid where false $$,
  'O usuario nao pode excluir um apontamento de outra conta'
);

select throws_ok(
  $$ insert into public.time_categories (user_id, name) values ('11000000-0000-0000-0000-000000000002', 'Insercao indevida') $$,
  '42501', null,
  'O usuario nao pode criar uma categoria para outra conta'
);

select throws_ok(
  $$
    insert into public.time_entries (user_id, entry_date, duration_minutes, task, category_id)
    values (
      '11000000-0000-0000-0000-000000000001',
      '2026-09-18',
      30,
      'Referencia cruzada',
      '41000000-0000-0000-0000-000000000002'
    )
  $$,
  '23503', null,
  'Um apontamento nao pode usar categoria de outra conta'
);

select throws_ok(
  $$
    insert into public.time_entries (user_id, entry_date, duration_minutes, task, category_id)
    values (
      '11000000-0000-0000-0000-000000000001',
      '2999-01-01',
      30,
      'Data futura',
      '41000000-0000-0000-0000-000000000003'
    )
  $$,
  '23514', null,
  'Um apontamento nao pode usar data futura'
);

select throws_ok(
  $$ delete from public.time_categories where id = '41000000-0000-0000-0000-000000000001' $$,
  '23503', null,
  'Uma categoria utilizada nao pode ser excluida'
);

select lives_ok(
  $$ update public.time_categories set archived_at = now() where id = '41000000-0000-0000-0000-000000000001' $$,
  'O usuario pode arquivar uma categoria propria'
);

select throws_ok(
  $$
    insert into public.time_entries (user_id, entry_date, duration_minutes, task, category_id)
    values (
      '11000000-0000-0000-0000-000000000001',
      '2026-09-18',
      30,
      'Categoria arquivada',
      '41000000-0000-0000-0000-000000000001'
    )
  $$,
  '23514', null,
  'Uma categoria arquivada nao aceita novos apontamentos'
);

select lives_ok(
  $$ update public.time_entries set duration_minutes = 75 where id = '51000000-0000-0000-0000-000000000001' $$,
  'Um apontamento antigo continua editavel depois do arquivamento da categoria'
);

select lives_ok(
  $$ delete from public.time_entries where id = '51000000-0000-0000-0000-000000000001' $$,
  'O usuario pode excluir um apontamento proprio'
);

select results_eq(
  $$ update public.time_tracking_settings set daily_goal_minutes = 1 where user_id = '11000000-0000-0000-0000-000000000002' returning user_id $$,
  $$ select null::uuid where false $$,
  'O usuario nao pode atualizar a configuracao de outra conta'
);

set local role anon;
set local request.jwt.claim.sub = '';

select results_eq('select count(*) from public.time_tracking_settings', array[0::bigint], 'Uma sessao anonima nao le configuracoes de horas');
select results_eq('select count(*) from public.time_categories', array[0::bigint], 'Uma sessao anonima nao le categorias de horas');
select results_eq('select count(*) from public.time_entries', array[0::bigint], 'Uma sessao anonima nao le apontamentos');

reset role;

select results_eq(
  $$ select name from public.time_categories where id = '41000000-0000-0000-0000-000000000002' $$,
  array['Categoria privada do usuario B'::text],
  'A categoria da outra conta permaneceu inalterada'
);
select results_eq(
  $$ select task from public.time_entries where id = '51000000-0000-0000-0000-000000000002' $$,
  array['Apontamento privado do usuario B'::text],
  'O apontamento da outra conta permaneceu inalterado'
);
select results_eq(
  $$ select daily_goal_minutes from public.time_tracking_settings where user_id = '11000000-0000-0000-0000-000000000002' $$,
  array[480],
  'A configuracao da outra conta permaneceu inalterada'
);

select * from finish();
rollback;
