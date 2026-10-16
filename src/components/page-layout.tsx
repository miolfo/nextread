import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";

export function PageLayout({
  children,
  narrow = false,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-5 sm:px-6">
          <BookOpen aria-hidden="true" className="size-6" />
          <span className="text-lg font-semibold">Next Read</span>
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
