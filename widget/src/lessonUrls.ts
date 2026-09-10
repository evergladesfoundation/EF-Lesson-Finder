import type { Lesson } from "./types";

/** Pull a Google Drive file id from uc?id=, open?id=, or /file/d/FILEID/ URLs. */
export function driveFileId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const pathMatch = trimmed.match(/\/file\/d\/([^/?#]+)/);
  if (pathMatch) return pathMatch[1];

  try {
    const parsed = new URL(trimmed);
    const id = parsed.searchParams.get("id");
    if (id) return id;
  } catch {
    const idMatch = trimmed.match(/[?&]id=([^&]+)/);
    if (idMatch) return decodeURIComponent(idMatch[1]);
  }
  return null;
}

/**
 * Href for "View lesson": open the PDF in Drive's viewer.
 * Catalog `pdfUrl` values stay as export=download for the pipeline;
 * this helper rewrites them at click time.
 */
export function lessonPlanViewUrl(lesson: Pick<Lesson, "pdfUrl" | "lessonUrl">): string {
  const pdf = lesson.pdfUrl.trim();
  const folder = lesson.lessonUrl.trim();
  const fileId = driveFileId(pdf);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
  if (folder.startsWith("https://") && !/export=download/i.test(folder)) {
    return folder;
  }
  if (pdf.startsWith("https://") && !/export=download/i.test(pdf)) {
    return pdf;
  }
  if (folder.startsWith("https://")) {
    return folder;
  }
  return "";
}

/** Direct PDF download (`uc?export=download`). Empty when the catalog has no pdfUrl. */
export function lessonPlanDownloadUrl(lesson: Pick<Lesson, "pdfUrl">): string {
  const pdf = lesson.pdfUrl.trim();
  return pdf.startsWith("https://") ? pdf : "";
}

/**
 * Href for "View all lesson materials": the catalog Drive folder.
 * Empty when lessonUrl is missing or is not an https Drive folder URL.
 */
export function lessonMaterialsFolderUrl(lesson: Pick<Lesson, "lessonUrl">): string {
  const folder = lesson.lessonUrl.trim();
  if (!folder.startsWith("https://")) return "";
  if (!/drive\.google\.com\/drive\/folders\//i.test(folder)) return "";
  return folder;
}
