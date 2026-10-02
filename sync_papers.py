#!/usr/bin/env python3
"""从桌面《网页预测卷板块.xlsx》生成 papers.js，并放入样卷 PDF 的三页图。"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DESKTOP = Path("/Users/gravitymeow/Desktop")
XLSX_SRC = DESKTOP / "网页预测卷板块.xlsx"
PDF_SRC = DESKTOP / "预测卷网页呈现.pdf"
XLSX_COPY = ROOT / "网页预测卷板块.xlsx"
PAPER_DIR = ROOT / "papers"
PDF_COPY = PAPER_DIR / "sample.pdf"
OUT_JS = ROOT / "papers.js"
sys.path.insert(0, str(DESKTOP / "小大题反馈收录" / "pydeps"))
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
    shutil.copy2(src, PDF_COPY)
    doc = pymupdf.open(src)
    try:
        for index in range(doc.page_count):
            dest = PAPER_DIR / f"p{index + 1:03d}.jpg"
            pix = doc[index].get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), alpha=False)
            pix.save(str(dest), jpg_quality=JPEG_Q)
    finally:
        doc.close()


def main() -> None:
    if not XLSX_SRC.exists():
        raise SystemExit(f"缺少表格 {XLSX_SRC}")
    if not PDF_SRC.exists():
        raise SystemExit(f"缺少样卷 {PDF_SRC}")
    shutil.copy2(XLSX_SRC, XLSX_COPY)
    groups = read_groups(XLSX_SRC)
    render_pdf(PDF_SRC)
    payload = {"groups": groups}
    OUT_JS.write_text(
        "window.PAPERS = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print("groups", [(g["subject"], len(g["items"])) for g in groups])
    print("wrote", OUT_JS)


if __name__ == "__main__":
    main()
