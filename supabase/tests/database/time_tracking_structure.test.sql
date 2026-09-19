begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

select has_table('public', 'time_tracking_settings', 'A tabela de configuracao de horas deve existir');
select has_table('public', 'time_categories', 'A tabela de categorias de horas deve existir');
select has_table('public', 'time_entries', 'A tabela de apontamentos deve existir');

select col_is_pk('public', 'time_tracking_settings', 'user_id', 'A configuracao deve ter uma linha por usuario');
select col_is_pk('public', 'time_categories', 'id', 'A categoria deve ter id como chave primaria');
select col_is_pk('public', 'time_entries', 'id', 'O apontamento deve ter id como chave primaria');

select col_is_unique(
  'public', 'time_categories', array['id', 'user_id'],
  'A categoria deve identificar seu proprietario para a FK composta'
);
select col_is_unique(
  'public', 'time_categories', array['user_id', 'name'],
  'O nome da categoria deve ser unico por usuario'
);

select fk_ok(
  'public', 'time_entries', array['category_id', 'user_id'],
  'public', 'time_categories', array['id', 'user_id'],
  'O apontamento deve referenciar uma categoria da mesma conta'
);

select has_index(
  'public', 'time_categories', 'time_categories_user_archived_idx',
  'A listagem de categorias por usuario e arquivamento deve ter indice'
);
select has_index(
  'public', 'time_entries', 'time_entries_user_category_date_idx',
  'Os totais por categoria e data devem ter indice'
);
select has_index(
  'public', 'time_entries', 'time_entries_user_date_idx',
  'A listagem de apontamentos por usuario e data deve ter indice'
);

select has_function(
  'public', 'set_time_tracking_timestamps', array[]::name[],
  'A funcao de integridade temporal do dominio de horas deve existir'
);
select has_function(
  'public', 'validate_time_entry', array[]::name[],
  'A funcao de validacao do apontamento deve existir'
);

select has_trigger(
  'public', 'time_tracking_settings', 'time_tracking_settings_set_timestamps',
  'A configuracao deve proteger created_at e renovar updated_at'
);
select has_trigger(
  'public', 'time_categories', 'time_categories_set_timestamps',
  'A categoria deve proteger created_at e renovar updated_at'
);
select has_trigger(
  'public', 'time_entries', 'time_entries_set_timestamps',
  'O apontamento deve proteger created_at e renovar updated_at'
);
select has_trigger(
  'public', 'time_entries', 'time_entries_validate',
  'O apontamento deve validar data e categoria antes da escrita'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any (array['time_tracking_settings', 'time_categories', 'time_entries'])
      and c.relrowsecurity
  ),
  3::bigint,
  'Todas as tabelas do dominio de horas devem ter RLS habilitado'
);

select is(
  (select count(*) from pg_catalog.pg_constraint where conrelid = 'public.time_tracking_settings'::regclass and contype = 'c'),
  1::bigint,
  'A configuracao deve validar a meta diaria'
);
select is(
  (select count(*) from pg_catalog.pg_constraint where conrelid = 'public.time_categories'::regclass and contype = 'c'),
  2::bigint,
  'A categoria deve validar nome e cor'
);
select is(
  (select count(*) from pg_catalog.pg_constraint where conrelid = 'public.time_entries'::regclass and contype = 'c'),
  2::bigint,
  'O apontamento deve validar duracao e tarefa'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_constraint
    where conrelid = any (
      array[
        'public.time_tracking_settings'::regclass,
        'public.time_categories'::regclass,
        'public.time_entries'::regclass
      ]
    )
      and contype = 'f'
      and pg_get_constraintdef(oid) ~ '(task_statuses|sprints)'
  ),
  0::bigint,
  'O dominio de horas nao deve referenciar tarefas ou sprints'
);

select is(
  (
    select confdeltype
    from pg_catalog.pg_constraint
    where conrelid = 'public.time_entries'::regclass
      and conname = 'time_entries_category_owner_fkey'
  ),
  'r'::"char",
  'A categoria referenciada deve usar exclusao restrita explicita'
);

select * from finish();
rollback;
