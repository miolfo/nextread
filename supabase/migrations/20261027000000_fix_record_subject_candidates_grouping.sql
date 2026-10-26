create or replace function public.record_subject_candidates(p_candidates jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_candidates is null or jsonb_typeof(p_candidates) <> 'array' then
    raise exception 'candidates must be an array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_candidates) as entries(item)
    where jsonb_typeof(item) <> 'object'
       or not (item ? 'subject')
       or not (item ? 'count')
       or item - 'subject' - 'count' <> '{}'::jsonb
       or jsonb_typeof(item->'subject') <> 'string'
       or length(item->>'subject') = 0
       or regexp_replace(
            item->>'subject',
            U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]',
            '', 'g'
          ) = ''
       or jsonb_typeof(item->'count') <> 'number'
       or (item->>'count')::numeric < 1
       or (item->>'count')::numeric <> trunc((item->>'count')::numeric)
       or (item->>'count')::numeric > 9223372036854775807
  ) then
    raise exception 'invalid subject candidate batch';
  end if;

  insert into public.subject_candidate (subject, count)
  select (item->>'subject') collate "C", sum((item->>'count')::numeric)::bigint
  from jsonb_array_elements(p_candidates) as entries(item)
  group by (item->>'subject') collate "C"
  on conflict (subject) do update
    set count = public.subject_candidate.count + excluded.count;
end;
$$;

revoke all on function public.record_subject_candidates(jsonb) from public, anon;
grant execute on function public.record_subject_candidates(jsonb) to authenticated;
