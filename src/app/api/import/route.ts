import { createClient } from "@/lib/supabase/server";
import { parseGoodreadsCsv } from "@/lib/goodreads-csv";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file !== "object" || !("name" in file)) {
    return Response.json({ error: "A file is required" }, { status: 400 });
  }

  let bookCount: number | null = null;
  try {
    bookCount = parseGoodreadsCsv(await file.text()).length;
  } catch {
    console.warn("Unable to parse uploaded Goodreads CSV.");
  }

  const { data, error } = await supabase
    .from("import_runs")
    .insert({
      user_id: user.id,
      source: "goodreads",
      original_filename: file.name,
      status: "received",
      book_count: bookCount,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Unable to create import run", {
      operation: "insert",
      table: "import_runs",
      code: error?.code,
    });
    return Response.json({ error: "Unable to create import" }, { status: 500 });
  }

  return Response.json({ importId: data.id });
}
