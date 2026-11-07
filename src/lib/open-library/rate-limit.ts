// Anonymous Open Library access is limited to one request every three seconds.
// This queue coordinates requests only within this Node.js process; it is not
// a deployment-wide/distributed rate limiter.
let nextRequestAt = 0;
let queue: Promise<void> = Promise.resolve();

export async function waitForOpenLibrarySlot(deadline: number): Promise<void> {
  // Tests replace the upstream transport and must not wait on real-time slots.
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") return;
  let release!: () => void;
  const previous = queue;
  queue = new Promise<void>((resolve) => (release = resolve));
  await previous;
  try {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (Date.now() + delay >= deadline) throw new Error("deadline");
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    if (Date.now() >= deadline) throw new Error("deadline");
    nextRequestAt = Date.now() + 3_000;
  } finally {
    release();
  }
}
