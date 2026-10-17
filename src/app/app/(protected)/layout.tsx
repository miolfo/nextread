import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAuthenticatedUser("/app/import");

  return children;
}
