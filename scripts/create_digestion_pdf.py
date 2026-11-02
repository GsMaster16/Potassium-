#!/usr/bin/env python3
"""Convert whiteboard notes about digestion benefits into a clear Arabic PDF."""

from pathlib import Path

import arabic_reshaper
from bidi.algorithm import get_display
from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "فوائد_عملية_الهضم.pdf"

FONT_REG = "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf"

TITLE = "من أبرز فوائد عملية الهضم"

POINTS = [
    (
        "١",
        "إنتاج الطاقة اللازمة",
        "ليؤدي الجسم وظائفه اليومية بفضل تحويل الطعام إلى أجزاء صغيرة يسهل على الجسم الاستفادة منها.",
    ),
    (
        "٢",
        "امتصاص الغذاء",
        "ونقل المواد الغذائية المفيدة إلى الدم.",
    ),
    (
        "٣",
        "النمو وبناء الجسم",
        "يساعد على نمو العظام والعضلات.",
    ),
    (
        "٤",
        "التخلص من الفضلات",
        "من خلال إخراج بقايا الطعام التي لا يحتاجها الجسم.",
    ),
]

CONCLUSION = (
    "وبالتالي عملية الهضم تساعد جسمنا على الاستفادة من الطعام "
    "للنمو والحركة والبقاء بصحة جيدة."
)


def ar(text: str) -> str:
    """Reshape Arabic and apply BiDi for correct RTL display in PDF."""
    return get_display(arabic_reshaper.reshape(text))


class DigestionPDF(FPDF):
    def header(self) -> None:
        self.set_fill_color(250, 245, 240)
        self.rect(0, 0, self.w, 16, "F")
        self.set_y(5)
        self.set_font("Naskh", "B", 11)
        self.set_text_color(120, 70, 55)
        self.cell(0, 8, ar("علوم الطبيعة    عملية الهضم"), align="C")
        self.ln(14)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_draw_color(200, 170, 150)
        self.set_line_width(0.3)
        self.line(20, self.get_y(), self.w - 20, self.get_y())
        self.set_y(-12)
        self.set_font("Naskh", "", 9)
        self.set_text_color(140, 120, 110)
        self.cell(0, 8, ar(f"صفحة {'٠١٢٣٤٥٦٧٨٩'[self.page_no()]}"), align="C")


def build_pdf() -> Path:
    pdf = DigestionPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_font("Naskh", "", FONT_REG)
    pdf.add_font("Naskh", "B", FONT_BOLD)
    pdf.add_page()

    # Decorative top rule
    pdf.set_draw_color(196, 92, 78)
    pdf.set_line_width(1.2)
    pdf.line(25, 26, pdf.w - 25, 26)

    # Title
    pdf.set_y(34)
    pdf.set_font("Naskh", "B", 22)
    pdf.set_text_color(45, 55, 70)
    pdf.multi_cell(0, 12, ar(TITLE), align="C")
    pdf.ln(2)

    mid = pdf.w / 2
    pdf.set_draw_color(70, 130, 160)
    pdf.set_line_width(0.6)
    pdf.line(mid - 40, pdf.get_y(), mid + 40, pdf.get_y())
    pdf.ln(10)

    content_w = pdf.w - 44

    for num, heading, body in POINTS:
        y0 = pdf.get_y()
        # Estimate band height from body length
        band_h = 30 if len(body) > 55 else 24

        pdf.set_fill_color(245, 248, 250)
        pdf.set_draw_color(210, 220, 228)
        pdf.rect(18, y0, pdf.w - 36, band_h, style="DF")

        # Heading with number (RTL): "١) العنوان :"
        pdf.set_xy(22, y0 + 3)
        pdf.set_font("Naskh", "B", 14)
        pdf.set_text_color(196, 92, 78)
        pdf.cell(content_w, 8, ar(f"{num}  {heading} :"), align="R")

        # Body
        pdf.set_xy(22, y0 + 12)
        pdf.set_font("Naskh", "", 12)
        pdf.set_text_color(40, 50, 60)
        pdf.multi_cell(content_w, 7, ar(body), align="R")
        pdf.set_y(y0 + band_h + 5)

    # Conclusion box
    pdf.ln(2)
    box_y = pdf.get_y()
    pdf.set_fill_color(232, 244, 236)
    pdf.set_draw_color(90, 150, 110)
    pdf.set_line_width(0.5)
    pdf.rect(18, box_y, pdf.w - 36, 34, style="DF")

    pdf.set_xy(22, box_y + 4)
    pdf.set_font("Naskh", "B", 13)
    pdf.set_text_color(55, 120, 80)
    pdf.cell(content_w, 8, ar("الخلاصة"), align="R")

    pdf.set_xy(22, box_y + 14)
    pdf.set_font("Naskh", "", 12)
    pdf.set_text_color(40, 55, 45)
    pdf.multi_cell(content_w, 7, ar(CONCLUSION), align="R")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    return OUT


if __name__ == "__main__":
    path = build_pdf()
    print(f"Created: {path}")
