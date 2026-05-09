/**
 * Tiny indirection around `window.location.reload()` so callers can be
 * unit-tested without fighting JSDOM's read-only `location` properties.
 *
 * In production this is a thin wrapper. In tests, mock this module:
 *   jest.mock("@/lib/reloadPage", () => ({ reloadPage: jest.fn() }));
 */
export function reloadPage(): void {
  if (typeof window !== "undefined" && window.location) {
    window.location.reload();
  }
}
