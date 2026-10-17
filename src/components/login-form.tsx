"use client";

import { useState, type FormEvent } from "react";
import { BookOpen, Mail, Lock, Sprout } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/supabase/safe-next";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (result.error) throw result.error;
      router.replace(safeNextPath(nextPath));
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to authenticate. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7f4ec] px-5 py-12 text-[#263b31]">
      <div className="w-full max-w-md">
        <div className="mb-9 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#e7ebdf]">
            <BookOpen aria-hidden="true" className="size-7" />
          </div>
          <p className="text-lg font-semibold tracking-wide">NEXT READ</p>
          <h1 className="mt-8 text-3xl font-semibold tracking-tight">
            Welcome to your next chapter
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to discover books picked just for you.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 pl-10"
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-[#294a39] text-white hover:bg-[#203b2e]"
          >
            {loading ? "Please wait…" : "Sign in"}
          </Button>
        </form>
        <div
          aria-hidden="true"
          className="mt-12 flex items-end justify-center gap-5 text-[#54715c]"
        >
          <div className="h-14 w-7 rounded-t-sm bg-[#d6b883]" />
          <div className="h-20 w-8 rounded-t-sm bg-[#7b927b]" />
          <div className="h-16 w-7 rounded-t-sm bg-[#c77d59]" />
          <Sprout className="mb-1 size-10" />
        </div>
      </div>
    </main>
  );
}
