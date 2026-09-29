#!/usr/bin/env python3
"""把《教材小大题_最终版》里的笔记 PDF 截成样张，并写出静态站目录。"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

import pymupdf

SRC = Path("/Users/gravitymeow/Desktop/教材小大题_最终版")
SITE = Path("/Users/gravitymeow/Desktop/小大题样张站")
PREVIEW = SITE / "preview"
ZOOM = 1.45
JPEG_Q = 62
THUMB_ZOOM = 0.5
THUMB_Q = 55
SKIP = {"彭聃龄_普通心理学_第六版.pdf"}

SUBJECT_ORDER = [
    "综合",
    "社会学",
    "人类学",
    "社会工作",
    "公共管理",
    "公共政策",
    "政治学",
    "管理学",
    "经济学",
    "土地管理",
    "心理学",
    "教育学",
    "研究方法",
    "其他",
]

RULES = [
    ("综合", ["华东理工大学", "828"]),
    ("人类学", ["反景入深林", "黄应贵"]),
    ("社会工作", ["社会工作", "社会政策", "社会保障", "党群"]),
    ("公共政策", ["公共政策", "政策科学", "政策分析"]),
    ("土地管理", ["土地"]),
    ("心理学", ["心理学"]),
    ("教育学", ["教育学", "教育管理"]),
    ("研究方法", ["研究方法", "统计学", "社会统计", "定量", "质的研究", "实证方法", "计算社会科学", "量表", "计算题"]),
    ("经济学", ["经济学", "财政学", "数字经济", "补记"]),
    ("政治学", ["政治学", "政治科学", "政府与政治", "政治制度", "国际关系", "国际政治"]),
    ("社会学", ["社会学", "社区"]),
    ("公共管理", ["公共管理", "公共行政", "行政管理", "行政学", "行政学说"]),
    ("管理学", ["管理学", "管理原理"]),
]


def kind_of(name: str) -> str:
    if name.startswith("小大题TD_"):
        return "TD"
    if name.startswith("小大题专栏_"):
        return "专栏"
    if name.startswith("公式专题_"):
        return "公式专题"
    if name.startswith("计算题_"):
        return "计算题"
    if name.startswith("量表_"):
        return "量表"
    if name.startswith("832补记_"):
        return "补记"
    return "小大题"


def clean_filename(name: str) -> str:
    stem = name[:-4] if name.lower().endswith(".pdf") else name
    stem = re.sub(
        r"^(小大题TD_|小大题专栏_|小大题_|公式专题_|计算题_|量表_|832补记_)",
        "",
        stem,
    )
    return re.sub(r"\s+", "", stem).strip()


def filename_title(filename: str) -> str:
    stem = filename[:-4] if filename.lower().endswith(".pdf") else filename
    for prefix in ("小大题TD_", "小大题专栏_", "小大题_", "公式专题_", "计算题_", "量表_", "832补记_"):
        if stem.startswith(prefix):
            return stem[len(prefix):].strip()
    return stem.strip()


def cover_title(doc: pymupdf.Document, filename: str) -> str:
    lines = [ln.strip() for ln in doc[0].get_text("text").splitlines() if ln.strip()]
    title = ""
    if any("宝藏笔记" in ln for ln in lines):
        out = []
        seen = False
        for ln in lines:
            if "宝藏笔记" in ln:
                seen = True
                continue
            if not seen:
                continue
            if ln in {"小大题"} or ln.startswith("——") or "小红书" in ln or "下午茶" in ln:
                continue
            if ln.startswith("【") or "笔记整理" in ln:
                break
            out.append(ln)
            if len("".join(out)) >= 36 or len(out) >= 2:
                break
        title = re.sub(r"\s+", " ", " ".join(out)).strip(" -—")
    if not (4 <= len(title) <= 80):
        title = clean_filename(filename)
    mark = re.search(r"[①②③④⑤]", filename)
    if mark and mark.group() not in title:
        title = f"{title}{mark.group()}"
    return title


def subject_of(text: str) -> str:
    for subject, keys in RULES:
        if any(k in text for k in keys):
            return subject
    return "其他"


def page_ranges(n: int) -> tuple[list[int], list[int], list[int]]:
    if n <= 0:
        return [], [], []
    front = list(range(1, min(8, n) + 1))
    back = list(range(max(1, n - 4), n + 1))
    if n <= 5:
        mid = list(range(1, n + 1))
    else:
        start = (n - 5) // 2 + 1
        mid = list(range(start, start + 5))
    return front, mid, back


def book_id(filename: str) -> str:
    return hashlib.sha1(filename.encode("utf-8")).hexdigest()[:10]


def selected_pdfs() -> list[Path]:
    files = []
    for path in sorted(SRC.glob("*.pdf")):
        if path.name in SKIP:
            continue
        # 只收「小大题_」开头。TD、专栏、公式专题、计算题、量表、补记不收。
        if path.name.startswith("小大题_"):
            files.append(path)
    return files


def collect() -> list[dict]:
    books = []
    for path in selected_pdfs():
        doc = pymupdf.open(path)
        try:
            n = doc.page_count
            # 华理综合封面往往写到科目代码就停，方向写在文件名里。
            title = filename_title(path.name) if "华东理工大学" in path.name else cover_title(doc, path.name)
            front, mid, back = page_ranges(n)
            books.append(
                {
                    "id": book_id(path.name),
                    "title": title,
                    "file": path.name,
                    "subject": subject_of(title + path.name),
                    "kind": kind_of(path.name),
                    "pages": n,
                    "front": front,
                    "mid": mid,
                    "back": back,
                    "_path": str(path),
                }
            )
        finally:
            doc.close()
    order = {name: i for i, name in enumerate(SUBJECT_ORDER)}
    books.sort(key=lambda b: (order.get(b["subject"], 99), b["title"]))
    return books


def render_book(book: dict) -> str | None:
    src = Path(book["_path"])
    out = PREVIEW / book["id"]
    out.mkdir(parents=True, exist_ok=True)
    needed = []
    for key in ("front", "mid", "back"):
        for page in book[key]:
            if page not in needed:
                needed.append(page)
    try:
        doc = pymupdf.open(src)
    except Exception as exc:
        return f"{src.name}: {exc}"
    try:
        thumb = out / "thumb.jpg"
        if not (thumb.exists() and thumb.stat().st_size > 1500):
            pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(THUMB_ZOOM, THUMB_ZOOM), alpha=False)
            pix.save(str(thumb), jpg_quality=THUMB_Q)
        for page in needed:
            dest = out / f"p{page:03d}.jpg"
            if dest.exists() and dest.stat().st_size > 1500:
                continue
            pix = doc[page - 1].get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), alpha=False)
            pix.save(str(dest), jpg_quality=JPEG_Q)
    except Exception as exc:
        return f"{src.name}: {exc}"
    finally:
        doc.close()
    return None


def drop_unlisted(books: list[dict]) -> int:
    keep = {book["id"] for book in books}
    removed = 0
    if not PREVIEW.exists():
        return 0
    for folder in PREVIEW.iterdir():
        if folder.is_dir() and folder.name not in keep:
            for child in folder.iterdir():
                child.unlink()
            folder.rmdir()
            removed += 1
    return removed


def load_catalog() -> list[dict]:
    text = (SITE / "catalog.js").read_text(encoding="utf-8")
    raw = text.split("window.BOOKS = ", 1)[1].strip()
    if raw.endswith(";"):
        raw = raw[:-1]
    return json.loads(raw)


def write_catalog(books: list[dict]) -> None:
    public = []
    for book in books:
        item = {k: v for k, v in book.items() if k != "_path"}
        public.append(item)
    payload = {
        "generated": "2026-09-27",
        "source": "教材小大题_最终版",
        "note": "",
    }
    text = (
        "window.SITE = "
        + json.dumps(payload, ensure_ascii=False)
        + ";\nwindow.BOOKS = "
        + json.dumps(public, ensure_ascii=False)
        + ";\n"
    )
    (SITE / "catalog.js").write_text(text, encoding="utf-8")


def add_missing() -> int:
    existing = load_catalog()
    known = {book["file"] for book in existing}
    added = [book for book in collect() if book["file"] not in known]
    print(f"add {len(added)}", flush=True)
    errors = []
    for book in added:
        err = render_book(book)
        if err:
            errors.append(err)
            print(f"FAIL {book['file']}: {err}", flush=True)
            continue
        print(f"ok {book['subject']} {book['pages']} {book['title']}", flush=True)
        existing.append({k: v for k, v in book.items() if k != "_path"})
    write_catalog(existing)
    if errors:
        print(f"ERRORS {len(errors)}", flush=True)
        return 1
    print(f"books {len(existing)}", flush=True)
    print("DONE", flush=True)
    return 0


def main() -> int:
    if "--add-missing" in sys.argv:
        return add_missing()
    meta_only = "--meta-only" in sys.argv
    books = collect()
    counts: dict[str, int] = {}
    for book in books:
        counts[book["subject"]] = counts.get(book["subject"], 0) + 1
    print(f"books {len(books)}", flush=True)
    for subject in SUBJECT_ORDER:
        if counts.get(subject):
            print(f"  {subject} {counts[subject]}", flush=True)
    others = [b for b in books if b["subject"] == "其他"]
    for book in others:
        print(f"  OTHER {book['file']} :: {book['title']}", flush=True)
    if meta_only:
        for book in books:
            print(f"{book['subject']}\t{book['kind']}\t{book['pages']}\t{book['title']}", flush=True)
        return 0
    PREVIEW.mkdir(parents=True, exist_ok=True)
    print(f"removed {drop_unlisted(books)}", flush=True)
    errors = []
    for i, book in enumerate(books, 1):
        err = render_book(book)
        if err:
            errors.append(err)
            print(f"FAIL {i}/{len(books)} {err}", flush=True)
        elif i % 5 == 0 or i == len(books):
            print(f"ok {i}/{len(books)} {book['title']}", flush=True)
    write_catalog(books)
    if errors:
        print(f"ERRORS {len(errors)}", flush=True)
        return 1
    print("DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
