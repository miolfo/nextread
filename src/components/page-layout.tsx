"use client";

import { BookOpen, Layers, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";

export function PageLayout({
  children,
  narrow = false,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-5 sm:px-6">
          <Link
            aria-current={pathname === "/" ? "page" : undefined}
            className="flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            href="/"
          >
            <BookOpen aria-hidden="true" className="size-6 text-emerald-800" />
            <span className="font-serif text-xl font-semibold tracking-tight">
              Next Read
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-x-5 gap-y-3"
          >
            <Link
              aria-current={pathname === "/app/import" ? "page" : undefined}
              className="flex items-center gap-2 rounded-sm text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring aria-[current=page]:text-emerald-900 aria-[current=page]:font-semibold"
              href="/app/import"
            >
              <Upload aria-hidden="true" className="size-4" />
              Import
            </Link>
            <Link
              aria-current={pathname === "/app/history" ? "page" : undefined}
              className="flex items-center gap-2 rounded-sm text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring aria-[current=page]:text-emerald-900 aria-[current=page]:font-semibold"
              href="/app/history"
            >
              <Layers aria-hidden="true" className="size-4" />
              History
            </Link>
            <Link
              aria-current={
                pathname === "/app/recommendations" ? "page" : undefined
              }
              className="flex items-center gap-2 rounded-sm text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring aria-[current=page]:text-emerald-900 aria-[current=page]:font-semibold"
              href="/app/recommendations"
            >
              <BookOpen aria-hidden="true" className="size-4" />
              Recommendations
            </Link>
            {pathname.startsWith("/app/") && (
              <span
                aria-hidden="true"
                className="hidden h-6 w-px bg-border sm:block"
              />
            )}
            {pathname.startsWith("/app/") && <SignOutButton />}
          </nav>
        </div>
      </header>
      <main
        className={`mx-auto space-y-8 px-4 py-10 sm:px-6 sm:py-14 ${narrow ? "max-w-2xl" : "max-w-6xl"}`}
      >
        {children}
      </main>
    </div>
  );
}

export function PageIntroduction({
  title,
  children,
  centered = false,
}: {
  title: string;
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <div
      className={`space-y-3 ${centered ? "mx-auto max-w-4xl text-center" : ""}`}
    >
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p
        className={`text-base leading-relaxed text-muted-foreground ${centered ? "" : "max-w-3xl"}`}
      >
        {children}
      </p>
    </div>
  );
}

export function RecommendationGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-2">{children}</div>
  );
}
