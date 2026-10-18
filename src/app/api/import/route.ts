import { createClient } from "@/lib/supabase/server";
import { parseGoodreadsCsv, type GoodreadsBook } from "@/lib/goodreads-csv";

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

  let books: GoodreadsBook[] | null = null;
  try {
    books = parseGoodreadsCsv(await file.text());
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
      book_count: books?.length ?? null,
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

  if (books) {
    const { error: booksError } = await supabase.from("imported_books").insert(
      books.map((book) => ({
        import_run_id: data.id,
        title: book.Title,
        author: book.Author,
        additional_authors: book["Additional Authors"],
        isbn: book.ISBN,
        isbn13: book.ISBN13,
        my_rating: book["My Rating"],
        original_publication_year: book["Original Publication Year"],
        date_read: book["Date Read"],
      })),
    );

    if (booksError) {
      console.error("Unable to insert imported books", {
        operation: "insert",
        table: "imported_books",
        code: booksError.code,
      });
      const { error: cleanupError } = await supabase
        .from("import_runs")
        .delete()
        .eq("id", data.id);
      if (cleanupError) {
        console.error("Unable to clean up import run", {
          operation: "delete",
          table: "import_runs",
          code: cleanupError.code,
        });
      }
      return Response.json(
        { error: "Unable to create import" },
        { status: 500 },
      );
    }
  }

  return Response.json({ importId: data.id });
}
