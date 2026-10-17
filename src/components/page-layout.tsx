"use client";

import { BookOpen } from "lucide-react";
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
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
          <Link
            aria-current={pathname === "/" ? "page" : undefined}
            className="flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            href="/"
          >
            <BookOpen aria-hidden="true" className="size-6" />
            <span className="text-lg font-semibold">Next Read</span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex flex-wrap gap-x-5 gap-y-2"
          >
            <Link
              aria-current={pathname === "/app/import" ? "page" : undefined}
              className="rounded-sm text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring aria-[current=page]:text-foreground"
              href="/app/import"
            >
              Import
            </Link>
            <Link
              aria-current={pathname === "/app/imports" ? "page" : undefined}
              className="rounded-sm text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring aria-[current=page]:text-foreground"
              href="/app/imports"
            >
              Import history
            </Link>
            <Link
              aria-current={
                pathname === "/app/recommendations" ? "page" : undefined
              }
              className="rounded-sm text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring aria-[current=page]:text-foreground"
              href="/app/recommendations"
            >
              Recommendations
            </Link>
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
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
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
