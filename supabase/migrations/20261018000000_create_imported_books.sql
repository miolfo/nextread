create table public.imported_books (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  title text,
  author text,
  additional_authors text,
  isbn text,
  my_rating text,
  original_publication_year text,
  date_read text
);

create index imported_books_import_run_id_idx
  on public.imported_books (import_run_id);

alter table public.imported_books enable row level security;

create policy "Users can select their imported books"
  on public.imported_books
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.import_runs
      where public.import_runs.id = public.imported_books.import_run_id
        and public.import_runs.user_id = auth.uid()
    )
  );

create policy "Users can insert their imported books"
  on public.imported_books
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.import_runs
      where public.import_runs.id = public.imported_books.import_run_id
        and public.import_runs.user_id = auth.uid()
    )
  );

create policy "Users can update their imported books"
  on public.imported_books
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.import_runs
      where public.import_runs.id = public.imported_books.import_run_id
        and public.import_runs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.import_runs
      where public.import_runs.id = public.imported_books.import_run_id
        and public.import_runs.user_id = auth.uid()
    )
  );

create policy "Users can delete their imported books"
  on public.imported_books
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.import_runs
      where public.import_runs.id = public.imported_books.import_run_id
        and public.import_runs.user_id = auth.uid()
    )
  );
