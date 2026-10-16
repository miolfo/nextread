"use client";

import { Info, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ImportPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    const body = new FormData();
    body.append("file", file);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/import", { method: "POST", body });
      if (!response.ok) throw new Error("Import failed");
      const result: { importId: string } = await response.json();
      router.replace(
        `/app/import?importId=${encodeURIComponent(result.importId)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={submitFile}>
        <Card className="border-dashed">
          <CardHeader className="justify-items-center text-center">
            <Upload
              aria-hidden="true"
              className="mb-2 size-8 text-muted-foreground"
            />
            <CardTitle>Choose a file to import</CardTitle>
            <CardDescription>
              Select a file from your device to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <input
              ref={inputRef}
              hidden
              type="file"
              onChange={(event) =>
                setFile(event.currentTarget.files?.[0] ?? null)
              }
              aria-label="Choose a file"
            />
            <Button type="button" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
            {file && (
              <>
                <span className="text-sm text-muted-foreground">
                  {file.name}
                </span>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Importing…" : "Import file"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </form>
      <Alert>
        <Info aria-hidden="true" />
        <AlertTitle>How to export from Goodreads</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Open Goodreads and go to My Books.</li>
            <li>Select Import and Export.</li>
            <li>Export the library.</li>
            <li>Use the downloaded CSV in Next Read.</li>
          </ol>
          <a
            className="mt-3 inline-block rounded-sm text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="https://www.goodreads.com/review/import"
          >
            Open Goodreads export page
          </a>
        </AlertDescription>
      </Alert>
    </>
  );
}
