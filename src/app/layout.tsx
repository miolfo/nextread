import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Read",
  description:
    "Find your next book based on your Goodreads reading history, ratings, and reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
