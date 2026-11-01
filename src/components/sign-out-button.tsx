"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      className="cursor-pointer rounded-full border-emerald-900/20 bg-white/70 text-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/app/login");
        router.refresh();
      }}
    >
      <LogOut aria-hidden="true" className="text-red-600" />
      Sign out
    </Button>
  );
}
