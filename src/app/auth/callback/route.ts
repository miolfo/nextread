import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/supabase/safe-next";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (code) await (await createClient()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(next, request.url));
}
