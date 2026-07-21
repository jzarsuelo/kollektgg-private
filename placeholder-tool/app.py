#!/usr/bin/env python3
"""
kollekt.gg — TCG Binder Placeholder Generator (v2)
Every measurement derived from JSX source at exact scale.
JSX card: 215px × 301px → PDF card: 63mm × 88mm
"""

import os
import csv
import io
import math
import tempfile
from flask import Flask, render_template, request, send_file
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# ════════════════════════════════════════════════════════════
# SCALE — JSX design px → ReportLab points (never multiply these by MM_TO_PT)
# ════════════════════════════════════════════════════════════

JSX_CARD_WIDTH_PX = 215.0
JSX_CARD_HEIGHT_PX = 301.0
CARD_W = 63 * mm
CARD_H = 88 * mm
PTS_PER_JSX_PIXEL_X = CARD_W / JSX_CARD_WIDTH_PX
PTS_PER_JSX_PIXEL_Y = CARD_H / JSX_CARD_HEIGHT_PX
MM_TO_PT = 2.83465  # unused guard constant; see CURSOR.md — do not combine with PTS_PER_JSX_*

PAGE_W, PAGE_H = A4
COLS = 3
ROWS = 3
CARDS_PER_PAGE = COLS * ROWS
GAP = 3 * mm

GRID_W = COLS * CARD_W + (COLS - 1) * GAP
GRID_H = ROWS * CARD_H + (ROWS - 1) * GAP
MARGIN_X = (PAGE_W - GRID_W) / 2
MARGIN_Y = (PAGE_H - GRID_H) / 2

# ════════════════════════════════════════════════════════════
# SECTION HEIGHTS — exact from JSX flex layout
# ════════════════════════════════════════════════════════════
# Header:  matched to footer height → 20.6px
# Name:    padding 7+2, content 12.5*1.2=15 → 24px
# Type:    15.4px band height folded into art; finish label drawn in rarity row (left)
# Art:     flex:1 = 301 - 20.6 - 24 - 15.4 - 19.8 - 20.6 = 200.6px (ART_H + TYPE_H in code)
# Rarity:  padding 5+4, content 9*1.2=10.8 → 19.8px
# Footer:  border 1 + padding 5+5, content 8*1.2=9.6 → 20.6px

HEADER_H = 20.6 * PTS_PER_JSX_PIXEL_Y
HEADER_ACCENT_H = 2.0 * PTS_PER_JSX_PIXEL_Y
NAME_H = 24.0 * PTS_PER_JSX_PIXEL_Y
TYPE_H = 15.4 * PTS_PER_JSX_PIXEL_Y
ART_H = 200.6 * PTS_PER_JSX_PIXEL_Y
RARITY_H = 19.8 * PTS_PER_JSX_PIXEL_Y
FOOTER_H = 20.6 * PTS_PER_JSX_PIXEL_Y

# ════════════════════════════════════════════════════════════
# KEY DIMENSIONS — JSX px × scale → points
# ════════════════════════════════════════════════════════════

CARD_R = 10.0 * PTS_PER_JSX_PIXEL_X
SIDE_PAD = 10.0 * PTS_PER_JSX_PIXEL_X
ART_MARGIN = 10.0 * PTS_PER_JSX_PIXEL_X
ART_R = 7.0 * PTS_PER_JSX_PIXEL_X
BADGE_R = 6.0 * PTS_PER_JSX_PIXEL_X
BADGE_PX = 6.0 * PTS_PER_JSX_PIXEL_X
BADGE_PY = 2.0 * PTS_PER_JSX_PIXEL_Y
NAME_BADGE_GAP = 6.0 * PTS_PER_JSX_PIXEL_X

# ════════════════════════════════════════════════════════════
# FONT SIZES (points) — JSX px × PTS_PER_JSX_PIXEL_Y
# ════════════════════════════════════════════════════════════

FONT_HEADER_PT = 8.0 * PTS_PER_JSX_PIXEL_Y
FONT_NAME_PT = 12.5 * PTS_PER_JSX_PIXEL_Y
FONT_BADGE_PT = 8.0 * PTS_PER_JSX_PIXEL_Y
FONT_WATERMARK_PT = 108.0 * PTS_PER_JSX_PIXEL_Y
FONT_TOTAL_PT = 8.5 * PTS_PER_JSX_PIXEL_Y
FONT_RARITY_PT = 9.0 * PTS_PER_JSX_PIXEL_Y
FONT_FOOTER_PT = 8.0 * PTS_PER_JSX_PIXEL_Y

# ════════════════════════════════════════════════════════════
# LETTER SPACING (points) — JSX px × PTS_PER_JSX_PIXEL_X
# ════════════════════════════════════════════════════════════

LETTER_SPACE_HEADER_PT = 2.0 * PTS_PER_JSX_PIXEL_X
LETTER_SPACE_WATERMARK_PT = -3.0 * PTS_PER_JSX_PIXEL_X
LETTER_SPACE_RARITY_PT = 1.0 * PTS_PER_JSX_PIXEL_X
LETTER_SPACE_FOOTER_PT = 1.5 * PTS_PER_JSX_PIXEL_X

# ════════════════════════════════════════════════════════════
# INTERNAL PADDING — from JSX (scaled to points)
# ════════════════════════════════════════════════════════════

NAME_PAD_TOP = 7.0 * PTS_PER_JSX_PIXEL_Y
NAME_PAD_BOT = 2.0 * PTS_PER_JSX_PIXEL_Y
RARITY_PAD_TOP = 5.0 * PTS_PER_JSX_PIXEL_Y
RARITY_PAD_BOT = 4.0 * PTS_PER_JSX_PIXEL_Y
FOOTER_BORDER = 1.0 * PTS_PER_JSX_PIXEL_Y
FOOTER_PAD = 5.0 * PTS_PER_JSX_PIXEL_Y
ART_TOTAL_BOTTOM = 6.0 * PTS_PER_JSX_PIXEL_Y
ART_TOTAL_RIGHT = 8.0 * PTS_PER_JSX_PIXEL_X

# ════════════════════════════════════════════════════════════
# COLORS — JSX + baked opacity on art background
# ════════════════════════════════════════════════════════════

COLOR_CARD_NAME_TEXT = "#1a1a2e"

RARITY_MAP = {
    "C":   {"label": "Common",       "bg": "#9E9E9E", "labelColor": None,      "goldBadge": False},
    "U":   {"label": "Uncommon",     "bg": "#66BB6A", "labelColor": None,      "goldBadge": False},
    "R":   {"label": "Rare",         "bg": "#42A5F5", "labelColor": None,      "goldBadge": False},
    "RR":  {"label": "Double Rare",  "bg": "#FF7043", "labelColor": None,      "goldBadge": False},
    "UR":  {"label": "Ultra Rare", "bg": "#FF5E5B", "labelColor": "#FF5E5B", "goldBadge": False},
    "MAR":  {"label": "Mega Attack Rare", "bg": "#00ACC1", "labelColor": "#00ACC1", "goldBadge": False},
    "IR":  {"label": "Illus. Rare", "bg": "#FAC010", "labelColor": "#FAC010", "goldBadge": True},
    "SIR": {"label": "Special Illus. Rare",  "bg": "#EC407A", "labelColor": "#EC407A", "goldBadge": False},
    "MHR":  {"label": "Mega Hyper Rare",   "bg": "#AB47BC", "labelColor": "#AB47BC", "goldBadge": True},
}

COLOR_CARD_BG = "#FFFFFF"
COLOR_ART_BG = "#F4F4F4"
COLOR_WATERMARK = "#C5C5C5"
COLOR_TOTAL_TEXT = "#C0C0C0"
COLOR_RARITY_LABEL_DEFAULT = "#AAAAAA"
COLOR_FOOTER_BG = "#F7F7F7"
COLOR_FOOTER_RULE = "#EEEEEE"
COLOR_FOOTER_TEXT = "#C0C0C0"
COLOR_CARD_BORDER = "#DDDDDD"


# ════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════

def rounded_rect_path(path, x, y, w, h, r):
    """Append a rounded rectangle to a ReportLab path (Bezier corners)."""
    bezier_k = 0.5522847498
    corner_r = min(r, w / 2, h / 2)
    path.moveTo(x + corner_r, y)
    path.lineTo(x + w - corner_r, y)
    path.curveTo(x + w - corner_r + corner_r * bezier_k, y, x + w, y + corner_r - corner_r * bezier_k, x + w, y + corner_r)
    path.lineTo(x + w, y + h - corner_r)
    path.curveTo(x + w, y + h - corner_r + corner_r * bezier_k, x + w - corner_r + corner_r * bezier_k, y + h, x + w - corner_r, y + h)
    path.lineTo(x + corner_r, y + h)
    path.curveTo(x + corner_r - corner_r * bezier_k, y + h, x, y + h - corner_r + corner_r * bezier_k, x, y + h - corner_r)
    path.lineTo(x, y + corner_r)
    path.curveTo(x, y + corner_r - corner_r * bezier_k, x + corner_r - corner_r * bezier_k, y, x + corner_r, y)
    path.close()


def draw_text_spaced(c, x_start, y, text, font, size, spacing_pt):
    """Draw one char at a time; spacing_pt added after each glyph (points)."""
    c.setFont(font, size)
    current_x = x_start
    for ch in text:
        c.drawString(current_x, y, ch)
        current_x += c.stringWidth(ch, font, size) + spacing_pt
    total_width = current_x - x_start - spacing_pt
    return total_width


def draw_text_spaced_centered(c, center_x, y, text, font, size, spacing_pt):
    c.setFont(font, size)
    char_count = len(text)
    chars_width = sum(c.stringWidth(ch, font, size) for ch in text)
    total_width = chars_width + spacing_pt * max(char_count - 1, 0)
    start_x = center_x - total_width / 2
    current_x = start_x
    for ch in text:
        c.drawString(current_x, y, ch)
        current_x += c.stringWidth(ch, font, size) + spacing_pt
    return total_width


def spaced_text_width_pt(c, text, font, size, spacing_pt):
    if not text:
        return 0.0
    c.setFont(font, size)
    chars_width = sum(c.stringWidth(ch, font, size) for ch in text)
    return chars_width + spacing_pt * max(len(text) - 1, 0)


def draw_text_spaced_right(c, right_x, y, text, font, size, spacing_pt):
    c.setFont(font, size)
    char_count = len(text)
    chars_width = sum(c.stringWidth(ch, font, size) for ch in text)
    total_width = chars_width + spacing_pt * max(char_count - 1, 0)
    start_x = right_x - total_width
    current_x = start_x
    for ch in text:
        c.drawString(current_x, y, ch)
        current_x += c.stringWidth(ch, font, size) + spacing_pt


def font_ascent_descent_pt(font_name, font_size_pt):
    font = pdfmetrics.getFont(font_name)
    scale = font_size_pt / 1000.0
    return font.face.ascent * scale, font.face.descent * scale


def baseline_for_optical_center_y(optical_center_y, font_name, font_size_pt):
    ascent, descent = font_ascent_descent_pt(font_name, font_size_pt)
    return optical_center_y - (ascent + descent) / 2


def optical_center_y_from_baseline(baseline_y, font_name, font_size_pt):
    ascent, descent = font_ascent_descent_pt(font_name, font_size_pt)
    return baseline_y + (ascent + descent) / 2


def baseline_for_center(band_bottom, band_h, font_size_pt):
    """Baseline Y to vertically center text in a horizontal band (sans-serif heuristic)."""
    center_y = band_bottom + band_h / 2
    return center_y - 0.26 * font_size_pt


def baseline_from_top(section_top_rl, pad_top, font_size_pt):
    """Baseline for line with top padding and line-height 1.2 (ReportLab Y upward)."""
    half_leading = 0.1 * font_size_pt
    ascent = 0.72 * font_size_pt
    return section_top_rl - pad_top - half_leading - ascent


# ════════════════════════════════════════════════════════════
# CROP MARKS
# ════════════════════════════════════════════════════════════

CROP_LEN = 3 * mm
CROP_OFFSET = 0.5 * mm


def draw_crop_marks(c, x, y, w, h):
    c.saveState()
    c.setStrokeColor(HexColor("#999999"))
    c.setLineWidth(0.25)
    for corner_x, corner_y, outward_x, outward_y in [
        (x, y, -1, -1), (x + w, y, 1, -1),
        (x, y + h, -1, 1), (x + w, y + h, 1, 1),
    ]:
        c.line(corner_x + CROP_OFFSET * outward_x, corner_y,
               corner_x + (CROP_OFFSET + CROP_LEN) * outward_x, corner_y)
        c.line(corner_x, corner_y + CROP_OFFSET * outward_y,
               corner_x, corner_y + (CROP_OFFSET + CROP_LEN) * outward_y)
    c.restoreState()


# ════════════════════════════════════════════════════════════
# SINGLE CARD (x, y = bottom-left, Y upward)
# ════════════════════════════════════════════════════════════

def _parse_set_card_count(raw_value):
    raw_value = (raw_value or '').strip()
    if not raw_value:
        return None
    try:
        value = int(raw_value)
    except ValueError:
        return None
    return value if value > 0 else None


def _set_card_count_from_row(row):
    for key in ('set_card_count', 'setcardcount'):
        value = _parse_set_card_count(row.get(key, ''))
        if value is not None:
            return value
    return None


def _card_number_pad_width(set_total):
    return max(3, len(str(set_total)))


def draw_card(c, x, y, card, set_total, title, title_color, title_bg_color,
              show_type=True):
    card_number = card['number']
    card_name = card['name']
    card_type = card['type']
    rarity_code = card['rarity_code']

    rarity_info = RARITY_MAP.get(rarity_code, RARITY_MAP['C'])
    pad_width = _card_number_pad_width(set_total)
    number_display = str(card_number).zfill(pad_width)

    card_top_y = y + CARD_H
    header_bottom_y = card_top_y - HEADER_H
    name_row_bottom_y = header_bottom_y - NAME_H
    # Finish type (e.g. Non-holo) shares the rarity row; former type band height goes to art.
    art_zone_h = ART_H + TYPE_H
    art_zone_top_y = name_row_bottom_y
    art_zone_bottom_y = art_zone_top_y - art_zone_h
    rarity_row_bottom_y = art_zone_bottom_y - RARITY_H
    footer_top_y = rarity_row_bottom_y

    c.saveState()
    clip = c.beginPath()
    rounded_rect_path(clip, x, y, CARD_W, CARD_H, CARD_R)
    c.clipPath(clip, stroke=0, fill=0)

    c.setFillColor(white)
    c.rect(x, y, CARD_W, CARD_H, fill=1, stroke=0)

    c.setFillColor(HexColor(title_bg_color))
    c.rect(x, header_bottom_y, CARD_W, HEADER_H, fill=1, stroke=0)

    c.setFillColor(HexColor(title_color))
    header_center_y = header_bottom_y + HEADER_H / 2
    header_baseline_y = baseline_for_optical_center_y(
        header_center_y, "Helvetica-Bold", FONT_HEADER_PT)
    draw_text_spaced_centered(c, x + CARD_W / 2, header_baseline_y,
                              title.upper(), "Helvetica-Bold", FONT_HEADER_PT, LETTER_SPACE_HEADER_PT)

    c.setFillColor(HexColor(title_color))
    c.rect(x, header_bottom_y, CARD_W, HEADER_ACCENT_H, fill=1, stroke=0)

    name_baseline_y = baseline_from_top(header_bottom_y, NAME_PAD_TOP, FONT_NAME_PT)
    name_row_center_y = optical_center_y_from_baseline(
        name_baseline_y, "Helvetica-Bold", FONT_NAME_PT)

    c.setFont("Helvetica-Bold", FONT_BADGE_PT)
    badge_label = rarity_code
    badge_text_width = c.stringWidth(badge_label, "Helvetica-Bold", FONT_BADGE_PT)
    badge_line_height_pt = FONT_BADGE_PT * 1.2
    inner_w = badge_text_width + 2 * BADGE_PX
    inner_h = badge_line_height_pt + 2 * BADGE_PY
    badge_is_circle = False # len(badge_label) == 1

    if badge_is_circle:
        diameter_pt = max(inner_w, inner_h)
        badge_width_pt = diameter_pt
        badge_height_pt = diameter_pt
    else:
        badge_width_pt = inner_w
        badge_height_pt = inner_h

    badge_center_y = name_row_center_y
    badge_bottom_y = badge_center_y - badge_height_pt / 2
    badge_left_x = x + CARD_W - SIDE_PAD - badge_width_pt

    c.setFillColor(HexColor(rarity_info['bg']))
    if badge_is_circle:
        badge_cx = badge_left_x + badge_width_pt / 2
        c.circle(badge_cx, badge_center_y, badge_width_pt / 2, fill=1, stroke=0)
    else:
        badge_corner_r = min(
            BADGE_R,
            badge_width_pt / 2 - 0.25,
            badge_height_pt / 2 - 0.25,
        )
        badge_corner_r = 3.5 #max(badge_corner_r, 0.5)
        c.roundRect(badge_left_x, badge_bottom_y, badge_width_pt, badge_height_pt + 1,
                      badge_corner_r, fill=1, stroke=0)

    c.setFillColor(white)
    c.setFont("Helvetica-Bold", FONT_BADGE_PT)
    badge_text_baseline_y = baseline_for_optical_center_y(
        badge_center_y, "Helvetica-Bold", FONT_BADGE_PT)
    c.drawCentredString(badge_left_x + badge_width_pt / 2, badge_text_baseline_y, badge_label)
    c.setFillColor(HexColor(COLOR_CARD_NAME_TEXT))
    c.setFont("Helvetica-Bold", FONT_NAME_PT)

    name_max_width_pt = badge_left_x - (x + SIDE_PAD) - NAME_BADGE_GAP
    truncated_name = card_name
    while c.stringWidth(truncated_name, "Helvetica-Bold", FONT_NAME_PT) > name_max_width_pt and len(truncated_name) > 3:
        truncated_name = truncated_name[:-1]
    if truncated_name != card_name:
        truncated_name = truncated_name.rstrip() + "..."

    c.drawString(x + SIDE_PAD, name_baseline_y, truncated_name)

    art_left_x = x + ART_MARGIN
    art_width_pt = CARD_W - 2 * ART_MARGIN

    c.setFillColor(HexColor(COLOR_ART_BG))
    c.roundRect(art_left_x, art_zone_bottom_y, art_width_pt, art_zone_h, ART_R, fill=1, stroke=0)

    c.saveState()
    art_clip = c.beginPath()
    rounded_rect_path(art_clip, art_left_x, art_zone_bottom_y, art_width_pt, art_zone_h, ART_R)
    c.clipPath(art_clip, stroke=0, fill=0)

    c.setFillColor(HexColor(COLOR_WATERMARK))
    watermark_center_x = art_left_x + art_width_pt / 2
    watermark_baseline_y = baseline_for_center(art_zone_bottom_y, art_zone_h, FONT_WATERMARK_PT)
    draw_text_spaced_centered(c, watermark_center_x, watermark_baseline_y,
                              number_display, "Helvetica-Bold", FONT_WATERMARK_PT, LETTER_SPACE_WATERMARK_PT)

    c.restoreState()

    c.setFillColor(HexColor(COLOR_TOTAL_TEXT))
    c.setFont("Helvetica", FONT_TOTAL_PT)
    total_suffix = f"/ {str(set_total).zfill(pad_width)}"
    total_text_right_x = art_left_x + art_width_pt - ART_TOTAL_RIGHT
    total_baseline_y = art_zone_bottom_y + ART_TOTAL_BOTTOM
    c.drawRightString(total_text_right_x, total_baseline_y, total_suffix)

    rarity_label_color_hex = rarity_info.get('labelColor') or COLOR_RARITY_LABEL_DEFAULT
    rarity_label_font = "Helvetica"
    rarity_label = rarity_info['label']

    rarity_content_top_y = art_zone_bottom_y - RARITY_PAD_TOP
    rarity_content_bottom_y = rarity_row_bottom_y + RARITY_PAD_BOT
    rarity_band_h = rarity_content_top_y - rarity_content_bottom_y
    rarity_baseline_y = baseline_for_center(
        rarity_content_bottom_y, rarity_band_h, FONT_RARITY_PT)
    rarity_right_x = x + CARD_W - SIDE_PAD

    if show_type and card_type:
        type_text_left_x = x + SIDE_PAD
        rarity_text_w = spaced_text_width_pt(
            c, rarity_label, rarity_label_font, FONT_RARITY_PT, LETTER_SPACE_RARITY_PT)
        max_type_w = rarity_right_x - rarity_text_w - NAME_BADGE_GAP - type_text_left_x

        display_type = card_type
        while (spaced_text_width_pt(c, display_type, "Helvetica", FONT_RARITY_PT, LETTER_SPACE_RARITY_PT)
               > max_type_w and len(display_type) > 3):
            display_type = display_type[:-1]
        if display_type != card_type:
            display_type = display_type.rstrip() + "..."

        c.setFillColor(HexColor(COLOR_RARITY_LABEL_DEFAULT))
        draw_text_spaced(c, type_text_left_x, rarity_baseline_y,
                         display_type, "Helvetica", FONT_RARITY_PT, LETTER_SPACE_RARITY_PT)

    c.setFillColor(HexColor(rarity_label_color_hex))
    draw_text_spaced_right(c, rarity_right_x, rarity_baseline_y,
                           rarity_label, rarity_label_font, FONT_RARITY_PT, LETTER_SPACE_RARITY_PT)

    c.setFillColor(HexColor(COLOR_FOOTER_BG))
    c.rect(x, y, CARD_W, FOOTER_H, fill=1, stroke=0)

    c.setStrokeColor(HexColor(COLOR_FOOTER_RULE))
    c.setLineWidth(0.5)
    c.line(x, footer_top_y, x + CARD_W, footer_top_y)

    footer_baseline_y = baseline_for_center(y, FOOTER_H, FONT_FOOTER_PT)

    c.setFillColor(HexColor(COLOR_FOOTER_TEXT))
    draw_text_spaced_centered(c, x + CARD_W / 2, footer_baseline_y,
                              "kollekt.gg", "Helvetica", FONT_FOOTER_PT, LETTER_SPACE_FOOTER_PT)

    c.restoreState()

    c.setStrokeColor(HexColor(COLOR_CARD_BORDER))
    c.setLineWidth(0.5)
    card_outline = c.beginPath()
    rounded_rect_path(card_outline, x, y, CARD_W, CARD_H, CARD_R)
    c.drawPath(card_outline, stroke=1, fill=0)


# ════════════════════════════════════════════════════════════
# PDF BUILD
# ════════════════════════════════════════════════════════════

def generate_pdf(cards, title, title_color, title_bg_color, output_path,
                 show_type=True, set_total=None):
    card_count = len(cards)
    if set_total is None:
        set_total = card_count
    page_count = math.ceil(card_count / CARDS_PER_PAGE)

    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle(f"{title} - Binder Placeholders | kollekt.gg")
    c.setAuthor("kollekt.gg")

    for page_index in range(page_count):
        slice_start = page_index * CARDS_PER_PAGE
        slice_end = min(slice_start + CARDS_PER_PAGE, card_count)
        cards_on_page = cards[slice_start:slice_end]

        for slot_index, card in enumerate(cards_on_page):
            column_index = slot_index % COLS
            row_index = ROWS - 1 - (slot_index // COLS)
            card_left_x = MARGIN_X + column_index * (CARD_W + GAP)
            card_bottom_y = MARGIN_Y + row_index * (CARD_H + GAP)

            card_set_total = card.get('set_card_count') or set_total
            draw_card(c, card_left_x, card_bottom_y, card, card_set_total,
                      title, title_color, title_bg_color, show_type=show_type)
            draw_crop_marks(c, card_left_x, card_bottom_y, CARD_W, CARD_H)

        c.setFont("Helvetica", 6)
        c.setFillColor(HexColor("#BBBBBB"))
        c.drawCentredString(PAGE_W / 2, MARGIN_Y - 8 * mm,
                            f"Page {page_index + 1} of {page_count}  \u00b7  {title}  \u00b7  kollekt.gg")

        if page_index < page_count - 1:
            c.showPage()

    c.save()
    return output_path


# ════════════════════════════════════════════════════════════
# CSV
# ════════════════════════════════════════════════════════════

def parse_csv(file_stream):
    parsed_cards = []
    csv_set_total = None
    text = file_stream.read().decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames:
        reader.fieldnames = [f.strip().lower().replace(' ', '_') for f in reader.fieldnames]
    for row in reader:
        try:
            number = int(row.get('number', '0').strip())
        except ValueError:
            number = 0
        name = row.get('name', '').strip()
        card_type = row.get('type', '').strip()
        rarity_code = row.get('rarity_code', 'C').strip()
        row_set_total = _set_card_count_from_row(row)
        if row_set_total is not None and csv_set_total is None:
            csv_set_total = row_set_total
        if name:
            card = {
                'number': number, 'name': name,
                'type': card_type, 'rarity_code': rarity_code,
            }
            if row_set_total is not None:
                card['set_card_count'] = row_set_total
            parsed_cards.append(card)
    parsed_cards.sort(key=lambda row: row['number'])
    return parsed_cards, csv_set_total


# ════════════════════════════════════════════════════════════
# FLASK
# ════════════════════════════════════════════════════════════

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')


@app.route('/generate', methods=['POST'])
def generate():
    title = request.form.get('title', 'Ascended Heroes').strip()
    title_color = request.form.get('title_color', '#FAC010').strip()
    title_bg_color = request.form.get('title_bg_color', '#4A4A49').strip()
    show_type = request.form.get('show_type') == '1'

    for hex_color in [title_color, title_bg_color]:
        if not hex_color.startswith('#') or len(hex_color) not in (4, 7):
            return "Invalid hex color format. Use #RGB or #RRGGBB.", 400

    uploaded_csv = request.files.get('csv_file')
    if not uploaded_csv or uploaded_csv.filename == '':
        return "No CSV file uploaded.", 400

    try:
        cards, csv_set_total = parse_csv(uploaded_csv.stream)
    except Exception as e:
        return f"Error parsing CSV: {str(e)}", 400

    if not cards:
        return "No valid cards found in CSV.", 400

    form_set_total = _parse_set_card_count(request.form.get('set_card_count'))
    set_total = form_set_total or csv_set_total

    safe_stem = "".join(ch for ch in title if ch.isalnum() or ch in (' ', '-', '_')).strip()
    filename = f"{safe_stem.replace(' ', '_')}_placeholders.pdf"
    output_path = os.path.join(tempfile.gettempdir(), filename)

    try:
        generate_pdf(cards, title, title_color, title_bg_color, output_path,
                     show_type=show_type, set_total=set_total)
    except Exception as e:
        return f"Error generating PDF: {str(e)}", 500

    return send_file(output_path, as_attachment=True, download_name=filename,
                     mimetype='application/pdf')


if __name__ == '__main__':
    # Default 5001 avoids macOS Control Center (AirPlay) on 5000; override with PORT=...
    port = int(os.environ.get('PORT', '5001'))
    app.run(debug=True, host='0.0.0.0', port=port)
