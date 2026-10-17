import { expect, it } from "vitest";
import { parseGoodreadsCsv } from "@/lib/goodreads-csv";

it("selects read books, extracts only requested string fields, and normalizes ISBN", () => {
  const csv = [
    "Title,Author,Additional Authors,ISBN,My Rating,Original Publication Year,Date Read,Exclusive Shelf,Publisher",
    '"We, the Drowned","Carsten Jensen","Charlotte Barslund, Emma Ryder","=""9780151013777""",4.0,2006,2026/10/12,read,Ignored',
    "Unread Book,Some Author,,9780000000000,0,2020,,to-read,Ignored",
  ].join("\n");

  expect(parseGoodreadsCsv(csv)).toEqual([
    {
      Title: "We, the Drowned",
      Author: "Carsten Jensen",
      "Additional Authors": "Charlotte Barslund, Emma Ryder",
      ISBN: "9780151013777",
      "My Rating": "4.0",
      "Original Publication Year": "2006",
      "Date Read": "2026/10/12",
    },
  ]);
});

it("parses escaped quotes in quoted Goodreads fields", () => {
  const csv = [
    "Title,Author,Additional Authors,ISBN,My Rating,Original Publication Year,Date Read,Exclusive Shelf",
    '"The ""Quoted"" Book",Author,"Other, Author","=""123""",5,1999,,read',
  ].join("\n");

  expect(parseGoodreadsCsv(csv)[0]).toMatchObject({
    Title: 'The "Quoted" Book',
    "Additional Authors": "Other, Author",
    ISBN: "123",
  });
});
