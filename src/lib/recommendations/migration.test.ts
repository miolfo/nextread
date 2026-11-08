import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261104000000_save_recommendation_metadata.sql",
  ),
  "utf8",
);
const sqlCases = readFileSync(
  resolve(process.cwd(), "supabase/tests/save_recommendation_metadata.sql"),
  "utf8",
);

describe("recommendation metadata migration", () => {
  it("stores snapshots and books in one ownership-checked transaction", () => {
    expect(migration).toMatch(/add column applied_filters jsonb/i);
    expect(migration).toMatch(/add column subjects_used text\[\]/i);
    expect(migration).toMatch(/add column import_filename text/i);
    expect(migration).toMatch(
      /select i\.original_filename into v_import_filename[\s\S]*where i\.id = p_import_run_id and i\.user_id = v_user_id/i,
    );
    expect(migration).toMatch(
      /insert into public\.recommendations[\s\S]*insert into public\.recommended_book/i,
    );
  });

  it("removes the metadata-free RPC and restricts the replacement grant", () => {
    expect(migration).toMatch(
      /drop function public\.save_recommendations\(uuid, jsonb\)/i,
    );
    expect(migration).toMatch(
      /revoke all on function public\.save_recommendations_with_metadata\(uuid, jsonb, jsonb\) from public, anon/i,
    );
    expect(migration).toMatch(
      /grant execute on function public\.save_recommendations_with_metadata\(uuid, jsonb, jsonb\) to authenticated/i,
    );
    expect(migration).toMatch(/set search_path = ''/i);
  });

  it("rejects null sort, unsupported display labels, and overlapping genres", () => {
    expect(migration).toMatch(
      /jsonb_typeof\(p_metadata->'sort'\) <> 'string'[\s\S]*p_metadata->>'sort' not in/i,
    );
    expect(migration).toMatch(
      /'Science Fiction'[\s\S]*'Fantasy'[\s\S]*'Young Adult'/,
    );
    expect(migration).toMatch(
      /jsonb_array_elements\(p_metadata->'included_genres'\)[\s\S]*join jsonb_array_elements\(p_metadata->'excluded_genres'\)[\s\S]*included\.value = excluded\.value/i,
    );
    expect(sqlCases).toContain("'null sort'");
    expect(sqlCases).toContain("'invalid genre'");
    expect(sqlCases).toContain("'overlapping genres'");
  });
});
