begin;

create extension if not exists pgtap with schema extensions;

select plan(36);

-- Tabelas que compoem os dominios atuais da aplicacao.
select has_table('public', 'user_settings', 'A tabela public.user_settings deve existir');
select has_table('public', 'sprints', 'A tabela public.sprints deve existir');
select has_table('public', 'tag_options', 'A tabela public.tag_options deve existir');
select has_table('public', 'task_statuses', 'A tabela public.task_statuses deve existir');
select has_table('public', 'task_environment_area_statuses', 'A tabela public.task_environment_area_statuses deve existir');
select has_table('public', 'task_environment_statuses', 'A tabela public.task_environment_statuses deve existir');
select has_table('public', 'query_folders', 'A tabela public.query_folders deve existir');
select has_table('public', 'saved_queries', 'A tabela public.saved_queries deve existir');

-- Cada tabela precisa manter a chave primaria esperada pelo frontend.
select col_is_pk('public', 'user_settings', 'user_id', 'user_settings.user_id deve ser a chave primaria');
select col_is_pk('public', 'sprints', 'id', 'sprints.id deve ser a chave primaria');
select col_is_pk('public', 'tag_options', 'id', 'tag_options.id deve ser a chave primaria');
select col_is_pk('public', 'task_statuses', 'id', 'task_statuses.id deve ser a chave primaria');
select col_is_pk('public', 'task_environment_area_statuses', 'id', 'task_environment_area_statuses.id deve ser a chave primaria');
select col_is_pk('public', 'task_environment_statuses', 'id', 'task_environment_statuses.id deve ser a chave primaria');
select col_is_pk('public', 'query_folders', 'id', 'query_folders.id deve ser a chave primaria');
select col_is_pk('public', 'saved_queries', 'id', 'saved_queries.id deve ser a chave primaria');

-- As chaves unicas compostas sustentam as FKs que preservam o proprietario.
select col_is_unique(
  'public',
  'task_statuses',
  array['id', 'user_id'],
  'task_statuses deve identificar uma tarefa junto com seu proprietario'
);
select col_is_unique(
  'public',
  'tag_options',
  array['id', 'user_id'],
  'tag_options deve identificar uma tag junto com seu proprietario'
);
select col_is_unique(
  'public',
  'query_folders',
  array['id', 'user_id'],
  'query_folders deve identificar uma pasta junto com seu proprietario'
);

-- Relacionamentos compostos impedem associacoes entre contas diferentes.
select fk_ok(
  'public', 'task_environment_area_statuses', array['task_id', 'user_id'],
  'public', 'task_statuses', array['id', 'user_id'],
  'A area por ambiente deve referenciar uma tarefa do mesmo usuario'
);
select fk_ok(
  'public', 'task_environment_area_statuses', array['environment_tag_id', 'user_id'],
  'public', 'tag_options', array['id', 'user_id'],
  'A area por ambiente deve referenciar uma tag do mesmo usuario'
);
select fk_ok(
  'public', 'task_environment_statuses', array['task_id', 'user_id'],
  'public', 'task_statuses', array['id', 'user_id'],
  'O ambiente da tarefa deve referenciar uma tarefa do mesmo usuario'
);
select fk_ok(
  'public', 'task_environment_statuses', array['environment_tag_id', 'user_id'],
  'public', 'tag_options', array['id', 'user_id'],
  'O ambiente da tarefa deve referenciar uma tag do mesmo usuario'
);
select fk_ok(
  'public', 'saved_queries', array['folder_id', 'user_id'],
  'public', 'query_folders', array['id', 'user_id'],
  'Uma query salva deve referenciar uma pasta do mesmo usuario'
);

-- Indices usados na listagem e na organizacao das queries salvas.
select has_index(
  'public',
  'saved_queries',
  'saved_queries_user_folder_idx',
  'O indice de queries por usuario e pasta deve existir'
);
select has_index(
  'public',
  'saved_queries',
  'saved_queries_user_updated_idx',
  'O indice de queries por usuario e atualizacao deve existir'
);

-- Funcoes de manutencao automatica.
select has_function(
  'public',
  'move_queries_to_root_before_folder_delete',
  array[]::name[],
  'A funcao que move queries para a raiz deve existir'
);
select has_function(
  'public',
  'touch_saved_query_updated_at',
  array[]::name[],
  'A funcao de atualizacao temporal das queries deve existir'
);
select has_function(
  'public',
  'touch_sprint_updated_at',
  array[]::name[],
  'A funcao de atualizacao temporal das sprints deve existir'
);
select has_function(
  'public',
  'touch_task_environment_status_updated_at',
  array[]::name[],
  'A funcao de atualizacao temporal dos ambientes deve existir'
);

-- Triggers que conectam as funcoes aos eventos das tabelas.
select has_trigger(
  'public',
  'query_folders',
  'query_folders_move_queries_to_root',
  'A exclusao de pasta deve mover suas queries para a raiz'
);
select has_trigger(
  'public',
  'saved_queries',
  'saved_queries_touch_updated_at',
  'A atualizacao de query deve renovar updated_at'
);
select has_trigger(
  'public',
  'sprints',
  'sprints_touch_updated_at',
  'A atualizacao de sprint deve renovar updated_at'
);
select has_trigger(
  'public',
  'task_environment_area_statuses',
  'task_environment_area_statuses_touch_updated_at',
  'A atualizacao de area por ambiente deve renovar updated_at'
);
select has_trigger(
  'public',
  'task_environment_statuses',
  'task_environment_statuses_touch_updated_at',
  'A atualizacao de ambiente da tarefa deve renovar updated_at'
);

-- As tabelas ja foram verificadas individualmente; contar as oito com RLS evita
-- que a comparacao textual do pgTAP dependa da collation do banco local.
select is(
  (
    select count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any (
        array[
          'query_folders',
          'saved_queries',
          'sprints',
          'tag_options',
          'task_environment_area_statuses',
          'task_environment_statuses',
          'task_statuses',
          'user_settings'
        ]
      )
      and c.relrowsecurity
  ),
  8::bigint,
  'Todas as tabelas de negocio devem estar com RLS habilitado'
);

select * from finish();
rollback;
