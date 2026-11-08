-- Run after the forward migration against Supabase with the authenticated role.
-- These cases are rejected before import ownership is checked, so no fixture rows
-- or recommendation writes are needed.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';

do $$
declare
  v_metadata jsonb;
  v_case text;
begin
  foreach v_case in array array['null sort', 'invalid genre', 'overlapping genres'] loop
    v_metadata := jsonb_build_object(
      'sort', 'relevance',
      'from_year', null,
      'to_year', null,
      'lengths', '[]'::jsonb,
      'included_genres', '[]'::jsonb,
      'excluded_genres', '[]'::jsonb,
      'subjects_used', '[]'::jsonb
    );
    case v_case
      when 'null sort' then
        v_metadata := jsonb_set(v_metadata, '{sort}', 'null'::jsonb);
      when 'invalid genre' then
        v_metadata := jsonb_set(v_metadata, '{included_genres}', '["Not a supported genre"]'::jsonb);
      when 'overlapping genres' then
        v_metadata := jsonb_set(v_metadata, '{included_genres}', '["Fantasy"]'::jsonb);
        v_metadata := jsonb_set(v_metadata, '{excluded_genres}', '["Fantasy"]'::jsonb);
    end case;

    begin
      perform public.save_recommendations_with_metadata(
        '00000000-0000-4000-8000-000000000002', '[]'::jsonb, v_metadata
      );
      raise exception 'expected rejection for %', v_case;
    exception
      when others then
        if sqlerrm <> 'invalid recommendation request' then
          raise;
        end if;
    end;
  end loop;
end;
$$;

rollback;
