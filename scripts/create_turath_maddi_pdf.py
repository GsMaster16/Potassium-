#!/usr/bin/env python3
"""Convert notebook notes about tangible heritage into a clear Arabic PDF."""

from pathlib import Path

import arabic_reshaper
from bidi.algorithm import get_display
from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "التراث_المادي.pdf"
OUT_LATIN = ROOT / "output" / "al_turath_al_maddi.pdf"

FONT_REG = "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf"

SUBJECT = "تربية مدنية"
TOPIC = "التراث المادي"
DATE_LINES = [
    "الأحد 06 أكتوبر 2024 م",
    "الموافق لـ 03 ربيع الثاني 1446 هـ",
]

DEFINITION_SENTENCES = [
    "هو كل ما ورثناه عن الأجداد مما يمكن لمسه ورؤيته أي تراث ملموس.",
    "ويتمثل في ما يلي:",
]

EXAMPLES = [
    "المعالم الأثرية والبنايات القديمة مثل آثار الطاسيلي.",
    "حي القصبة العتيق.",
    "الأدوات التقليدية.",
    "اللباس والأكل الشعبي.",
    "الآلات الموسيقية.",
]

ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"


def ar(text: str) -> str:
    return get_display(arabic_reshaper.reshape(text))


def arabic_num(n: int) -> str:
    return "".join(ARABIC_DIGITS[int(d)] for d in str(n))


class TurathMaddiPDF(FPDF):
    def header(self) -> None:
        self.set_fill_color(250, 245, 240)
        self.rect(0, 0, self.w, 16, "F")
        self.set_y(5)
        self.set_font("Naskh", "B", 11)
        self.set_text_color(120, 70, 55)
        self.cell(0, 8, ar(f"{SUBJECT}    {TOPIC}"), align="C")
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
    pdf = TurathMaddiPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_font("Naskh", "", FONT_REG)
    pdf.add_font("Naskh", "B", FONT_BOLD)
    pdf.add_page()

    content_w = pdf.w - 44

    pdf.set_draw_color(196, 92, 78)
    pdf.set_line_width(1.2)
    pdf.line(25, 26, pdf.w - 25, 26)

    pdf.set_y(30)
    pdf.set_font("Naskh", "", 11)
    pdf.set_text_color(90, 100, 110)
    for line in DATE_LINES:
        pdf.cell(0, 7, ar(line), align="C")
        pdf.ln(7)

    pdf.ln(2)
    pdf.set_font("Naskh", "B", 22)
    pdf.set_text_color(45, 55, 70)
    pdf.multi_cell(0, 12, ar(TOPIC), align="C")
    pdf.ln(1)

    mid = pdf.w / 2
    pdf.set_draw_color(70, 130, 160)
    pdf.set_line_width(0.6)
    pdf.line(mid - 40, pdf.get_y(), mid + 40, pdf.get_y())
    pdf.ln(8)

    # Definition box
    y0 = pdf.get_y()
    pdf.set_fill_color(245, 248, 250)
    pdf.set_draw_color(210, 220, 228)
    pdf.rect(18, y0, pdf.w - 36, 32, style="DF")

    pdf.set_xy(22, y0 + 3)
    pdf.set_font("Naskh", "B", 13)
    pdf.set_text_color(196, 92, 78)
    pdf.cell(content_w, 7, ar("تعريف التراث المادي"), align="R")

    pdf.set_font("Naskh", "", 12)
    pdf.set_text_color(40, 50, 60)
    y_text = y0 + 12
    for sentence in DEFINITION_SENTENCES:
        pdf.set_xy(22, y_text)
        pdf.multi_cell(content_w, 7, ar(sentence), align="R")
        y_text = pdf.get_y() + 1
    pdf.set_y(y0 + 38)

    pdf.set_font("Naskh", "B", 15)
    pdf.set_text_color(45, 55, 70)
    pdf.cell(0, 10, ar("أمثلة عن التراث المادي"), align="C")
    pdf.ln(6)

    for i, item in enumerate(EXAMPLES, start=1):
        y0 = pdf.get_y()
        band_h = 22 if len(item) > 40 else 18

        pdf.set_fill_color(245, 248, 250)
        pdf.set_draw_color(210, 220, 228)
        pdf.rect(18, y0, pdf.w - 36, band_h, style="DF")

        pdf.set_xy(22, y0 + (band_h - 8) / 2)
        pdf.set_font("Naskh", "", 12)
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
