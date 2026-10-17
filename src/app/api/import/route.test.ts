import { expect, it, vi } from "vitest";
import { POST } from "@/app/api/import/route";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

it("parses and logs read books and returns the mock import id", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const form = new FormData();
  form.append(
    "file",
    new Blob([
      [
        "Title,Author,Additional Authors,ISBN,My Rating,Original Publication Year,Date Read,Exclusive Shelf",
        '"A, Book",Author,"Another, Author","=""978123""",4,2001,2024/01/01,read',
        "Unread,Author,,123,0,2000,,to-read",
      ].join("\n"),
    ]),
    "books.csv",
  );
  const response = await POST({ formData: async () => form } as Request);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ importId: "123" });
  expect(info).toHaveBeenCalledWith("Received import file: books.csv");
  expect(info).toHaveBeenCalledWith("Parsed Goodreads book:", {
    Title: "A, Book",
    Author: "Author",
    "Additional Authors": "Another, Author",
    ISBN: "978123",
    "My Rating": "4",
    "Original Publication Year": "2001",
    "Date Read": "2024/01/01",
  });
  expect(info).toHaveBeenCalledTimes(2);
  info.mockRestore();
});

it("returns the mock import id when the CSV is malformed", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const form = new FormData();
  form.append(
    "file",
    new Blob(['Title,Author\n"Unclosed title,Author']),
    "books.csv",
  );

  const response = await POST({ formData: async () => form } as Request);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ importId: "123" });
  expect(warn).toHaveBeenCalledWith("Unable to parse uploaded Goodreads CSV.");
  warn.mockRestore();
});

it("rejects requests without a file", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  const response = await POST({
    formData: async () => new FormData(),
  } as Request);
  expect(response.status).toBe(400);
});

it("returns 401 before reading or logging an unauthenticated upload", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const formData = vi.fn();
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const response = await POST({ formData } as unknown as Request);
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "Unauthorized" });
  expect(formData).not.toHaveBeenCalled();
  expect(info).not.toHaveBeenCalled();
  info.mockRestore();
});
