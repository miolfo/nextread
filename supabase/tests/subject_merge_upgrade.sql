-- Run with psql against a disposable database after migrations through
-- 20261028000000. This exercises the merge and corrective RPC upgrade.
begin;

insert into public.subject (subject, enabled)
values
  ('SQL merge fixture overlap false', false),
  ('SQL merge fixture overlap true', true),
  ('SQL merge fixture subject only', false);

insert into public.subject_candidate (subject, count)
values
  ('SQL merge fixture candidate only', 7),
  ('SQL merge fixture overlap false', 11),
  ('SQL merge fixture overlap true', 13);

\ir ../migrations/20261101000000_merge_subject_candidates.sql
do $$
begin
  if (select count from public.subject where subject = 'SQL merge fixture candidate only') <> 7
     or (select enabled from public.subject where subject = 'SQL merge fixture candidate only') is distinct from true then
    raise exception 'candidate-only subject/count/default enabled migration failed';
  end if;
  if (select count from public.subject where subject = 'SQL merge fixture subject only') <> 0
     or (select enabled from public.subject where subject = 'SQL merge fixture subject only') is distinct from false then
    raise exception 'subject-only zero count/enabled preservation migration failed';
  end if;
  if (select count from public.subject where subject = 'SQL merge fixture overlap false') <> 11
     or (select enabled from public.subject where subject = 'SQL merge fixture overlap false') is distinct from false
     or (select count from public.subject where subject = 'SQL merge fixture overlap true') <> 13
     or (select enabled from public.subject where subject = 'SQL merge fixture overlap true') is distinct from true then
    raise exception 'overlapping counts or enabled preservation migration failed';
  end if;
  if to_regclass('public.subject_candidate') is not null then
    raise exception 'legacy subject_candidate table was not removed';
  end if;
end;
$$;

\ir ../migrations/20261102000000_fix_record_subject_candidates_collation.sql

select public.record_subject_candidates('[{"subject":"SQL merge fixture overlap false","count":3},{"subject":"SQL merge fixture exact","count":2},{"subject":"SQL merge fixture exact","count":4}]');

do $$
begin
  if (select count from public.subject where subject = 'SQL merge fixture overlap false') <> 14
     or (select enabled from public.subject where subject = 'SQL merge fixture overlap false') is distinct from false
     or (select count from public.subject where subject = 'SQL merge fixture exact') <> 6 then
    raise exception 'corrected RPC did not aggregate exact strings, update count, or preserve enabled status';
  end if;
end;
$$;

rollback;
