import { createClient } from "@/lib/supabase/server";

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
  return Response.json({ importId: "123" });
}
