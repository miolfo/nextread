import { LoginForm } from "@/components/login-form";
import { safeNextPath } from "@/lib/supabase/safe-next";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <LoginForm nextPath={safeNextPath(next)} />;
}
