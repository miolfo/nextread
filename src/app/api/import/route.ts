export async function POST(request: Request) {
  const data = await request.formData();
  const file = data.get("file");

  if (!file || typeof file !== "object" || !("name" in file)) {
    return Response.json({ error: "A file is required" }, { status: 400 });
  }

  console.info(`Received import file: ${file.name}`);
  return Response.json({ importId: "123" });
}
