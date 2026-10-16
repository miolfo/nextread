import { Info, Upload } from "lucide-react";
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
  return (
    <>
      <Card className="border-dashed">
        <CardHeader className="justify-items-center text-center">
          <Upload
            aria-hidden="true"
            className="mb-2 size-8 text-muted-foreground"
          />
          <CardTitle>Goodreads CSV file</CardTitle>
          <CardDescription>
            Use your Goodreads library export in CSV format.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button type="button">Choose file</Button>
        </CardContent>
      </Card>
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
