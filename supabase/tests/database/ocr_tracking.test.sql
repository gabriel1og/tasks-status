begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public','ocr_tracking_items','OCR documents exist');
select has_table('public','ocr_tracking_checklist','OCR checklist exists');
select has_table('public','ocr_tracking_fields','OCR fields exist');
select has_table('public','ocr_tracking_issues','OCR issues exist');
select has_table('public','ocr_tracking_events','OCR events exist');
select fk_ok('public','ocr_tracking_fields',array['item_id','user_id'],'public','ocr_tracking_items',array['id','user_id'],'Fields belong to the same account');
select fk_ok('public','ocr_tracking_issues',array['field_id','item_id','user_id'],'public','ocr_tracking_fields',array['id','item_id','user_id'],'Issue fields belong to the same document');

insert into auth.users(id,email) values
 ('12000000-0000-0000-0000-000000000001','ocr-a@example.test'),
 ('12000000-0000-0000-0000-000000000002','ocr-b@example.test');
insert into public.ocr_tracking_items(id,user_id,source_key,supplier,filename) values
 ('62000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','test:a','Supplier A','A.pdf'),
 ('62000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000002','test:b','Supplier B','B.pdf');
insert into public.ocr_tracking_fields(id,user_id,item_id,key,label,required,applicability,regex,magnifier_status,triage_status,evidence)
 values ('72000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','document_number','Número',true,'yes','(1)','approved','approved','Confirmed test');

set local role authenticated;
set local request.jwt.claim.sub = '12000000-0000-0000-0000-000000000001';
select results_eq('select count(*) from public.ocr_tracking_items',array[1::bigint],'Only owned documents are visible');
select results_eq('select count(*) from public.ocr_tracking_events where user_id <> auth.uid()',array[0::bigint],'Foreign history stays private');
select results_eq($$update public.ocr_tracking_items set supplier='Wrong' where filename='B.pdf' returning id$$,$$select null::uuid where false$$,'Foreign rows cannot be updated');
select throws_ok($$insert into public.ocr_tracking_fields(user_id,item_id,key,label) values ('12000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000002','test','Foreign parent')$$,'23503',null,'Cross-account parent is rejected');
select throws_ok($$insert into public.ocr_tracking_items(user_id,source_key,supplier,filename) values ('12000000-0000-0000-0000-000000000002','illegal','Wrong','wrong.pdf')$$,'42501',null,'Foreign ownership is rejected');
select throws_ok($$insert into public.ocr_tracking_events(user_id,item_id,entity,operation) values (auth.uid(),'62000000-0000-0000-0000-000000000001','manual','INSERT')$$,'42501',null,'History cannot be forged');
select throws_ok($$delete from public.ocr_tracking_events$$,'42501',null,'History cannot be deleted');

select lives_ok($$update public.ocr_tracking_fields set regex='(2)' where id='72000000-0000-0000-0000-000000000001'$$,'Regex can be changed');
select results_eq('select magnifier_status,triage_status from public.ocr_tracking_fields',$$values ('pending'::text,'pending'::text)$$,'Database invalidates both approvals');
select ok(exists(select 1 from public.ocr_tracking_events where entity='ocr_tracking_fields' and operation='UPDATE' and old_record->>'regex'='(1)' and new_record->>'regex'='(2)'),'Previous regex is preserved in history');
select throws_ok($$update public.ocr_tracking_items set source_notes='Edited origin' where filename='A.pdf'$$,'P0001',null,'Original source stays immutable');
select throws_ok($$update public.ocr_tracking_fields set waiver_reason='Incomplete waiver'$$,'23514',null,'Incomplete waiver is rejected');
select throws_ok($$insert into public.ocr_tracking_issues(user_id,item_id,stage,kind,description,status) values (auth.uid(),'62000000-0000-0000-0000-000000000001',2,'review','Review','resolved')$$,'23514',null,'Resolution requires a description');
select throws_ok($$insert into public.ocr_tracking_checklist(user_id,item_id,key,stage,label,status) values (auth.uid(),'62000000-0000-0000-0000-000000000001','done',2,'Activity','done')$$,'23514',null,'Completed activity requires evidence');

select is(public.import_ocr_tracking(auth.uid(),jsonb_build_array(jsonb_build_object(
 'item',(select to_jsonb(i)||'{"source_key":"import:a"}'::jsonb from public.ocr_tracking_items i where filename='A.pdf'),
 'checklist','[]'::jsonb,'fields','[]'::jsonb,'issues','[]'::jsonb))),1,'Import inserts a new source document');
update public.ocr_tracking_items set assignee='Manual progress' where source_key='import:a';
select is(public.import_ocr_tracking(auth.uid(),jsonb_build_array(jsonb_build_object(
 'item',(select to_jsonb(i)||'{"source_key":"import:a"}'::jsonb from public.ocr_tracking_items i where source_key='test:a'),
 'checklist','[]'::jsonb,'fields','[]'::jsonb,'issues','[]'::jsonb))),0,'Reimport skips existing documents');
select results_eq($$select assignee from public.ocr_tracking_items where source_key='import:a'$$,array['Manual progress'::text],'Reimport preserves manual changes');
select throws_ok($$select public.import_ocr_tracking('12000000-0000-0000-0000-000000000002','[]'::jsonb)$$,'P0001',null,'RPC rejects a different account');
select throws_ok($$select public.import_ocr_tracking(auth.uid(),jsonb_build_array(
 jsonb_build_object('item',(select to_jsonb(i)||'{"source_key":"atomic:first"}'::jsonb from public.ocr_tracking_items i where source_key='test:a'),'checklist','[]'::jsonb,'fields','[]'::jsonb,'issues','[]'::jsonb),
 jsonb_build_object('item',(select to_jsonb(i)||'{"source_key":"atomic:invalid","supplier":""}'::jsonb from public.ocr_tracking_items i where source_key='test:a'),'checklist','[]'::jsonb,'fields','[]'::jsonb,'issues','[]'::jsonb)
))$$,'23514',null,'Invalid document rolls back the whole import');
select results_eq($$select count(*) from public.ocr_tracking_items where source_key like 'atomic:%'$$,array[0::bigint],'Atomic import leaves no partial rows');
select * from finish();
rollback;
