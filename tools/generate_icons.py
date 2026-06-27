import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def rgba(hex_color):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def blend(a, b, t):
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(4))


def rounded_rect(px, size, x0, y0, x1, y1, r, color):
    for y in range(max(0, y0), min(size, y1)):
        for x in range(max(0, x0), min(size, x1)):
            dx = max(x0 + r - x, 0, x - (x1 - r - 1))
            dy = max(y0 + r - y, 0, y - (y1 - r - 1))
            if dx * dx + dy * dy <= r * r:
                px[y][x] = color


def rect(px, size, x0, y0, x1, y1, color):
    for y in range(max(0, y0), min(size, y1)):
        for x in range(max(0, x0), min(size, x1)):
            px[y][x] = color


def write_png(path, pixels):
    h = len(pixels)
    w = len(pixels[0])
    raw = b"".join(b"\x00" + b"".join(bytes(pixel) for pixel in row) for row in pixels)

    def chunk(kind, data):
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    data = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(data)


def make_icon(size):
    top = rgba("#111827")
    bottom = rgba("#0f766e")
    pixels = []
    for y in range(size):
        t = y / max(size - 1, 1)
        row = [blend(top, bottom, t) for _ in range(size)]
        pixels.append(row)

    s = size
    shadow = (0, 0, 0, 80)
    paper = rgba("#f8fafc")
    paper2 = rgba("#dbeafe")
    blue = rgba("#2563eb")
    green = rgba("#22c55e")
    dark = rgba("#1f2937")

    rounded_rect(pixels, s, int(s * .28), int(s * .18), int(s * .76), int(s * .74), int(s * .055), shadow)
    rounded_rect(pixels, s, int(s * .24), int(s * .14), int(s * .72), int(s * .70), int(s * .055), paper2)
    rounded_rect(pixels, s, int(s * .34), int(s * .27), int(s * .82), int(s * .83), int(s * .055), paper)

    rect(pixels, s, int(s * .40), int(s * .40), int(s * .76), int(s * .45), blue)
    rect(pixels, s, int(s * .40), int(s * .50), int(s * .70), int(s * .54), dark)
    rect(pixels, s, int(s * .40), int(s * .59), int(s * .73), int(s * .63), dark)

    rounded_rect(pixels, s, int(s * .17), int(s * .66), int(s * .50), int(s * .86), int(s * .04), green)
    rect(pixels, s, int(s * .27), int(s * .75), int(s * .41), int(s * .78), paper)
    rect(pixels, s, int(s * .34), int(s * .69), int(s * .37), int(s * .84), paper)
    return pixels


for icon_size in (180, 192, 512):
    write_png(ROOT / "icons" / f"icon-{icon_size}.png", make_icon(icon_size))
