export const HOST_ID = "everglades-lesson-finder-host";
export const TAG_NAME = "everglades-lesson-finder";
export const SCRIPT_SELECTOR = "script[data-elf-widget], script[src*='widget.js']";

export type EmbedMode = "float" | "inline";

/**
 * Resolve the CDN origin for sibling assets (lesson-plan-demo.html).
 * Captured at module evaluation so it still works after Wix rewrites the DOM
 * and after document.currentScript becomes null (async / Custom Code inject).
 */
export function resolveAssetBase(): URL {
  const current = document.currentScript as HTMLScriptElement | null;
  if (current?.src) return new URL(".", current.src);

  const marked = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
  if (marked?.src) return new URL(".", marked.src);

  return new URL("./", location.href);
}

export const ASSET_BASE = resolveAssetBase();

export function isEmbeddedFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function requestedMode(): EmbedMode | null {
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
  const value = script?.dataset.elfMode?.toLowerCase();
  if (value === "inline" || value === "float") return value;
  return null;
}

export function detectMode(): EmbedMode {
  return requestedMode() ?? (isEmbeddedFrame() ? "inline" : "float");
}

export function shouldAutoMountFloat(): boolean {
  if (detectMode() === "inline") return false;
  if (document.querySelector(TAG_NAME)) return false;
  return true;
}

export function demoLessonUrl(title: string): string {
  const url = new URL("lesson-plan-demo.html", ASSET_BASE);
  url.searchParams.set("title", title);
  return url.toString();
}
