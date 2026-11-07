import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type RecommendationRun = {
  id: string;
  created_at: string;
  original_filename: string | null;
};

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RecommendationHistory({
  recommendations = [],
  error = false,
}: {
  recommendations?: RecommendationRun[];
  error?: boolean;
}) {
  return (
    <section
      className="space-y-4"
      aria-labelledby="recommendation-history-heading"
    >
      <div>
        <h2
          id="recommendation-history-heading"
          className="text-2xl font-semibold tracking-tight"
        >
          Recommendation history
        </h2>
        <p className="text-sm text-muted-foreground">
          Your saved recommendation generations, newest first.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-muted-foreground">
          We couldn’t load your recommendation history. Please try again.
        </p>
      ) : recommendations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No recommendation history yet
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  File name
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Date
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-medium whitespace-nowrap"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recommendations.map(({ id, created_at, original_filename }) => (
                <tr key={id}>
                  <th scope="row" className="px-4 py-4 font-medium">
                    {original_filename || "Filename unavailable"}
                  </th>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatCreatedAt(created_at)}
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <Button
                      nativeButton={false}
                      role="link"
                      render={
                        <Link
                          href={`/app/recommendations?recommendationId=${encodeURIComponent(id)}`}
                        />
                      }
                      variant="outline"
                      size="sm"
                    >
                      View details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
