#!/usr/bin/env python3
"""Generate Righello proposal PDFs from Optima quote JSON.

This script is intentionally outside the Cloudflare runtime: it is meant for
the self-hosted runner/Codex CLI path where ReportLab can produce reliable,
print-ready documents and optional PNG renders for visual QA.
"""

from __future__ import annotations

import argparse
import html
import json
import math
import os
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
ASSET_DIR = HERE / "assets"
FONT_DIR = ASSET_DIR / "fonts"
DEFAULT_OUTPUT_DIR = HERE / "output"
DEFAULT_MIN_PAGE_DENSITY = 0.36

LOGO_DARK = ROOT / "public" / "assets" / "logos" / "righello-quote-dark.png"
LOGO_WHITE = ROOT / "public" / "assets" / "logos" / "righello-quote-white.png"


def fail(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def money(value: Any) -> str:
    try:
        amount = float(value or 0)
    except (TypeError, ValueError):
        amount = 0.0
    text = f"{amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    if text.endswith(",00"):
        text = text[:-3]
    return f"€ {text}"


def number(value: Any, fallback: float = 0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback
    if math.isnan(parsed) or math.isinf(parsed):
        return fallback
    return parsed


def clean_text(value: Any, fallback: str = "") -> str:
    text = str(value if value is not None else fallback)
    replacements = {
        "\u2011": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2192": ">",
        "\u2190": "<",
        "\u2713": "v",
        "\u25cf": "-",
        "\u2610": "[ ]",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def is_mock_contact_value(value: Any) -> bool:
    text = clean_text(value)
    if not text:
        return False
    email_match = re.fullmatch(r"[^@\s]+@([^@\s]+\.[^@\s]+)", text)
    if email_match and email_match.group(1).lower() in {"example.com", "example.it", "example.org", "test.com", "test.it"}:
        return True
    return bool(re.search(r"\b(placeholder|lorem|mock|fake|test|esempio)\b", text, re.I))


def real_client_value(value: Any) -> str:
    text = clean_text(value)
    return "" if is_mock_contact_value(text) else text


def ptext(value: Any, fallback: str = "") -> str:
    return html.escape(clean_text(value, fallback))


def slug(value: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9]+", "_", value).strip("_")
    return base or "preventivo"


def hex_to_color(value: Any, fallback: HexColor) -> HexColor:
    if isinstance(value, str) and re.fullmatch(r"#?[0-9a-fA-F]{6}", value.strip()):
        return HexColor(value if value.startswith("#") else f"#{value}")
    return fallback


def color_is_light(color: HexColor) -> bool:
    r, g, b = color.rgb()
    return (r * 255 * 299 + g * 255 * 587 + b * 255 * 114) / 1000 > 170


@dataclass(frozen=True)
class Palette:
    paper: HexColor = HexColor("#FFFFFF")
    surface: HexColor = HexColor("#F7F4EE")
    surface_alt: HexColor = HexColor("#EFEAE1")
    border: HexColor = HexColor("#DAD5CA")
    text: HexColor = HexColor("#111111")
    muted: HexColor = HexColor("#656D78")
    pink: HexColor = HexColor("#C13D6F")
    cyan: HexColor = HexColor("#0891B2")
    navy: HexColor = HexColor("#1E3A5F")


P = Palette()


def register_fonts() -> None:
    required = {
        "DMSans": FONT_DIR / "DMSans-Regular.ttf",
        "DMSans-Med": FONT_DIR / "DMSans-Medium.ttf",
        "DMSans-Bold": FONT_DIR / "DMSans-Bold.ttf",
    }
    missing = [str(path) for path in required.values() if not path.exists()]
    if missing:
        fail("missing font assets: " + ", ".join(missing))
    for name, path in required.items():
        pdfmetrics.registerFont(TTFont(name, str(path)))


FONT_REG = "DMSans"
FONT_MED = "DMSans-Med"
FONT_BOLD = "DMSans-Bold"


def style(name: str, **kw: Any) -> ParagraphStyle:
    base = dict(
        name=name,
        fontName=FONT_REG,
        fontSize=10,
        leading=14,
        textColor=P.text,
        spaceBefore=0,
        spaceAfter=0,
        alignment=TA_LEFT,
    )
    base.update(kw)
    return ParagraphStyle(**base)


def build_styles() -> dict[str, ParagraphStyle]:
    return {
        "kicker": style("kicker", fontName=FONT_MED, fontSize=8.5, leading=11, textColor=P.pink),
        "cover_title": style("cover_title", fontName=FONT_BOLD, fontSize=36, leading=40, textColor=P.text),
        "cover_sub": style("cover_sub", fontSize=13, leading=19, textColor=P.muted),
        "h1": style("h1", fontName=FONT_BOLD, fontSize=24, leading=28, textColor=P.text),
        "h2": style("h2", fontName=FONT_BOLD, fontSize=15, leading=19, textColor=P.text, spaceBefore=8, spaceAfter=5),
        "h3": style("h3", fontName=FONT_BOLD, fontSize=11, leading=14, textColor=P.navy),
        "body": style("body", fontSize=9.5, leading=14, textColor=P.text, alignment=TA_JUSTIFY),
        "body_muted": style("body_muted", fontSize=9.2, leading=13, textColor=P.muted, alignment=TA_JUSTIFY),
        "small": style("small", fontSize=8, leading=11, textColor=P.muted),
        "label": style("label", fontName=FONT_MED, fontSize=7.4, leading=10, textColor=P.pink),
        "table_head": style("table_head", fontName=FONT_MED, fontSize=8.6, leading=11, textColor=P.text),
        "table": style("table", fontSize=8.8, leading=12, textColor=P.text),
        "table_bold": style("table_bold", fontName=FONT_MED, fontSize=8.8, leading=12, textColor=P.text),
        "amount": style("amount", fontName=FONT_BOLD, fontSize=11, leading=14, textColor=P.text, alignment=TA_RIGHT),
        "amount_big": style("amount_big", fontName=FONT_BOLD, fontSize=18, leading=22, textColor=P.pink, alignment=TA_RIGHT),
    }


class GradientBar(Flowable):
    def __init__(self, width: float = 70 * mm, height: float = 2.5):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        steps = 90
        c1 = P.pink.rgb()
        c2 = P.cyan.rgb()
        for index in range(steps):
            t = index / (steps - 1)
            color = Color(
                (1 - t) * c1[0] + t * c2[0],
                (1 - t) * c1[1] + t * c2[1],
                (1 - t) * c1[2] + t * c2[2],
            )
            self.canv.setFillColor(color)
            self.canv.rect(index * self.width / steps, 0, self.width / steps + 0.3, self.height, stroke=0, fill=1)


class QuoteDoc(BaseDocTemplate):
    def __init__(self, filename: str, title: str, reference: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=20 * mm,
            rightMargin=20 * mm,
            topMargin=22 * mm,
            bottomMargin=20 * mm,
            title=title,
            author="Righello S.R.L.",
        )
        width, height = A4
        self.reference = reference
        cover = Frame(20 * mm, 20 * mm, width - 40 * mm, height - 40 * mm, id="cover", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        page = Frame(20 * mm, 18 * mm, width - 40 * mm, height - 40 * mm, id="page", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates(
            [
                PageTemplate(id="COVER", frames=[cover], onPage=self.on_cover),
                PageTemplate(id="PAGE", frames=[page], onPage=self.on_page),
            ]
        )

    def _gradient_line(self, canv: Any, x: float, y: float, width: float, height: float) -> None:
        steps = 100
        c1 = P.pink.rgb()
        c2 = P.cyan.rgb()
        for index in range(steps):
            t = index / (steps - 1)
            canv.setFillColor(Color((1 - t) * c1[0] + t * c2[0], (1 - t) * c1[1] + t * c2[1], (1 - t) * c1[2] + t * c2[2]))
            canv.rect(x + index * width / steps, y, width / steps + 0.35, height, stroke=0, fill=1)

    def _draw_logo(self, canv: Any, path: Path, x: float, y: float, width: float, height: float) -> None:
        left = x - width
        bottom = y - height
        if path.exists():
            canv.drawImage(str(path), left, bottom, width=width, height=height, preserveAspectRatio=True, anchor="ne", mask="auto")
            return
        canv.setFont(FONT_BOLD, 14)
        canv.setFillColor(P.text)
        canv.drawRightString(x, bottom + height / 2, "Righello")

    def on_cover(self, canv: Any, doc: Any) -> None:
        width, height = A4
        self._gradient_line(canv, 0, 0, 2 * mm, height)
        self._draw_logo(canv, LOGO_DARK, width - 20 * mm, height - 28 * mm, 43 * mm, 15 * mm)
        canv.setFont(FONT_REG, 7.5)
        canv.setFillColor(P.muted)
        canv.drawString(20 * mm, 15 * mm, "Righello S.R.L. - P.IVA / C.F. 01979970934 - REA PN-376408 - capitale sociale EUR 10.000,00 i.v.")
        canv.drawRightString(width - 20 * mm, 15 * mm, "wearerighello.com - righello-srl@pec.it")
        canv.setFont(FONT_MED, 7.5)
        canv.setFillColor(P.pink)
        canv.drawString(20 * mm, 9 * mm, "START-UP INNOVATIVA")
        canv.setFont(FONT_REG, 7.5)
        canv.setFillColor(P.muted)
        canv.drawString(52 * mm, 9 * mm, "iscritta sezione speciale Registro Imprese Pordenone-Udine dal 07/04/2025")

    def on_page(self, canv: Any, doc: Any) -> None:
        width, height = A4
        self._gradient_line(canv, 0, height - 8 * mm, width, 0.8)
        canv.setStrokeColor(P.border)
        canv.setLineWidth(0.25)
        canv.line(20 * mm, 15 * mm, width - 20 * mm, 15 * mm)
        canv.setFont(FONT_REG, 7.4)
        canv.setFillColor(P.muted)
        canv.drawString(20 * mm, 10 * mm, "Righello S.R.L. - P.IVA 01979970934 - Pasiano di Pordenone (PN) - wearerighello.com")
        canv.drawRightString(width - 20 * mm, 10 * mm, f"{self.reference} - Pagina {doc.page}")


class StudioQuotePDF:
    def __init__(self, data: dict[str, Any], output: Path):
        self.data = data
        self.output = output
        self.styles = build_styles()
        self.width, self.height = A4
        self.content_width = self.width - 40 * mm

    @property
    def client_name(self) -> str:
        return clean_text(self.data.get("cliente", {}).get("nome"), "Cliente")

    @property
    def title(self) -> str:
        return clean_text(self.data.get("preventivo", {}).get("titolo"), "Proposta Righello")

    @property
    def description(self) -> str:
        return clean_text(self.data.get("preventivo", {}).get("descrizione"), "")

    @property
    def validity_days(self) -> int:
        preventivo = self.data.get("preventivo", {})
        condizioni = self.data.get("condizioni", {})
        return int(number(preventivo.get("validitaGiorni") or condizioni.get("validityDays"), 30))

    @property
    def vat_percent(self) -> float:
        return number(self.data.get("totali", {}).get("percentualeIva"), 22)

    def items(self, category: str | None = None) -> list[dict[str, Any]]:
        rows = self.data.get("voci") or []
        if category is None:
            return [row for row in rows if isinstance(row, dict)]
        return [row for row in rows if isinstance(row, dict) and row.get("categoria") == category]

    def base_items(self) -> list[dict[str, Any]]:
        return [row for row in self.items() if row.get("categoria") not in ("optional", "recurring")]

    def item_total(self, item: dict[str, Any]) -> float:
        total = number(item.get("totale"))
        if total > 0:
            return total
        return number(item.get("quantita"), 1) * number(item.get("prezzoUnitario"))

    def development_total(self) -> float:
        subtotal = sum(self.item_total(item) for item in self.base_items())
        return max(0, subtotal - number(self.data.get("totali", {}).get("sconto")))

    def recurring_total(self) -> float:
        gestione = self.data.get("gestioneAnnuale") or {}
        return number(gestione.get("totalAnnual")) + sum(self.item_total(item) for item in self.items("recurring"))

    def validate(self) -> None:
        errors: list[str] = []
        cliente = self.data.get("cliente", {})
        placeholder_fields = [
            field
            for field in ("email", "telefono", "indirizzo", "partitaIva")
            if is_mock_contact_value(cliente.get(field))
        ]
        if not self.client_name:
            errors.append("cliente mancante")
        if not self.title:
            errors.append("titolo mancante")
        if placeholder_fields:
            errors.append("dati cliente fittizi non ammessi: " + ", ".join(placeholder_fields))
        if len(self.base_items()) < 3:
            errors.append("servono almeno 3 voci base per un preventivo commerciale completo")
        for item in self.items():
            if not clean_text(item.get("descrizione")):
                errors.append("voce senza descrizione")
            if self.item_total(item) <= 0:
                errors.append(f"voce con importo non valido: {clean_text(item.get('descrizione'), 'senza descrizione')}")
        if errors:
            fail("; ".join(errors))

    def paragraph(self, text: Any, style_name: str = "body") -> Paragraph:
        return Paragraph(ptext(text), self.styles[style_name])

    def section_title(self, kicker: str, title: str) -> list[Any]:
        return [
            Paragraph(ptext(kicker.upper()), self.styles["kicker"]),
            Spacer(1, 3),
            Paragraph(ptext(title), self.styles["h1"]),
            Spacer(1, 6),
            GradientBar(44 * mm, 2),
            Spacer(1, 12),
        ]

    def bullet_list(self, values: list[Any], fallback: str = "") -> list[Any]:
        clean_values = [clean_text(value) for value in values if clean_text(value)]
        if not clean_values and fallback:
            clean_values = [fallback]
        output: list[Any] = []
        for value in clean_values:
            output.append(
                Table(
                    [[Paragraph("<font color='#C13D6F'><b>-</b></font>", self.styles["table"]), Paragraph(ptext(value), self.styles["body"])]],
                    colWidths=[5 * mm, self.content_width - 5 * mm],
                    style=TableStyle(
                        [
                            ("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 0),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                            ("TOPPADDING", (0, 0), (-1, -1), 1),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ]
                    ),
                )
            )
        return output

    def price_table(self, rows: list[tuple[str, str]], total_label: str | None = None, total_value: str | None = None) -> Table:
        data = [[Paragraph("VOCE", self.styles["table_head"]), Paragraph("IMPORTO NETTO", self.styles["table_head"])]]
        for label, value in rows:
            data.append([Paragraph(ptext(label), self.styles["table"]), Paragraph(ptext(value), self.styles["amount"])])
        if total_label and total_value:
            data.append([Paragraph(ptext(total_label), self.styles["table_bold"]), Paragraph(ptext(total_value), self.styles["amount_big"])])

        table = Table(data, colWidths=[self.content_width - 45 * mm, 45 * mm], repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), P.surface),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.8, P.pink),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -2 if total_label else -1), [P.paper, P.surface]),
                    ("BACKGROUND", (0, -1), (-1, -1), P.surface_alt if total_label else P.paper),
                    ("LINEABOVE", (0, -1), (-1, -1), 0.8, P.pink if total_label else P.border),
                    ("BOX", (0, 0), (-1, -1), 0.4, P.border),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ]
            )
        )
        return table

    def item_card(self, item: dict[str, Any], index: int) -> KeepTogether:
        details = [
            f"Quantita: {number(item.get('quantita'), 1):g}",
            f"Categoria: {clean_text(item.get('categoria'), 'base')}",
        ]
        if clean_text(item.get("tipo")):
            details.append(f"Tipologia: {clean_text(item.get('tipo'))}")

        amount = Paragraph(money(self.item_total(item)), self.styles["amount_big"])
        description = Paragraph(ptext(clean_text(item.get("descrizione"), f"Voce {index}")), self.styles["table_bold"])
        meta = Paragraph(ptext(" - ".join(details)), self.styles["small"])
        table = Table(
            [
                [
                    Paragraph(ptext(f"VOCE {index:02d}"), self.styles["label"]),
                    Paragraph("IMPORTO NETTO", self.styles["label"]),
                ],
                [description, amount],
                [meta, ""],
            ],
            colWidths=[self.content_width - 42 * mm, 42 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), P.surface),
                    ("BOX", (0, 0), (-1, -1), 0.45, P.border),
                    ("LINEABOVE", (0, 0), (-1, 0), 1.0, P.pink),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("SPAN", (0, 2), (1, 2)),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ]
            ),
        )
        return KeepTogether([table, Spacer(1, 6)])

    def meta_table(self) -> Table:
        cliente = self.data.get("cliente", {})
        preventivo = self.data.get("preventivo", {})
        company = real_client_value(cliente.get("azienda"))
        email = real_client_value(cliente.get("email"))
        vat = real_client_value(cliente.get("partitaIva"))
        client_lines = [
            self.client_name,
            company if company.lower() != self.client_name.lower() else "",
            email or "Email da completare",
            vat,
        ]
        client_text = "<br/>".join(ptext(line) for line in client_lines if line)
        data = [
            [Paragraph("CLIENTE", self.styles["label"]), Paragraph("FORNITORE", self.styles["label"])],
            [Paragraph(client_text or ptext(self.client_name), self.styles["body"]), Paragraph("<b>Righello S.R.L.</b><br/>Via Villaraccolta 23<br/>33087 Pasiano di Pordenone (PN)<br/>P.IVA / C.F. 01979970934<br/>wearerighello.com", self.styles["body"])],
            [Paragraph("DOCUMENTO", self.styles["label"]), Paragraph("VALIDITA", self.styles["label"])],
            [Paragraph(ptext(preventivo.get("numeroPreventivo") or "Proposta Righello"), self.styles["body"]), Paragraph(ptext(f"{self.validity_days} giorni dalla data di emissione"), self.styles["body"])],
        ]
        table = Table(data, colWidths=[self.content_width / 2, self.content_width / 2])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), P.surface),
                    ("BOX", (0, 0), (-1, -1), 0.4, P.border),
                    ("LINEAFTER", (0, 0), (0, -1), 0.4, P.border),
                    ("LINEBELOW", (0, 1), (-1, 1), 0.4, P.border),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        return table

    def cover(self) -> list[Any]:
        return [
            Spacer(1, 70 * mm),
            Paragraph("PROPOSTA COMMERCIALE", self.styles["kicker"]),
            Spacer(1, 6),
            Paragraph(ptext(self.title).replace(" - ", "<br/>"), self.styles["cover_title"]),
            Spacer(1, 14),
            GradientBar(70 * mm, 3),
            Spacer(1, 18),
            Paragraph(
                ptext(self.description)
                or f"La proposta definisce perimetro, priorita operative, condizioni economiche e prossimi passi per {ptext(self.client_name)}.",
                self.styles["cover_sub"],
            ),
            Spacer(1, 26),
            self.meta_table(),
            NextPageTemplate("PAGE"),
            PageBreak(),
        ]

    def overview(self) -> list[Any]:
        development = self.development_total()
        recurring = self.recurring_total()
        vat = development * self.vat_percent / 100
        rows = [(clean_text(item.get("descrizione")), money(self.item_total(item))) for item in self.base_items()]
        return [
            *self.section_title("oggetto", f"Cosa proponiamo a {self.client_name}"),
            Paragraph(
                ptext(self.description)
                or "La proposta organizza sviluppo, servizi ricorrenti, condizioni e materiali necessari in un documento leggibile e verificabile.",
                self.styles["body"],
            ),
            Spacer(1, 14),
            Paragraph("STRUTTURA DEL PREVENTIVO", self.styles["kicker"]),
            Spacer(1, 6),
            self.price_table(rows),
            Spacer(1, 9),
            Paragraph(
                f"<font color='#C13D6F'><b>-</b></font> Totale imponibile <b>{money(development)}</b> &nbsp; "
                f"<font color='#0891B2'><b>-</b></font> IVA {self.vat_percent:.0f}% <b>{money(vat)}</b> &nbsp; "
                f"Totale documento <b>{money(development + vat)}</b>",
                self.styles["body"],
            ),
            *(([Spacer(1, 4), Paragraph(f"Gestione annua separata: <b>{money(recurring)}</b>", self.styles["body_muted"])] if recurring else [])),
            PageBreak(),
        ]

    def detail_sections(self) -> list[Any]:
        items = self.base_items()
        if not items:
            return []

        output: list[Any] = [
            CondPageBreak(92 * mm),
            *self.section_title("dettaglio economico", "Voci di sviluppo"),
            Paragraph(
                "Le voci sono raggruppate per mantenere il documento compatto e stampabile. "
                "Ogni importo e' netto IVA e separa lo sviluppo dai servizi ricorrenti.",
                self.styles["body_muted"],
            ),
            Spacer(1, 10),
        ]
        for index, item in enumerate(items, start=1):
            output.append(CondPageBreak(34 * mm))
            output.append(self.item_card(item, index))
        return output

    def project_content(self) -> list[Any]:
        objectives = self.data.get("obiettivi") if isinstance(self.data.get("obiettivi"), list) else []
        activities = self.data.get("attivita") if isinstance(self.data.get("attivita"), list) else []
        output: list[Any] = [
            *self.section_title("progetto", "Obiettivi e attivita"),
            Paragraph("OBIETTIVI", self.styles["kicker"]),
            Spacer(1, 5),
            *self.bullet_list(objectives, "Obiettivi da confermare nel kick-off operativo."),
            Spacer(1, 8),
            Paragraph("ATTIVITA PREVISTE", self.styles["kicker"]),
            Spacer(1, 5),
            *self.bullet_list(activities, "Attivita e deliverable da dettagliare nella fase di avvio."),
            Spacer(1, 12),
        ]
        return output

    def recap(self) -> list[Any]:
        development = self.development_total()
        vat = development * self.vat_percent / 100
        recurring = self.recurring_total()
        rows = [(clean_text(item.get("descrizione")), money(self.item_total(item))) for item in self.base_items()]
        output: list[Any] = [
            CondPageBreak(105 * mm),
            *self.section_title("riepilogo", "Quadro economico"),
            self.price_table(rows, "TOTALE DOCUMENTO", money(development + vat)),
            Spacer(1, 10),
            self.price_table(
                [
                    ["Totale imponibile", money(development)],
                    [f"IVA {self.vat_percent:.0f}%", money(vat)],
                    ["Gestione annua separata", money(recurring)],
                ]
            ),
            Spacer(1, 18),
            Paragraph("CONDIZIONI OPERATIVE", self.styles["kicker"]),
            Spacer(1, 8),
            Paragraph(ptext(self.data.get("condizioni", {}).get("paymentTerms") or "Pagamento e avvio secondo accordi confermati in fase di approvazione."), self.styles["body"]),
            Spacer(1, 8),
            Paragraph(ptext(self.data.get("terminiCondizioni") or "Eventuali attivita aggiuntive, estensioni funzionali o integrazioni non previste saranno oggetto di valutazione separata."), self.styles["body"]),
            Spacer(1, 10),
            Paragraph("Accettazione e revisione possono avvenire tramite link condiviso Optima o conferma scritta.", self.styles["body_muted"]),
            *(([
                Spacer(1, 10),
                CondPageBreak(24 * mm),
                self.signature_table(),
            ] if self.data.get("includeSignature") else [])),
            Spacer(1, 10),
            GradientBar(self.content_width, 2),
        ]
        return output

    def signature_table(self) -> Table:
        data = [
            [
                Paragraph(
                    f"Per accettazione<br/>{ptext(self.client_name)}<br/><br/>______________________________<br/>Data e firma",
                    self.styles["small"],
                ),
                Paragraph(
                    "Per Righello S.R.L.<br/>Direzione<br/><br/>______________________________<br/>Data e firma",
                    self.styles["small"],
                ),
            ],
        ]
        table = Table(data, colWidths=[self.content_width / 2, self.content_width / 2])
        table.setStyle(
            TableStyle(
                [
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        return table

    def build(self) -> None:
        self.validate()
        self.output.parent.mkdir(parents=True, exist_ok=True)
        reference = clean_text(self.data.get("preventivo", {}).get("numeroPreventivo"), "Proposta Righello")
        doc = QuoteDoc(str(self.output), self.title, reference)
        story: list[Any] = []
        story.extend(self.cover())
        story.extend(self.overview())
        story.extend(self.project_content())
        story.extend(self.detail_sections())
        story.extend(self.recap())
        doc.build(story)


def render_pngs(pdf_path: Path, output_dir: Path) -> None:
    try:
        import fitz  # type: ignore
    except Exception:
        print("warning: PyMuPDF not installed; skipping PNG render", file=sys.stderr)
        return
    render_dir = output_dir / f"{pdf_path.stem}_pages"
    render_dir.mkdir(parents=True, exist_ok=True)
    for stale_page in render_dir.glob("page_*.png"):
        stale_page.unlink()
    doc = fitz.open(str(pdf_path))
    for index, page in enumerate(doc, start=1):
        pix = page.get_pixmap(matrix=fitz.Matrix(1.35, 1.35), alpha=False)
        pix.save(str(render_dir / f"page_{index:02d}.png"))
    print(f"rendered_pages={render_dir}")


def page_density_report(pdf_path: Path, min_density: float = DEFAULT_MIN_PAGE_DENSITY) -> dict[str, Any] | None:
    try:
        import fitz  # type: ignore
    except Exception:
        print("warning: PyMuPDF not installed; skipping density QA", file=sys.stderr)
        return None

    doc = fitz.open(str(pdf_path))
    pages: list[dict[str, Any]] = []
    warnings: list[str] = []
    page_height = A4[1]
    content_top = 24 * mm
    content_bottom = page_height - 28 * mm
    content_height = content_bottom - content_top

    for index, page in enumerate(doc, start=1):
        ys: list[float] = []
        for block in page.get_text("blocks"):
            if len(block) < 5 or not clean_text(block[4]):
                continue
            y0, y1 = float(block[1]), float(block[3])
            if y1 < content_top or y0 > content_bottom:
                continue
            ys.extend([max(y0, content_top), min(y1, content_bottom)])

        density = 1.0 if index == 1 else 0.0
        if ys:
            density = max(0.0, min(1.0, (max(ys) - min(ys)) / content_height))

        page_result = {
            "page": index,
            "content_density": round(density, 3),
            "status": "ok",
        }
        if 1 < index < len(doc) and density < min_density:
            page_result["status"] = "warning"
            warnings.append(f"page {index} has low content density ({density:.0%})")
        pages.append(page_result)

    return {
        "pdf": str(pdf_path),
        "page_count": len(doc),
        "min_density": min_density,
        "warnings": warnings,
        "pages": pages,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a print-ready Righello quote PDF from Optima JSON.")
    parser.add_argument("input", help="Path to Optima GeneratedQuoteData JSON")
    parser.add_argument("--output", help="Output PDF path")
    parser.add_argument("--render", action="store_true", help="Render pages to PNG with PyMuPDF for QA")
    parser.add_argument("--qa-json", help="Write layout QA metrics to JSON")
    parser.add_argument("--strict-qa", action="store_true", help="Fail when internal pages are mostly empty")
    args = parser.parse_args()

    register_fonts()
    input_path = Path(args.input).expanduser().resolve()
    if not input_path.exists():
        fail(f"input not found: {input_path}")
    data = json.loads(input_path.read_text(encoding="utf-8"))
    title = clean_text(data.get("preventivo", {}).get("titolo"), "Proposta Righello")
    client = clean_text(data.get("cliente", {}).get("nome"), "Cliente")
    output = Path(args.output).expanduser().resolve() if args.output else DEFAULT_OUTPUT_DIR / f"Proposta_{slug(client)}_{slug(title)[:40]}.pdf"

    StudioQuotePDF(data, output).build()
    print(f"pdf={output}")
    qa_report = page_density_report(output)
    if qa_report:
        if args.qa_json:
            qa_path = Path(args.qa_json).expanduser().resolve()
            qa_path.parent.mkdir(parents=True, exist_ok=True)
            qa_path.write_text(json.dumps(qa_report, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"qa={qa_path}")
        for warning in qa_report["warnings"]:
            print(f"warning: {warning}", file=sys.stderr)
        if args.strict_qa and qa_report["warnings"]:
            fail("layout QA failed: " + "; ".join(qa_report["warnings"]))
    if args.render:
        render_pngs(output, output.parent)


if __name__ == "__main__":
    main()
