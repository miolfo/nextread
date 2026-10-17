import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
