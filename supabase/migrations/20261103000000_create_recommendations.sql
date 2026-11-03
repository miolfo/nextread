create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.recommended_book (
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  position integer not null check (position >= 0),
  key text not null check (key ~ '^/works/OL[0-9]+W$'),
  title text not null,
  author_name text[],
  first_publish_year integer,
  isbn text[],
  cover_i integer,
  primary key (recommendation_id, key),
  unique (recommendation_id, position)
);

alter table public.recommendations enable row level security;
alter table public.recommended_book enable row level security;
grant select on public.recommendations, public.recommended_book to authenticated;
revoke all on public.recommendations, public.recommended_book from anon;

create policy "Users can read their recommendation sets"
  on public.recommendations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can read their recommended books"
  on public.recommended_book for select to authenticated
  using (exists (
    select 1 from public.recommendations r
    where r.id = recommendation_id and r.user_id = (select auth.uid())
  ));

create function public.save_recommendations(p_import_run_id uuid, p_books jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null or p_books is null or jsonb_typeof(p_books) <> 'array' then
    raise exception 'invalid recommendation request';
  end if;
  if not exists (select 1 from public.import_runs i
                 where i.id = p_import_run_id and i.user_id = v_user_id) then
    raise exception 'import unavailable';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_books) with ordinality b(item, ord)
    where jsonb_typeof(item) <> 'object'
       or not (item ? 'key') or not (item ? 'title')
       or item - 'key' - 'title' - 'author_name' - 'first_publish_year' - 'isbn' - 'cover_i' <> '{}'::jsonb
       or jsonb_typeof(item->'key') <> 'string'
       or item->>'key' !~ '^/works/OL[0-9]+W$'
       or jsonb_typeof(item->'title') <> 'string'
       or length(item->>'title') = 0
       or (item ? 'author_name' and jsonb_typeof(item->'author_name') <> 'array')
       or (item ? 'isbn' and jsonb_typeof(item->'isbn') <> 'array')
       or (item ? 'first_publish_year' and jsonb_typeof(item->'first_publish_year') <> 'number')
       or (item ? 'cover_i' and jsonb_typeof(item->'cover_i') <> 'number')
  ) then raise exception 'invalid recommendation books'; end if;
  if (select count(*) from jsonb_array_elements(p_books)) > 10 then
    raise exception 'too many recommendation books';
  end if;
  insert into public.recommendations(user_id, import_run_id)
  values (v_user_id, p_import_run_id) returning id into v_id;
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
revoke all on function public.save_recommendations(uuid, jsonb) from public, anon;
grant execute on function public.save_recommendations(uuid, jsonb) to authenticated;
