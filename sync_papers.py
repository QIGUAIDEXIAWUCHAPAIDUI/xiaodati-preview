#!/usr/bin/env python3
"""从本文件夹《网页预测卷板块.xlsx》生成 papers.js，并重画 papers/sample.pdf 的页图。"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
XLSX = ROOT / "网页预测卷板块.xlsx"
PAPER_DIR = ROOT / "papers"
PDF = PAPER_DIR / "sample.pdf"
OUT_JS = ROOT / "papers.js"
sys.path.insert(0, str(ROOT / "pydeps"))
import openpyxl
import pymupdf

ZOOM = 1.45
JPEG_Q = 82


def qty_text(raw) -> str:
    text = str(raw or "").strip().replace("（", "(").replace("）", ")")
    match = re.search(r"(\d+)\s*\(\s*(\d+)\s*\)", text)
    if not match:
        return text
    return f"{match.group(1)} ({match.group(2)})"


def read_groups(path: Path) -> list[dict]:
    book = openpyxl.load_workbook(path, data_only=True)
    sheet = book.active
    groups = []
    current = None
    items = []
    for row in sheet.iter_rows(values_only=True):
        cells = list(row[:3]) + [None, None, None]
        left, title, qty = cells[0], cells[1], cells[2]
        if title == "预测卷" and qty and "余量" in str(qty) and left:
            if current:
                groups.append({"subject": current, "items": items})
            current = str(left).strip()
            items = []
            continue
        if current and title and qty:
            items.append({"title": str(title).strip(), "qty": qty_text(qty)})
    if current:
        groups.append({"subject": current, "items": items})
    book.close()
    return groups


def render_pdf(src: Path) -> None:
    PAPER_DIR.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(src)
    try:
        for index in range(doc.page_count):
            dest = PAPER_DIR / f"p{index + 1:03d}.jpg"
            pix = doc[index].get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), alpha=False)
            pix.save(str(dest), jpg_quality=JPEG_Q)
    finally:
        doc.close()


def main() -> None:
    if not XLSX.exists():
        raise SystemExit(f"缺少表格 {XLSX}")
    if not PDF.exists():
        raise SystemExit(f"缺少样卷 {PDF}")
    groups = read_groups(XLSX)
    render_pdf(PDF)
    payload = {"groups": groups}
    OUT_JS.write_text(
        "window.PAPERS = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print("groups", [(g["subject"], len(g["items"])) for g in groups])
    print("wrote", OUT_JS)


if __name__ == "__main__":
    main()
