from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
LOGO = ROOT / "public" / "MusicInsta_Logo.png"
OUTPUT = ROOT / "output" / "pdf" / "MusicInsta_README.pdf"

PAGE_W, PAGE_H = A4
INK = colors.HexColor("#F8F5FA")
MUTED = colors.HexColor("#B8AFBD")
PINK = colors.HexColor("#EC4899")
PURPLE = colors.HexColor("#9333EA")
VIOLET = colors.HexColor("#5B4CE6")
BG = colors.HexColor("#0A0A0D")
CARD = colors.HexColor("#15131A")
BORDER = colors.HexColor("#302936")
CODE_BG = colors.HexColor("#100D15")
GREEN = colors.HexColor("#5EE6A8")


def register_fonts() -> None:
    font_dir = Path(r"C:\Windows\Fonts")
    candidates = {
        "MusicInsta": "segoeui.ttf",
        "MusicInstaBold": "segoeuib.ttf",
        "MusicInstaSemi": "seguisb.ttf",
        "MusicInstaMono": "consola.ttf",
    }
    for name, filename in candidates.items():
        path = font_dir / filename
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))


register_fonts()


def safe_ascii_punctuation(text: str) -> str:
    return (
        text.replace("—", "-")
        .replace("–", "-")
        .replace("‑", "-")
        .replace("├──", "|--")
        .replace("└──", "`--")
        .replace("│", "|")
        .replace("→", "->")
    )


def inline_markup(text: str) -> str:
    text = safe_ascii_punctuation(text)
    links: dict[str, str] = {}
    codes: dict[str, str] = {}

    def stash_link(match: re.Match[str]) -> str:
        key = f"@@LINK{len(links)}@@"
        label = html.escape(match.group(1))
        url = html.escape(match.group(2), quote=True)
        links[key] = f'<link href="{url}" color="#EC4899"><u>{label}</u></link>'
        return key

    def stash_code(match: re.Match[str]) -> str:
        key = f"@@CODE{len(codes)}@@"
        value = html.escape(match.group(1))
        codes[key] = f'<font name="MusicInstaMono" color="#DFA8FF">{value}</font>'
        return key

    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", stash_link, text)
    text = re.sub(r"`([^`]+)`", stash_code, text)
    text = html.escape(text)
    text = re.sub(r"\*\*([^*]+)\*\*", r'<font name="MusicInstaBold" color="#FFFFFF">\1</font>', text)
    for key, value in {**links, **codes}.items():
        text = text.replace(html.escape(key), value)
    return text


styles = getSampleStyleSheet()
body = ParagraphStyle(
    "Body",
    parent=styles["BodyText"],
    fontName="MusicInsta",
    fontSize=9.6,
    leading=14.6,
    textColor=INK,
    spaceAfter=3.5 * mm,
    allowWidows=0,
    allowOrphans=0,
)
lead = ParagraphStyle(
    "Lead",
    parent=body,
    fontSize=11.4,
    leading=17,
    textColor=colors.HexColor("#F3EAF6"),
    spaceAfter=5 * mm,
)
h2 = ParagraphStyle(
    "H2",
    parent=body,
    fontName="MusicInstaBold",
    fontSize=19,
    leading=23,
    textColor=INK,
    spaceBefore=7 * mm,
    spaceAfter=3 * mm,
    keepWithNext=True,
)
h3 = ParagraphStyle(
    "H3",
    parent=body,
    fontName="MusicInstaSemi",
    fontSize=12.2,
    leading=16,
    textColor=colors.HexColor("#ECA8FF"),
    spaceBefore=3 * mm,
    spaceAfter=2 * mm,
    keepWithNext=True,
)
bullet = ParagraphStyle(
    "Bullet",
    parent=body,
    leftIndent=5 * mm,
    firstLineIndent=-4 * mm,
    bulletIndent=0,
    bulletFontName="MusicInstaBold",
    bulletFontSize=8,
    bulletColor=PINK,
    spaceAfter=2.2 * mm,
)
code_style = ParagraphStyle(
    "Code",
    parent=body,
    fontName="MusicInstaMono",
    fontSize=7.6,
    leading=11.2,
    textColor=colors.HexColor("#EDE5F1"),
    leftIndent=3 * mm,
    rightIndent=3 * mm,
    spaceAfter=0,
)
callout_style = ParagraphStyle(
    "Callout",
    parent=body,
    fontName="MusicInstaSemi",
    fontSize=10.2,
    leading=15,
    textColor=INK,
    spaceAfter=0,
)


class AccentRule(Flowable):
    def __init__(self, width: float = 34 * mm):
        super().__init__()
        self.width = width
        self.height = 2.5 * mm

    def draw(self) -> None:
        self.canv.setStrokeColor(PINK)
        self.canv.setLineWidth(2.2)
        self.canv.line(0, self.height / 2, self.width * 0.62, self.height / 2)
        self.canv.setStrokeColor(PURPLE)
        self.canv.line(self.width * 0.62, self.height / 2, self.width, self.height / 2)


class Cover(Flowable):
    def __init__(self):
        super().__init__()
        self.width = 170 * mm
        self.height = 245 * mm

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        c.setFillColor(PURPLE)
        c.setFillAlpha(0.13)
        c.circle(160 * mm, 225 * mm, 50 * mm, fill=1, stroke=0)
        c.setFillColor(PINK)
        c.setFillAlpha(0.11)
        c.circle(5 * mm, 18 * mm, 70 * mm, fill=1, stroke=0)
        c.setFillAlpha(1)

        logo = Image(str(LOGO), width=31 * mm, height=54.4 * mm)
        logo.drawOn(c, 2 * mm, 184 * mm)

        c.setFillColor(PINK)
        c.setFont("MusicInstaSemi", 10)
        c.drawString(2 * mm, 174 * mm, "PROJECT SUBMISSION GUIDE")

        c.setFillColor(INK)
        c.setFont("MusicInstaBold", 34)
        c.drawString(2 * mm, 147 * mm, "MusicInsta")
        c.setFont("MusicInstaBold", 23)
        c.drawString(2 * mm, 132 * mm, "Project README")

        c.setStrokeColor(PINK)
        c.setLineWidth(3)
        c.line(2 * mm, 121 * mm, 43 * mm, 121 * mm)
        c.setStrokeColor(PURPLE)
        c.line(43 * mm, 121 * mm, 72 * mm, 121 * mm)

        subtitle = Paragraph(
            "A branded guide to the platform, architecture, recommendation engine, local setup and assessment environment.",
            ParagraphStyle("CoverSubtitle", parent=lead, fontSize=13, leading=19, textColor=colors.HexColor("#D9CEDD")),
        )
        subtitle.wrapOn(c, 128 * mm, 50 * mm)
        subtitle.drawOn(c, 2 * mm, 86 * mm)

        c.setFillColor(CARD)
        c.roundRect(2 * mm, 49 * mm, 112 * mm, 22 * mm, 5 * mm, fill=1, stroke=0)
        c.setFillColor(PINK)
        c.setFont("MusicInstaSemi", 9)
        c.drawString(8 * mm, 63 * mm, "RECOMMENDED DEMONSTRATION")
        c.setFillColor(INK)
        c.setFont("MusicInsta", 10)
        c.drawString(8 * mm, 55 * mm, "artist-amp.vercel.app")

        c.setFillColor(MUTED)
        c.setFont("MusicInsta", 9)
        c.drawString(2 * mm, 25 * mm, "Prosper Masuku - Dby Prosper")
        c.drawString(2 * mm, 18 * mm, "Computer Science Honours Research Project")
        c.drawString(2 * mm, 11 * mm, "University of Fort Hare")
        c.restoreState()


class BrandedDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=20 * mm,
            rightMargin=20 * mm,
            topMargin=22 * mm,
            bottomMargin=18 * mm,
            title="MusicInsta Project README",
            author="Prosper Masuku - Dby Prosper",
            subject="MusicInsta project submission and local setup guide",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates(PageTemplate(id="MusicInsta", frames=[frame], onPage=self.decorate_page))

    @staticmethod
    def decorate_page(canvas, doc) -> None:
        canvas.saveState()
        canvas.setFillColor(BG)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        if doc.page > 1:
            canvas.setFillColor(PINK)
            canvas.rect(0, PAGE_H - 3 * mm, PAGE_W * 0.58, 3 * mm, fill=1, stroke=0)
            canvas.setFillColor(PURPLE)
            canvas.rect(PAGE_W * 0.58, PAGE_H - 3 * mm, PAGE_W * 0.42, 3 * mm, fill=1, stroke=0)
            canvas.setFillColor(MUTED)
            canvas.setFont("MusicInstaSemi", 8)
            canvas.drawString(20 * mm, 10 * mm, "MUSICINSTA  /  PROJECT README")
            canvas.setFillColor(PINK)
            canvas.drawRightString(PAGE_W - 20 * mm, 10 * mm, f"{doc.page - 1:02d}")
        canvas.restoreState()


def callout(text: str) -> Table:
    content = Paragraph(inline_markup(text), callout_style)
    table = Table([[content]], colWidths=[165 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#251226")),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#7A275F")),
        ("LINEBEFORE", (0, 0), (0, -1), 4, PINK),
        ("LEFTPADDING", (0, 0), (-1, -1), 7 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 5 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5 * mm),
    ]))
    return table


def code_block(lines: list[str]) -> Table:
    paragraphs = [Paragraph(html.escape(safe_ascii_punctuation(line)) or " ", code_style) for line in lines]
    table = Table([[paragraph] for paragraph in paragraphs], colWidths=[165 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, PURPLE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 0.8 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0.8 * mm),
        ("TOPPADDING", (0, 0), (-1, 0), 3 * mm),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 3 * mm),
    ]))
    return table


def technology_table(rows: list[list[str]]) -> Table:
    data = [[Paragraph(inline_markup(cell), body) for cell in row] for row in rows]
    table = Table(data, colWidths=[45 * mm, 120 * mm], repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3A1235")),
        ("TEXTCOLOR", (0, 0), (-1, 0), INK),
        ("FONTNAME", (0, 0), (-1, 0), "MusicInstaBold"),
        ("BACKGROUND", (0, 1), (-1, -1), CARD),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    return table


def parse_readme(text: str) -> list[Flowable]:
    lines = text.splitlines()
    story: list[Flowable] = [Cover(), PageBreak()]
    paragraph_lines: list[str] = []
    code_lines: list[str] = []
    in_code = False
    table_rows: list[list[str]] = []
    first_body_paragraph = True

    def flush_paragraph() -> None:
        nonlocal paragraph_lines, first_body_paragraph
        if not paragraph_lines:
            return
        text_value = " ".join(line.strip() for line in paragraph_lines)
        story.append(Paragraph(inline_markup(text_value), lead if first_body_paragraph else body))
        first_body_paragraph = False
        paragraph_lines = []

    def flush_table() -> None:
        nonlocal table_rows
        if table_rows:
            story.append(technology_table(table_rows))
            story.append(Spacer(1, 4 * mm))
            table_rows = []

    for raw in lines:
        line = raw.rstrip()
        if line.startswith("```"):
            flush_paragraph()
            if in_code:
                block = code_block(code_lines)
                if story and isinstance(story[-1], Paragraph) and story[-1].style.name in {"Body", "Lead"}:
                    preceding = story.pop()
                    story.append(KeepTogether([preceding, block, Spacer(1, 4 * mm)]))
                else:
                    story.extend([block, Spacer(1, 4 * mm)])
                code_lines = []
            in_code = not in_code
            continue
        if in_code:
            code_lines.append(line)
            continue
        if line.startswith("# "):
            continue
        if line.startswith("## "):
            flush_paragraph()
            flush_table()
            title = safe_ascii_punctuation(line[3:].strip())
            story.extend([Spacer(1, 2 * mm), AccentRule(), Paragraph(html.escape(title), h2)])
            continue
        if line.startswith("### "):
            flush_paragraph()
            flush_table()
            story.append(Paragraph(html.escape(safe_ascii_punctuation(line[4:].strip())), h3))
            continue
        if line.startswith("| "):
            flush_paragraph()
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            if all(re.fullmatch(r":?-+:?", cell.replace(" ", "")) for cell in cells):
                continue
            table_rows.append(cells)
            continue
        flush_table()
        if line.startswith("- "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[2:]), bullet, bulletText="+"))
            continue
        if not line.strip():
            flush_paragraph()
            continue
        paragraph_lines.append(line)

    flush_paragraph()
    flush_table()
    story.append(Spacer(1, 6 * mm))
    story.append(callout("For the fastest assessment experience, open the deployed application at https://artist-amp.vercel.app."))
    return story


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    text = README.read_text(encoding="utf-8")
    doc = BrandedDocTemplate(str(OUTPUT))
    doc.build(parse_readme(text))
    print(OUTPUT)


if __name__ == "__main__":
    main()
