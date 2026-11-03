#!/usr/bin/env python3
"""Convert whiteboard notes about Al-Ihsan into a clear Arabic PDF."""

from pathlib import Path

import arabic_reshaper
from bidi.algorithm import get_display
from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "تعريف_ومظاهر_الإحسان.pdf"
OUT_LATIN = ROOT / "output" / "taareef_wa_mathahir_alihsan.pdf"

FONT_REG = "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf"

TITLE = "تعريف الإحسان ومظاهره"

DEFINITION_HEADING = "تعريف الإحسان"
# Keep sentences separate so BiDi does not reverse their order.
DEFINITION_SENTENCES = [
    "هو مظهر من مظاهر العبادات التي تقرّب الإنسان من خالقه.",
    "وهو فعل خير يكون صادقًا من المؤمن الذي يشعر بمعاناة الناس ويتضامن معهم.",
]

MANIFESTATIONS_HEADING = "مظاهر الإحسان"
MANIFESTATIONS = [
    "الرفق بالحيوان كالعناية به وتوفير الأكل له.",
    "زيارة المريض.",
    "مساعدة الفقير.",
    "الإحسان لذي القربى لتقوية العلاقات وصلة الرحم.",
]

ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"


def ar(text: str) -> str:
    """Reshape Arabic and apply BiDi for correct RTL display in PDF."""
    return get_display(arabic_reshaper.reshape(text))


def arabic_num(n: int) -> str:
    return "".join(ARABIC_DIGITS[int(d)] for d in str(n))


class IhsanPDF(FPDF):
    def header(self) -> None:
        self.set_fill_color(250, 245, 240)
        self.rect(0, 0, self.w, 16, "F")
        self.set_y(5)
        self.set_font("Naskh", "B", 11)
        self.set_text_color(120, 70, 55)
        self.cell(0, 8, ar("تربية إسلامية    الإحسان"), align="C")
        self.ln(14)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_draw_color(200, 170, 150)
        self.set_line_width(0.3)
        self.line(20, self.get_y(), self.w - 20, self.get_y())
        self.set_y(-12)
        self.set_font("Naskh", "", 9)
        self.set_text_color(140, 120, 110)
        self.cell(0, 8, ar(f"صفحة {arabic_num(self.page_no())}"), align="C")


def build_pdf() -> Path:
    pdf = IhsanPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_font("Naskh", "", FONT_REG)
    pdf.add_font("Naskh", "B", FONT_BOLD)
    pdf.add_page()

    pdf.set_draw_color(196, 92, 78)
    pdf.set_line_width(1.2)
    pdf.line(25, 26, pdf.w - 25, 26)

    pdf.set_y(34)
    pdf.set_font("Naskh", "B", 22)
    pdf.set_text_color(45, 55, 70)
    pdf.multi_cell(0, 12, ar(TITLE), align="C")
    pdf.ln(2)

    mid = pdf.w / 2
    pdf.set_draw_color(70, 130, 160)
    pdf.set_line_width(0.6)
    pdf.line(mid - 45, pdf.get_y(), mid + 45, pdf.get_y())
    pdf.ln(10)

    content_w = pdf.w - 44

    # Definition box
    y0 = pdf.get_y()
    pdf.set_fill_color(245, 248, 250)
    pdf.set_draw_color(210, 220, 228)
    pdf.rect(18, y0, pdf.w - 36, 42, style="DF")

    pdf.set_xy(22, y0 + 4)
    pdf.set_font("Naskh", "B", 14)
    pdf.set_text_color(196, 92, 78)
    pdf.cell(content_w, 8, ar(DEFINITION_HEADING), align="R")

    pdf.set_font("Naskh", "", 12)
    pdf.set_text_color(40, 50, 60)
    y_text = y0 + 14
    for sentence in DEFINITION_SENTENCES:
        pdf.set_xy(22, y_text)
        pdf.multi_cell(content_w, 7, ar(sentence), align="R")
        y_text = pdf.get_y() + 1
    pdf.set_y(y0 + 48)

    # Manifestations heading
    pdf.set_font("Naskh", "B", 16)
    pdf.set_text_color(45, 55, 70)
    pdf.cell(0, 10, ar(MANIFESTATIONS_HEADING), align="C")
    pdf.ln(8)

    for i, item in enumerate(MANIFESTATIONS, start=1):
        y0 = pdf.get_y()
        band_h = 26 if len(item) > 40 else 20

        pdf.set_fill_color(245, 248, 250)
        pdf.set_draw_color(210, 220, 228)
        pdf.rect(18, y0, pdf.w - 36, band_h, style="DF")

        pdf.set_xy(22, y0 + (band_h - 8) / 2)
        pdf.set_font("Naskh", "", 13)
        pdf.set_text_color(40, 50, 60)
        pdf.cell(content_w, 8, ar(f"{arabic_num(i)}  {item}"), align="R")
        pdf.set_y(y0 + band_h + 5)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    OUT_LATIN.write_bytes(OUT.read_bytes())
    return OUT


if __name__ == "__main__":
    path = build_pdf()
    print(f"Created: {path}")
