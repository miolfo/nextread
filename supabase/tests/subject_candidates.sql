-- Run against a disposable database after applying migrations, using psql.
begin;

do $$
begin
  if (select collation_name from information_schema.columns
      where table_schema = 'public' and table_name = 'subject'
        and column_name = 'subject') <> 'C' then
    raise exception 'subject.subject must use C collation';
  end if;
  if exists (
    select 1
    from (values ('anon'), ('authenticated')) as roles(role_name)
    cross join (values ('subject')) as tables(table_name)
    cross join (values ('INSERT'), ('UPDATE'), ('DELETE'),
                       ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as privileges(privilege_name)
    where has_table_privilege(roles.role_name,
      format('public.%I', tables.table_name), privileges.privilege_name)
  ) then
    raise exception 'anon or authenticated has direct table privileges';
  end if;
  if not has_table_privilege('authenticated', 'public.subject', 'SELECT')
     or has_table_privilege('anon', 'public.subject', 'SELECT') then
    raise exception 'subject select grants are incorrect';
  end if;
  if not has_function_privilege('authenticated',
        'public.record_subject_candidates(jsonb)', 'EXECUTE')
     or has_function_privilege('anon',
        'public.record_subject_candidates(jsonb)', 'EXECUTE') then
    raise exception 'RPC grants are incorrect';
  end if;
end;
$$;

-- Seed a deterministic visible subject so these RLS checks remain
-- meaningful even when the table is otherwise empty. Rollback removes it.
delete from public.subject where subject = 'SQL regression RLS fixture';
insert into public.subject (subject, count, enabled)
values ('SQL regression RLS fixture', 37, false);

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"is_admin":true}}', true);
do $$
declare
  fixture_count bigint;
begin
  select count into fixture_count from public.subject
    where subject = 'SQL regression RLS fixture';
  if fixture_count is distinct from 37 or (select enabled from public.subject where subject = 'SQL regression RLS fixture') is distinct from false then
    raise exception 'admin cannot read exact subject fixture and count';
  end if;
end;
$$;
select set_config('request.jwt.claims', '{"app_metadata":{"is_admin":false}}', true);
do $$
begin
  if exists (select 1 from public.subject
             where subject = 'SQL regression RLS fixture') then
    raise exception 'non-admin can read subjects';
  end if;
end;
$$;
select set_config('request.jwt.claims', '{"user_metadata":{"is_admin":true}}', true);
do $$
begin
  if exists (select 1 from public.subject
             where subject = 'SQL regression RLS fixture') then
    raise exception 'user metadata spoof enabled admin access';
  end if;
end;
$$;
select set_config('request.jwt.claims', '{"app_metadata":{"is_admin":"true"}}', true);
do $$
begin
  if exists (select 1 from public.subject
             where subject = 'SQL regression RLS fixture') then
    raise exception 'malformed admin flag enabled access';
  end if;
end;
$$;
reset role;

select public.record_subject_candidates('[{"subject":"SQL regression exact","count":1},{"subject":"SQL regression exact","count":2},{"subject":"SQL regression exact ","count":1}]');
set local role authenticated;
select public.record_subject_candidates('[{"subject":"SQL authenticated call","count":2}]');
reset role;
do $$
begin
  if (select count from public.subject where subject = 'SQL regression exact') <> 3
     or (select count from public.subject where subject = 'SQL regression exact ') <> 1 then
    raise exception 'duplicate aggregation or exact string identity failed';
  end if;
end;
$$;

do $$
begin
  if (select count from public.subject where subject = 'SQL authenticated call') <> 2 then
    raise exception 'authenticated RPC call failed';
  end if;
end;
$$;

insert into public.subject (subject, count, enabled)
values ('SQL disabled remains disabled', 0, false);
select public.record_subject_candidates('[{"subject":"SQL disabled remains disabled","count":2}]');
do $$
begin
  if (select count from public.subject where subject = 'SQL disabled remains disabled') <> 2
     or (select enabled from public.subject where subject = 'SQL disabled remains disabled') is distinct from false
     or (select count from public.subject where subject = 'SQL regression RLS fixture') <> 37 then
    raise exception 'observation increment changed enabled state or curated count';
  end if;
end;
$$;

do $$
declare
  invalid jsonb;
  before_count bigint;
begin
  select count into before_count from public.subject
    where subject = 'SQL regression exact';
  foreach invalid in array array[
    'null'::jsonb,
    '[{"subject":"valid-before-error","count":1},{"subject":"bad","count":0}]'::jsonb,
    '[{"subject":"bad","count":1.5}]'::jsonb,
    '[{"subject":"bad","count":9223372036854775808}]'::jsonb,
    '[{"subject":"bad","count":1},{}]'::jsonb,
    '[{"subject":"bad","count":1,"other":true}]'::jsonb,
    '[{"subject":"   ","count":1}]'::jsonb,
    '[{"subject":"\t\n","count":1}]'::jsonb,
    '[{"subject":"\u00a0\u2003\ufeff","count":1}]'::jsonb
  ] loop
    begin
      perform public.record_subject_candidates(invalid);
      raise exception 'invalid batch accepted: %', invalid;
    exception when others then
      if sqlerrm like 'invalid batch accepted:%' then raise; end if;
    end;
  end loop;
  if (select count from public.subject where subject = 'SQL regression exact') <> before_count
     or exists (select 1 from public.subject where subject = 'valid-before-error') then
    raise exception 'invalid batch was not atomic';
  end if;
end;
$$;

rollback;
