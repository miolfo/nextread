"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/app/login");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
import { useRouter } from "next/navigation";
