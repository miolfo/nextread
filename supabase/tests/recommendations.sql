-- Run against a disposable database after applying migrations, using psql.
-- import_runs is provisioned outside this repository; this fixture expects its
-- application insert columns (user_id, source, original_filename, status, book_count).
begin;
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.recommendations'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.recommended_book'::regclass) then
    raise exception 'recommendation tables must enforce RLS';
  end if;
  if not has_function_privilege('authenticated', 'public.save_recommendations(uuid,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.save_recommendations(uuid,jsonb)', 'EXECUTE') then
    raise exception 'recommendation RPC grants are incorrect';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.recommendations'::regclass
                 and contype = 'f' and confrelid = 'public.import_runs'::regclass and confdeltype = 'c')
     or not exists (select 1 from pg_constraint where conrelid = 'public.recommendations'::regclass
                    and contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype = 'c')
     or not exists (select 1 from pg_constraint where conrelid = 'public.recommended_book'::regclass
                    and contype = 'f' and confrelid = 'public.recommendations'::regclass and confdeltype = 'c') then
    raise exception 'recommendation cascade constraints are missing';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.recommended_book'::regclass
                 and contype = 'p' and pg_get_constraintdef(oid) like '%recommendation_id, key%')
     or not exists (select 1 from pg_constraint where conrelid = 'public.recommended_book'::regclass
                    and contype = 'u' and pg_get_constraintdef(oid) like '%recommendation_id, position%') then
    raise exception 'work deduplication or stable position constraint missing';
  end if;
  if position('i.user_id = v_user_id' in pg_get_functiondef('public.save_recommendations(uuid,jsonb)'::regprocedure)) = 0 then
    raise exception 'RPC must validate import ownership';
  end if;
end;
$$;

-- Transaction-local fixtures; rollback leaves no users, imports, or results.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'recommendations-a@example.invalid', '', now(), now(), now()),
  ('a1000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'recommendations-b@example.invalid', '', now(), now(), now());
insert into public.import_runs (user_id, source, original_filename, status, book_count)
values
  ('a1000000-0000-0000-0000-000000000001', 'goodreads', 'fixture-a.csv', 'received', 0),
  ('a1000000-0000-0000-0000-000000000002', 'goodreads', 'fixture-b.csv', 'received', 0);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.save_recommendations(
  (select id from public.import_runs where user_id = 'a1000000-0000-0000-0000-000000000002' limit 1),
  '[{"key":"/works/OL201W","title":"Other owner book"}]');
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare
  v_import uuid;
  v_set uuid;
  v_empty uuid;
begin
  select id into v_import from public.import_runs
    where user_id = auth.uid() order by id limit 1;
  if v_import is null then raise exception 'owner cannot see own import'; end if;
  if exists (select 1 from public.import_runs
             where user_id = 'a1000000-0000-0000-0000-000000000002') then
    raise exception 'owner can read another user import';
  end if;
  begin
    perform public.save_recommendations(
      (select id from public.import_runs where user_id = 'a1000000-0000-0000-0000-000000000002' limit 1), '[]');
    raise exception 'cross-owner import accepted';
  exception when others then
    if sqlerrm = 'cross-owner import accepted' then raise; end if;
  end;

  v_set := public.save_recommendations(v_import,
    '[{"key":"/works/OL101W","title":"First","author_name":["A"],"isbn":["1"]},{"key":"/works/OL102W","title":"Second"}]');
  v_empty := public.save_recommendations(v_import, '[]');
  if (select array_agg(key order by position) from public.recommended_book
      where recommendation_id = v_set) <> array['/works/OL101W','/works/OL102W'] then
    raise exception 'saved books do not preserve order';
  end if;
  if exists (select 1 from public.recommended_book where recommendation_id = v_empty)
     or (select count(*) from public.recommendations where id = v_empty) <> 1 then
    raise exception 'empty set was not saved';
  end if;
  if exists (select 1 from public.recommendations where user_id <> auth.uid())
     or exists (select 1 from public.recommended_book b join public.recommendations r on r.id = b.recommendation_id where r.user_id <> auth.uid()) then
    raise exception 'owner can read another user recommendation';
  end if;

  -- Duplicate work key causes a child insert constraint error after parent insert;
  -- the RPC statement must roll the entire set back.
  begin
    perform public.save_recommendations(v_import,
      '[{"key":"/works/OL103W","title":"One"},{"key":"/works/OL103W","title":"Duplicate"}]');
    raise exception 'duplicate child payload unexpectedly accepted';
  exception when unique_violation then null;
  end;
  if (select count(*) from public.recommendations where import_run_id = v_import) <> 2
     or exists (select 1 from public.recommended_book b join public.recommendations r on r.id = b.recommendation_id where r.import_run_id = v_import and b.key = '/works/OL103W') then
    raise exception 'failed child insert left partial recommendation rows';
  end if;
end;
$$;
reset role;

-- Removing the referenced import as the fixture owner cascades both set and books.
delete from public.import_runs where user_id = 'a1000000-0000-0000-0000-000000000001';
do $$
begin
  if exists (select 1 from public.recommendations where user_id = 'a1000000-0000-0000-0000-000000000001')
     or exists (select 1 from public.recommended_book b join public.recommendations r on r.id = b.recommendation_id
                where r.user_id = 'a1000000-0000-0000-0000-000000000001') then
    raise exception 'import deletion did not cascade recommendation rows';
  end if;
end;
$$;
rollback;
