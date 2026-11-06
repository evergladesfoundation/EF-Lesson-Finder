#!/usr/bin/env python3
"""Compile Active rows from the Master Lesson Index into widget/src/data/lessons.ts."""

from __future__ import annotations

import json
import re
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

INACTIVE_STATUSES = {"draft", "under review", "retired", "inactive"}

# 6th-12th, 9-12, climate 6-12, and similar published grade bands.
GRADE_RANGE_RE = re.compile(
    r"(?:climate\s+)?(\d{1,2})\s*(?:st|nd|rd|th)?\s*[-–—]\s*(\d{1,2})\s*(?:st|nd|rd|th)?",
    re.I,
)

# Line-leading published codes with descriptions, e.g. "SC.6.E.7.6 - Differentiate..."
STANDARD_LINE_RE = re.compile(
    r"^\s*("
    r"[A-Z]{2,5}(?:\.[A-Za-z0-9]+)+(?:\.[a-z])?"
    r"|[A-Z]{2}-[A-Z]{3}\d+-\d+"
    r")\s*[-–—]",
    re.M,
)


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


def split_standards(raw: object) -> list[str]:
    """Comma-separated codes, or codes extracted from 'CODE - description' lines."""
    if not raw:
        return []
    text = str(raw).replace("\r\n", "\n").replace("\r", "\n")
    lined = [m.group(1) for m in STANDARD_LINE_RE.finditer(text)]
    if lined:
        return unique(lined)
    return unique(split_list(text.replace("\n", ",")))


def parse_int_like(raw: object) -> int | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        return int(raw)
    try:
        return int(float(str(raw).strip()))
    except (TypeError, ValueError):
        return None


def grade_ranges_in(text: str) -> list[tuple[int, int]]:
    found: list[tuple[int, int]] = []
    for match in GRADE_RANGE_RE.finditer(text):
        lo, hi = int(match.group(1)), int(match.group(2))
        if lo > hi:
            lo, hi = hi, lo
        found.append((lo, hi))
    return found


def grade_band(grade_col: object, grade_sort: object) -> tuple[str, int, int]:
    """Map Grade / Grade Sort, including climate 6-12 bands, to a display range and bounds."""
    text = str(grade_col or "").strip()
    lower = text.lower()
    sort_text = str(grade_sort if grade_sort is not None else "").strip()

    ranges = grade_ranges_in(sort_text) + grade_ranges_in(text)
    if ranges:
        lo, hi = max(ranges, key=lambda pair: (pair[1] - pair[0], -pair[0]))
        if lo < 0:
            return "Pre-K", -1, -1
        if lo == 0 and hi == 0:
            return "Kindergarten", 0, 0
        if lo == hi:
            return f"Grade {lo}", lo, hi
        return f"Grades {lo}-{hi}", lo, hi

    sort_n = parse_int_like(grade_sort)
    if sort_n == -1:
        return "Pre-K", -1, -1
    if sort_n == 0:
        return "Kindergarten", 0, 0
    if "middle school" in lower and "high school" in lower:
        return "Grades 6-12", 6, 12
    if "high school" in lower or "9-12" in text:
        return "Grades 9-12", 9, 12
    if sort_n is not None:
        return f"Grade {sort_n}", sort_n, sort_n
    print(f"warning: unparsed grade band grade={grade_col!r} sort={grade_sort!r}; defaulting to 6-12")
    return "Grades 6-12", 6, 12


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


def stem_title_key(key: str) -> str:
    """Drop a trailing 's' so Influence/Influences still join the AP catalog."""
    parts = []
    for token in key.split():
        if len(token) > 3 and token.endswith("s"):
            parts.append(token[:-1])
        else:
            parts.append(token)
    return " ".join(parts)


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


def lookup_ap_units(title: str, by_title: dict[str, list[int]]) -> list[int]:
    key = normalize_title(title)
    if key in by_title:
        return by_title[key]
    stemmed = stem_title_key(key)
    for catalog_key, units in by_title.items():
        if stem_title_key(catalog_key) == stemmed:
            print(f"AP title stem-match: {title!r} → catalog {catalog_key!r}")
            return units
    return []


def titles_for_lesson(
    title: str,
    unit_titles: dict[int, str],
    by_title: dict[str, list[int]],
) -> tuple[list[str], list[int]]:
    numbers = lookup_ap_units(title, by_title)
    names = [unit_titles[n] for n in numbers if n in unit_titles]
    return names, numbers


def header_names(values: list[object]) -> set[str]:
    return {str(v).strip() for v in values if v is not None and str(v).strip()}


def find_header_row(ws) -> tuple[int, list[object]]:
    """Detect the column header row instead of assuming Lesson Index's row 5."""
    for row_n in range(1, min(ws.max_row, 30) + 1):
        values = [cell.value for cell in next(ws.iter_rows(min_row=row_n, max_row=row_n))]
        names = header_names(values)
        if "Title of Lesson" in names and ("Lesson ID" in names or "Grade" in names):
            return row_n, values
    raise SystemExit(f"Could not find a lesson header row on sheet {ws.title!r}")


def is_legend_sheet(name: str) -> bool:
    lower = name.lower()
    return "legend" in lower or "source" in lower


def is_climate_sheet(name: str) -> bool:
    lower = name.lower()
    if is_legend_sheet(name):
        return False
    return "climate" in lower


def lesson_index_sheet(wb) -> object:
    if "Lesson Index" in wb.sheetnames:
        return wb["Lesson Index"]
    for name in wb.sheetnames:
        if not is_legend_sheet(name) and not is_climate_sheet(name):
            return wb[name]
    raise SystemExit("No Lesson Index sheet found")


def climate_sheets(wb) -> list:
    return [wb[name] for name in wb.sheetnames if is_climate_sheet(name)]


def cell(rec: dict, *names: str) -> object:
    for name in names:
        if name in rec:
            return rec.get(name)
    lower = {str(k).strip().lower(): v for k, v in rec.items() if k is not None}
    for name in names:
        if name.lower() in lower:
            return lower[name.lower()]
    return None


def is_active_status(raw: object, *, blank_is_active: bool) -> bool:
    text = str(raw or "").strip()
    if not text:
        return blank_is_active
    if text.lower() in INACTIVE_STATUSES:
        return False
    return text.lower() == "active"


def assign_climate_id(rec: dict, used_ids: set[str], seq: int) -> str:
    existing = str(cell(rec, "Lesson ID") or "").strip()
    if existing:
        return existing
    lesson_no = parse_int_like(cell(rec, "Lesson #"))
    candidates = []
    if lesson_no is not None:
        candidates.append(f"CL.{lesson_no}")
    candidates.append(f"CL.{seq}")
    n = seq
    while True:
        for candidate in candidates:
            if candidate not in used_ids:
                return candidate
        n += 1
        candidates = [f"CL.{n}"]


def record_to_lesson(
    rec: dict,
    *,
    lesson_id: str,
    pdf_meta: dict[str, dict],
    unit_titles: dict[int, str],
    ap_by_title: dict[str, list[int]],
) -> dict | None:
    title = str(cell(rec, "Title of Lesson") or "").strip()
    if not title:
        return None
    extracted = pdf_meta.get(lesson_id, {})
    grade_col = cell(rec, "Grade") or ""
    grade_sort = cell(rec, "Grade Sort")
    grade_range, grade_min, grade_max = grade_band(grade_col, grade_sort)
    theme = str(cell(rec, "Theme / Topic") or "").strip()
    topics = unique(
        split_list(cell(rec, "Topic Tags"))
        + split_list(theme)
        + extracted.get("vocab", [])
        + extracted.get("prekDomains", [])
    )
    standards = split_standards(cell(rec, "Standards (as published)")) or extracted.get(
        "standards", []
    )
    sheet_concepts = str(cell(rec, "Fundamental Concepts") or "").strip()
    concept = (
        concept_label(sheet_concepts)
        if sheet_concepts
        else concept_from_numbers(extracted.get("concepts") or [])
    )
    summary = (
        str(cell(rec, "Summary of Lesson") or "").strip()
        or (extracted.get("summary") or "").strip()
        or fallback_summary(title, grade_range, theme)
    )
    pdf = str(cell(rec, "pdfUrl") or "").strip()
    folder = str(cell(rec, "lessonUrl") or "").strip()
    ap_titles, ap_numbers = titles_for_lesson(title, unit_titles, ap_by_title)
    return {
        "id": lesson_id,
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


def compile_sheet(
    ws,
    *,
    pdf_meta: dict[str, dict],
    unit_titles: dict[int, str],
    ap_by_title: dict[str, list[int]],
    blank_status_active: bool,
    generate_missing_ids: bool,
    used_ids: set[str],
) -> tuple[list[dict], int, int]:
    header_row, headers = find_header_row(ws)
    print(f"{ws.title!r}: header row {header_row}")
    compiled: list[dict] = []
    skipped = 0
    generated = 0
    seq = 1
    for row in ws.iter_rows(min_row=header_row + 1, max_row=ws.max_row, values_only=True):
        rec = dict(zip(headers, row))
        if not any(v is not None and str(v).strip() for v in rec.values()):
            continue
        title = str(cell(rec, "Title of Lesson") or "").strip()
        lesson_id = str(cell(rec, "Lesson ID") or "").strip()
        if not title:
            url = str(cell(rec, "lessonUrl", "pdfUrl") or "").strip()
            if url:
                print(f"  skip {ws.title!r} row with Drive URL but no title: {url}")
            skipped += 1
            continue
        if not is_active_status(cell(rec, "Status"), blank_is_active=blank_status_active):
            skipped += 1
            continue
        if not lesson_id:
            if not generate_missing_ids:
                skipped += 1
                continue
            lesson_id = assign_climate_id(rec, used_ids, seq)
            generated += 1
            print(f"  assigned Lesson ID {lesson_id} to {title!r} (Status blank or Active)")
        seq += 1
        lesson = record_to_lesson(
            rec,
            lesson_id=lesson_id,
            pdf_meta=pdf_meta,
            unit_titles=unit_titles,
            ap_by_title=ap_by_title,
        )
        if not lesson:
            skipped += 1
            continue
        compiled.append(lesson)
        used_ids.add(lesson["id"])
    return compiled, skipped, generated


def merge_lessons(base: list[dict], incoming: list[dict], incoming_source: str) -> list[dict]:
    """Prefer climate-tab rows when Lesson ID or normalized title collides."""
    by_id = {les["id"]: i for i, les in enumerate(base)}
    by_title = {normalize_title(les["title"]): i for i, les in enumerate(base)}
    merged = list(base)
    for les in incoming:
        title_key = normalize_title(les["title"])
        existing_i = by_id.get(les["id"])
        if existing_i is None:
            existing_i = by_title.get(title_key)
        if existing_i is None:
            by_id[les["id"]] = len(merged)
            by_title[title_key] = len(merged)
            merged.append(les)
            continue
        prev = merged[existing_i]
        print(
            f"duplicate lesson {les['id']!r} / {les['title']!r}: "
            f"preferring {incoming_source} over existing {prev['id']!r} {prev['title']!r}"
        )
        merged[existing_i] = les
        by_id.pop(prev["id"], None)
        by_title.pop(normalize_title(prev["title"]), None)
        by_id[les["id"]] = existing_i
        by_title[title_key] = existing_i
    return merged


def write_lessons(lessons: list[dict]) -> None:
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

// Active lessons from data/Everglades_Master_Lesson_Index.xlsx
// (Lesson Index + Climate Lessons tabs). Climate rows with a title and
// blank Status are treated as Active. Overviews/standards fall back to
// lesson PDFs when the sheet is blank. AP unit titles come from
// data/APES_Florida_Everglades_Crosswalk.xlsx (Lesson Catalog wins over
// Unit Crosswalk when both list a lesson). Draft / Under review / Retired
// rows are omitted. lessonUrl is the Google Drive folder; pdfUrl is the
// direct PDF download. Do not invent Drive URLs.
// Regenerate: python3 scripts/extract-pdf-metadata.py && python3 scripts/build-lessons.py
export const LESSONS: Lesson[] = [
"""
    OUT.write_text(header + "\n".join(blocks) + "\n];\n", encoding="utf-8")


def catalog_title_matched(name: str, matched_keys: set[str], matched_stems: set[str]) -> bool:
    key = normalize_title(name)
    if key in SKIP_AP_LESSON_NAMES:
        return True
    return key in matched_keys or stem_title_key(key) in matched_stems


def main() -> None:
    pdf_meta = load_pdf_meta()
    unit_titles, ap_by_title, catalog_names = load_ap_crosswalk()
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    print("sheets:", wb.sheetnames)

    used_ids: set[str] = set()
    index_ws = lesson_index_sheet(wb)
    index_lessons, index_skipped, _ = compile_sheet(
        index_ws,
        pdf_meta=pdf_meta,
        unit_titles=unit_titles,
        ap_by_title=ap_by_title,
        blank_status_active=False,
        generate_missing_ids=False,
        used_ids=used_ids,
    )
    print(f"{index_ws.title!r}: {len(index_lessons)} Active lessons ({index_skipped} skipped)")

    climate_lessons: list[dict] = []
    climate_tab_names: list[str] = []
    for ws in climate_sheets(wb):
        climate_tab_names.append(ws.title)
        rows, skipped, generated = compile_sheet(
            ws,
            pdf_meta=pdf_meta,
            unit_titles=unit_titles,
            ap_by_title=ap_by_title,
            blank_status_active=True,
            generate_missing_ids=True,
            used_ids=used_ids,
        )
        print(
            f"{ws.title!r}: {len(rows)} Active lessons "
            f"({skipped} skipped, {generated} generated ids)"
        )
        climate_lessons.extend(rows)

    if not climate_tab_names:
        print("warning: no climate lessons sheet found")

    lessons = merge_lessons(index_lessons, climate_lessons, "climate tab")
    write_lessons(lessons)
    print(f"Wrote {len(lessons)} lessons to {OUT.relative_to(ROOT)}")

    if climate_lessons:
        print("Climate titles added:")
        for les in climate_lessons:
            ap = ", ".join(les["apUnitTitles"]) or "(no AP match)"
            print(
                f"  - {les['id']}: {les['title']} "
                f"[{les['gradeRange']} {les['gradeMin']}-{les['gradeMax']}] AP: {ap}"
            )

    matched_keys = {normalize_title(les["title"]) for les in lessons}
    matched_stems = {stem_title_key(key) for key in matched_keys}
    unmatched = [
        name for name in catalog_names if not catalog_title_matched(name, matched_keys, matched_stems)
    ]
    mapped = sum(1 for les in lessons if les["apUnitTitles"])
    climate_mapped = [les for les in climate_lessons if les["apUnitTitles"]]
    print(f"Attached AP unit titles to {mapped} of {len(lessons)} lessons")
    print(f"AP-mapped climate lessons: {len(climate_mapped)}")
    if unmatched:
        print(f"Unmatched AP Lesson Catalog titles ({len(unmatched)}):")
        for name in unmatched:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
