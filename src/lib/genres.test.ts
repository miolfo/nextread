import { describe, expect, it } from "vitest";
import { GENRE_SUBJECTS } from "@/lib/genres";

describe("verified genre subject mapping", () => {
  it("contains the complete approved label-to-key set", () => {
    expect(GENRE_SUBJECTS).toEqual({
      "Science Fiction": "science_fiction",
      Fantasy: "fantasy",
      Mystery: "mystery",
      Thriller: "thriller",
      Romance: "romance",
      "Historical Fiction": "historical_fiction",
      Horror: "horror",
      Adventure: "adventure",
      Biography: "biography",
      Autobiography: "autobiography",
      History: "history",
      Science: "science",
      Philosophy: "philosophy",
      Poetry: "poetry",
      "Young Adult": "young_adult",
    });
  });
});
