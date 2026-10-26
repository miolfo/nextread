-- Run against a disposable database after applying migrations, using psql.
begin;

do $$
begin
  if (select collation_name from information_schema.columns
      where table_schema = 'public' and table_name = 'subject_candidate'
        and column_name = 'subject') <> 'C' then
    raise exception 'subject_candidate.subject must use C collation';
  end if;
  if exists (
    select 1
    from (values ('anon'), ('authenticated')) as roles(role_name)
    cross join (values ('subject_candidate'), ('subject')) as tables(table_name)
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                       ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as privileges(privilege_name)
    where has_table_privilege(roles.role_name,
      format('public.%I', tables.table_name), privileges.privilege_name)
  ) then
    raise exception 'anon or authenticated has direct table privileges';
  end if;
  if not has_function_privilege('authenticated',
       'public.record_subject_candidates(jsonb)', 'EXECUTE')
     or has_function_privilege('anon',
       'public.record_subject_candidates(jsonb)', 'EXECUTE') then
    raise exception 'RPC grants are incorrect';
  end if;
end;
$$;

select public.record_subject_candidates('[{"subject":"SQL regression exact","count":1},{"subject":"SQL regression exact","count":2},{"subject":"SQL regression exact ","count":1}]');
set local role authenticated;
select public.record_subject_candidates('[{"subject":"SQL authenticated call","count":2}]');
reset role;
do $$
begin
  if (select count from public.subject_candidate where subject = 'SQL regression exact') <> 3
     or (select count from public.subject_candidate where subject = 'SQL regression exact ') <> 1 then
    raise exception 'duplicate aggregation or exact string identity failed';
  end if;
end;
$$;

do $$
begin
  if (select count from public.subject_candidate where subject = 'SQL authenticated call') <> 2 then
    raise exception 'authenticated RPC call failed';
  end if;
end;
$$;

do $$
declare
  invalid jsonb;
  before_count bigint;
begin
  select count into before_count from public.subject_candidate
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
  if (select count from public.subject_candidate where subject = 'SQL regression exact') <> before_count
     or exists (select 1 from public.subject_candidate where subject = 'valid-before-error') then
    raise exception 'invalid batch was not atomic';
  end if;
end;
$$;

rollback;
