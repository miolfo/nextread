grant select on public.subject_candidate to authenticated;

create policy "Admins can read subject candidates"
on public.subject_candidate
for select
to authenticated
using ((auth.jwt()->'app_metadata'->'is_admin') = 'true'::jsonb);
