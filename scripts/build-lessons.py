#!/usr/bin/env python3
"""Compile Active rows from the Master Lesson Index into widget/src/data/lessons.ts."""

from __future__ import annotations

import json
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "data" / "Everglades_Master_Lesson_Index.xlsx"
APES_XLSX = ROOT / "data" / "APES_Florida_Everglades_Crosswalk.xlsx"
PDF_META = ROOT / "data" / "pdf-metadata.json"
OUT = ROOT / "widget" / "src" / "data" / "lessons.ts"

# Catalog/unit-sheet names that are series labels, not a single lesson title.
SKIP_AP_LESSON_NAMES = {"water quality 101 series"}

CONCEPTS = {
    1: "The Everglades is unique and valuable.",
    2: "The Everglades is defined and connected by water.",
    3: "The Everglades is shaped by southern Florida's geology and geography.",
    4: "The Everglades influences and is influenced by weather and climate.",
    5: "The Everglades supports and is connected by a great diversity of life and ecosystems.",
    6: "The Everglades has experienced many changes over time and is endangered.",
    7: "The Everglades and people are inextricably interconnected.",
}


def split_list(raw: object) -> list[str]:
    if not raw:
        return []
    parts = []
    for piece in str(raw).split(","):
        item = " ".join(piece.split())
        if item:
            parts.append(item)
    return parts


def unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def grade_band(grade_col: str, grade_sort: int) -> tuple[str, int, int]:
    text = grade_col or ""
    if grade_sort == -1:
        return "Pre-K", -1, -1
    if grade_sort == 0:
        return "Kindergarten", 0, 0
    if "high school" in text.lower() or "9-12" in text:
        return "Grades 9-12", 9, 12
    return f"Grade {grade_sort}", grade_sort, grade_sort


def concept_label(raw: object) -> str:
    if not raw:
        return ""
    names: list[str] = []
    for piece in str(raw).split(","):
        piece = piece.strip()
        if not piece:
            continue
        try:
            names.append(CONCEPTS[int(piece)])
        except (TypeError, ValueError, KeyError):
            names.append(piece)
    return " ".join(names)


def fallback_summary(title: str, grade_range: str, theme: str) -> str:
    unit = f" from the {theme} unit" if theme else ""
    return (
        f"{title} — a {grade_range} lesson{unit} in the Everglades Literacy Teacher Toolkit."
    )


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def js_string_array(values: list[str]) -> str:
    if not values:
        return "[]"
    inner = ", ".join(js_string(v) for v in values)
    return f"[{inner}]"


def load_pdf_meta() -> dict[str, dict]:
    if not PDF_META.exists():
        return {}
    rows = json.loads(PDF_META.read_text(encoding="utf-8"))
    return {row["id"]: row for row in rows}


def concept_from_numbers(nums: list[int]) -> str:
    return " ".join(CONCEPTS[n] for n in nums if n in CONCEPTS)


def normalize_title(raw: object) -> str:
    text = str(raw or "")
    trans = str.maketrans(
        {
            "\u2018": "'",
            "\u2019": "'",
            "\u201c": '"',
            "\u201d": '"',
            "\u2013": "-",
            "\u2014": "-",
        }
    )
    text = text.translate(trans).lower().replace("'", "")
    cleaned = []
    for ch in text:
        cleaned.append(ch if ch.isalnum() else " ")
    return " ".join("".join(cleaned).split())


def parse_unit_numbers(raw: object) -> list[int]:
    if raw is None or raw == "":
        return []
    if isinstance(raw, bool):
        return []
    if isinstance(raw, int):
        return [raw]
    if isinstance(raw, float):
        return [int(raw)]
    nums: list[int] = []
    seen: set[int] = set()
    for piece in str(raw).replace(";", ",").split(","):
        piece = piece.strip()
        if not piece:
            continue
        try:
            value = int(float(piece))
        except ValueError:
            continue
        if value not in seen:
            seen.add(value)
            nums.append(value)
    return nums


def split_lesson_names(raw: object) -> list[str]:
    if not raw:
        return []
    names: list[str] = []
    for piece in str(raw).split(";"):
        name = " ".join(piece.split())
        if name:
            names.append(name)
    return names


def sheet_records(ws) -> list[dict]:
    rows = ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True)
    headers = [c for c in next(rows)]
    records: list[dict] = []
    for row in rows:
        rec = dict(zip(headers, row))
        if any(v is not None and str(v).strip() for v in rec.values()):
            records.append(rec)
    return records


def load_ap_crosswalk() -> tuple[dict[int, str], dict[str, list[int]], list[str]]:
    """Return unit titles, normalized-title → unit numbers, and unmatched catalog names."""
    if not APES_XLSX.exists():
        print(f"warning: {APES_XLSX.name} missing; apUnitTitles will be empty")
        return {}, {}, []

    wb = openpyxl.load_workbook(APES_XLSX, data_only=True)
    unit_titles: dict[int, str] = {}
    by_title: dict[str, list[int]] = {}

    for rec in sheet_records(wb["Unit Crosswalk"]):
        unit = parse_unit_numbers(rec.get("AP Unit"))
        title = str(rec.get("AP Unit Title") or "").strip()
        if not unit or not title:
            continue
        unit_n = unit[0]
        unit_titles[unit_n] = title
        for name in split_lesson_names(rec.get("Everglades Literacy Lesson(s)")):
            key = normalize_title(name)
            if not key or key in SKIP_AP_LESSON_NAMES:
                continue
            existing = by_title.setdefault(key, [])
            if unit_n not in existing:
                existing.append(unit_n)

    catalog_names: list[str] = []
    for rec in sheet_records(wb["Lesson Catalog"]):
        name = str(rec.get("Lesson") or "").strip()
        if not name:
            continue
        catalog_names.append(name)
        key = normalize_title(name)
        if not key or key in SKIP_AP_LESSON_NAMES:
            continue
        units = parse_unit_numbers(rec.get("Best-Fit AP Unit(s)"))
        if units:
            by_title[key] = units

    return unit_titles, by_title, catalog_names


def titles_for_lesson(
    title: str,
    unit_titles: dict[int, str],
    by_title: dict[str, list[int]],
) -> tuple[list[str], list[int]]:
    numbers = by_title.get(normalize_title(title), [])
    names = [unit_titles[n] for n in numbers if n in unit_titles]
    return names, numbers


def main() -> None:
    pdf_meta = load_pdf_meta()
    unit_titles, ap_by_title, catalog_names = load_ap_crosswalk()
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["Lesson Index"]
    headers = [c.value for c in next(ws.iter_rows(min_row=5, max_row=5))]

    lessons: list[dict] = []
    for row in ws.iter_rows(min_row=6, max_row=ws.max_row, values_only=True):
        rec = dict(zip(headers, row))
        if not rec.get("Lesson ID"):
            continue
        if rec.get("Status") != "Active":
            continue

        lesson_id = str(rec["Lesson ID"])
        extracted = pdf_meta.get(lesson_id, {})
        grade_sort = int(rec["Grade Sort"])
        grade_col = rec.get("Grade") or ""
        grade_range, grade_min, grade_max = grade_band(grade_col, grade_sort)
        theme = (rec.get("Theme / Topic") or "").strip()
        title = str(rec["Title of Lesson"]).strip()
        topics = unique(
            split_list(rec.get("Topic Tags"))
            + split_list(theme)
            + extracted.get("vocab", [])
            + extracted.get("prekDomains", [])
        )
        standards = split_list(rec.get("Standards (as published)")) or extracted.get(
            "standards", []
        )
        sheet_concepts = (rec.get("Fundamental Concepts") or "").strip()
        concept = (
            concept_label(sheet_concepts)
            if sheet_concepts
            else concept_from_numbers(extracted.get("concepts") or [])
        )
        summary = (
            (rec.get("Summary of Lesson") or "").strip()
            or (extracted.get("summary") or "").strip()
            or fallback_summary(title, grade_range, theme)
        )
        pdf = (rec.get("pdfUrl") or "").strip()
        folder = (rec.get("lessonUrl") or "").strip()
        ap_titles, ap_numbers = titles_for_lesson(title, unit_titles, ap_by_title)

        lessons.append(
            {
                "id": str(rec["Lesson ID"]),
                "title": title,
                "gradeRange": grade_range,
                "gradeMin": grade_min,
                "gradeMax": grade_max,
                "topics": topics,
                "ngsssStandards": standards,
                "apUnitTitles": ap_titles,
                "apUnitNumbers": ap_numbers,
                "fundamentalConcept": concept,
                "summary": summary,
                "lessonUrl": folder,
                "pdfUrl": pdf,
            }
        )

    blocks = []
    for les in lessons:
        blocks.append(
            "\n".join(
                [
                    "  {",
                    f"    id: {js_string(les['id'])},",
                    f"    title: {js_string(les['title'])},",
                    f"    gradeRange: {js_string(les['gradeRange'])},",
                    f"    gradeMin: {les['gradeMin']},",
                    f"    gradeMax: {les['gradeMax']},",
                    f"    topics: {js_string_array(les['topics'])},",
                    f"    ngsssStandards: {js_string_array(les['ngsssStandards'])},",
                    f"    apUnitTitles: {js_string_array(les['apUnitTitles'])},",
                    f"    apUnitNumbers: {les['apUnitNumbers']},",
                    f"    fundamentalConcept: {js_string(les['fundamentalConcept'])},",
                    f"    summary: {js_string(les['summary'])},",
                    f"    lessonUrl: {js_string(les['lessonUrl'])},",
                    f"    pdfUrl: {js_string(les['pdfUrl'])},",
                    "  },",
                ]
            )
        )

    header = """import type { Lesson } from "../types";

// Active lessons from data/Everglades_Master_Lesson_Index.xlsx,
// with overviews/standards filled from the lesson PDFs when the sheet is blank.
// AP unit titles come from data/APES_Florida_Everglades_Crosswalk.xlsx
// (Lesson Catalog wins over Unit Crosswalk when both list a lesson).
// Draft / Under review rows are omitted (Legend: only Active is served).
// lessonUrl is the Google Drive folder; pdfUrl is the direct PDF download.
// Regenerate: python3 scripts/extract-pdf-metadata.py && python3 scripts/build-lessons.py
export const LESSONS: Lesson[] = [
"""
    OUT.write_text(header + "\n".join(blocks) + "\n];\n", encoding="utf-8")
    print(f"Wrote {len(lessons)} lessons to {OUT.relative_to(ROOT)}")

    matched_keys = {normalize_title(les["title"]) for les in lessons}
    unmatched = [
        name
        for name in catalog_names
        if normalize_title(name) not in SKIP_AP_LESSON_NAMES
        and normalize_title(name) not in matched_keys
    ]
    mapped = sum(1 for les in lessons if les["apUnitTitles"])
    print(f"Attached AP unit titles to {mapped} of {len(lessons)} lessons")
    if unmatched:
        print(f"Unmatched AP Lesson Catalog titles ({len(unmatched)}):")
        for name in unmatched:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
