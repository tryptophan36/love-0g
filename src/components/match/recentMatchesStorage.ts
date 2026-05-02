const STORAGE_KEY = "love0g-recent-matches";

export type RecentMatch = { id: string; at: number };

const MAX = 12;

export function loadRecentMatches(): RecentMatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RecentMatch =>
          x &&
          typeof x === "object" &&
          "id" in x &&
          typeof (x as RecentMatch).id === "string"
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function rememberMatch(id: string) {
  if (typeof window === "undefined" || !id) return;
  const next = loadRecentMatches().filter((m) => m.id !== id);
  next.unshift({ id, at: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX)));
}
