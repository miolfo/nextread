import { createClient } from "@/lib/supabase/server";
import { parseGoodreadsCsv } from "@/lib/goodreads-csv";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.formData();
  const file = data.get("file");

  if (!file || typeof file !== "object" || !("name" in file)) {
    return Response.json({ error: "A file is required" }, { status: 400 });
  }

  console.info(`Received import file: ${file.name}`);
  try {
    const books = parseGoodreadsCsv(await file.text());
    books.forEach((book) => console.info("Parsed Goodreads book:", book));
  } catch {
    console.warn("Unable to parse uploaded Goodreads CSV.");
  }
  return Response.json({ importId: "123" });
}
