import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export async function requireAuthenticatedUser(returnTo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/app/login?${new URLSearchParams({ next: returnTo })}`);
  }

  return user;
}

export async function requireAdminUser(returnTo: string) {
  const user = await requireAuthenticatedUser(returnTo);
  if (user.app_metadata?.is_admin !== true) notFound();
  return user;
}
