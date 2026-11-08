alter table public.recommendations
  add column applied_filters jsonb,
  add column subjects_used text[],
  add column import_filename text;

-- Remove the metadata-free entry point so new writes cannot bypass the snapshot.
drop function public.save_recommendations(uuid, jsonb);

create function public.save_recommendations_with_metadata(
  p_import_run_id uuid,
  p_books jsonb,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_import_filename text;
begin
  if v_user_id is null or p_books is null or jsonb_typeof(p_books) <> 'array'
     or p_metadata is null or jsonb_typeof(p_metadata) <> 'object'
     or not (p_metadata ?& array['sort','from_year','to_year','lengths','included_genres','excluded_genres','subjects_used'])
     or p_metadata - 'sort' - 'from_year' - 'to_year' - 'lengths'
        - 'included_genres' - 'excluded_genres' - 'subjects_used' <> '{}'::jsonb
      or jsonb_typeof(p_metadata->'sort') <> 'string'
      or p_metadata->>'sort' not in ('relevance', 'rating', 'random')
     or jsonb_typeof(p_metadata->'lengths') <> 'array'
     or jsonb_typeof(p_metadata->'included_genres') <> 'array'
     or jsonb_typeof(p_metadata->'excluded_genres') <> 'array'
     or jsonb_typeof(p_metadata->'subjects_used') <> 'array'
     or (p_metadata->'from_year' <> 'null'::jsonb and (jsonb_typeof(p_metadata->'from_year') <> 'number' or (p_metadata->>'from_year')::numeric <> trunc((p_metadata->>'from_year')::numeric) or (p_metadata->>'from_year')::integer not between 0 and 2100))
     or (p_metadata->'to_year' <> 'null'::jsonb and (jsonb_typeof(p_metadata->'to_year') <> 'number' or (p_metadata->>'to_year')::numeric <> trunc((p_metadata->>'to_year')::numeric) or (p_metadata->>'to_year')::integer not between 0 and 2100))
     or (p_metadata->'from_year' <> 'null'::jsonb and p_metadata->'to_year' <> 'null'::jsonb and (p_metadata->>'from_year')::integer > (p_metadata->>'to_year')::integer)
      or exists (select 1 from jsonb_array_elements(p_metadata->'lengths') as x(value) where jsonb_typeof(x.value) <> 'string' or x.value #>> '{}' not in ('short','medium','long'))
       or exists (select 1 from jsonb_array_elements(p_metadata->'included_genres') as x(value) where jsonb_typeof(x.value) <> 'string' or x.value #>> '{}' not in ('Science Fiction','Fantasy','Mystery','Thriller','Romance','Historical Fiction','Horror','Adventure','Biography','Autobiography','History','Science','Philosophy','Poetry','Young Adult'))
       or exists (select 1 from jsonb_array_elements(p_metadata->'excluded_genres') as x(value) where jsonb_typeof(x.value) <> 'string' or x.value #>> '{}' not in ('Science Fiction','Fantasy','Mystery','Thriller','Romance','Historical Fiction','Horror','Adventure','Biography','Autobiography','History','Science','Philosophy','Poetry','Young Adult'))
       or exists (
         select 1 from jsonb_array_elements(p_metadata->'included_genres') as included(value)
         join jsonb_array_elements(p_metadata->'excluded_genres') as excluded(value)
           on included.value = excluded.value
       )
      or exists (select 1 from jsonb_array_elements(p_metadata->'subjects_used') as x(value) where jsonb_typeof(x.value) <> 'string' or length(x.value #>> '{}') > 500)
     or jsonb_array_length(p_metadata->'lengths') > 3
     or jsonb_array_length(p_metadata->'included_genres') > 15
     or jsonb_array_length(p_metadata->'excluded_genres') > 15
     or jsonb_array_length(p_metadata->'subjects_used') > 3 then
    raise exception 'invalid recommendation request';
  end if;
  select i.original_filename into v_import_filename from public.import_runs i
  where i.id = p_import_run_id and i.user_id = v_user_id;
  if not found then raise exception 'import unavailable'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_books) with ordinality b(item, ord)
    where jsonb_typeof(item) <> 'object' or not (item ? 'key') or not (item ? 'title')
       or item - 'key' - 'title' - 'author_name' - 'first_publish_year' - 'isbn' - 'cover_i' <> '{}'::jsonb
       or jsonb_typeof(item->'key') <> 'string' or item->>'key' !~ '^/works/OL[0-9]+W$'
       or jsonb_typeof(item->'title') <> 'string' or length(item->>'title') = 0
       or (item ? 'author_name' and jsonb_typeof(item->'author_name') <> 'array')
       or (item ? 'isbn' and jsonb_typeof(item->'isbn') <> 'array')
       or (item ? 'first_publish_year' and jsonb_typeof(item->'first_publish_year') <> 'number')
       or (item ? 'cover_i' and jsonb_typeof(item->'cover_i') <> 'number')
  ) then raise exception 'invalid recommendation books'; end if;
  if (select count(*) from jsonb_array_elements(p_books)) > 10 then
    raise exception 'too many recommendation books';
  end if;
  insert into public.recommendations(user_id, import_run_id, applied_filters, subjects_used, import_filename)
  values (v_user_id, p_import_run_id, p_metadata - 'subjects_used',
          array(select jsonb_array_elements_text(p_metadata->'subjects_used')),
          v_import_filename) returning id into v_id;
  insert into public.recommended_book(recommendation_id, position, key, title, author_name,
                                      first_publish_year, isbn, cover_i)
  select v_id, (b.ord - 1)::integer, item->>'key', item->>'title',
         case when item ? 'author_name' then array(select jsonb_array_elements_text(item->'author_name')) end,
         case when item ? 'first_publish_year' then (item->>'first_publish_year')::integer end,
         case when item ? 'isbn' then array(select jsonb_array_elements_text(item->'isbn')) end,
         case when item ? 'cover_i' then (item->>'cover_i')::integer end
  from jsonb_array_elements(p_books) with ordinality b(item, ord);
  return v_id;
end;
$$;
revoke all on function public.save_recommendations_with_metadata(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_recommendations_with_metadata(uuid, jsonb, jsonb) to authenticated;
