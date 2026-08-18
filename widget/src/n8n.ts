import type { ChatReply, Lesson } from "./types";

export const N8N_SEARCH_URL =
  (import.meta.env.VITE_N8N_SEARCH_URL as string | undefined) ||
  "https://evergladesfoundation.app.n8n.cloud/webhook/lesson-finder-search";

const FETCH_MS = 8000;

function isLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<Lesson>;
  return typeof row.id === "string" && typeof row.title === "string";
}

function isChatReply(value: unknown): value is ChatReply & {
  catalogReady?: boolean;
  source?: string;
} {
  if (!value || typeof value !== "object") return false;
  const row = value as { text?: unknown; lessons?: unknown };
  return typeof row.text === "string" && Array.isArray(row.lessons);
}

export async function searchLessonsViaN8n(query: string): Promise<ChatReply | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(N8N_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isChatReply(data)) return null;
    if (data.catalogReady === false) return null;
    return {
      text: data.text,
      lessons: data.lessons.filter(isLesson),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
