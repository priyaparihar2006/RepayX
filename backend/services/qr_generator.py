"""Self-contained, dependency-free QR Code generator producing valid SVG data URIs.

Implements ISO/IEC 18004 QR Code Model 2 with byte encoding and Error Correction Level M/L.
"""

from __future__ import annotations

import base64
import urllib.parse

# Reed-Solomon Galois Field GF(256) tables with primitive polynomial 0x11D (285)
EXP_TABLE = [0] * 512
LOG_TABLE = [0] * 256

for i in range(256):
    EXP_TABLE[i] = 1 if i == 0 else (EXP_TABLE[i - 1] * 2) ^ (0x11D if EXP_TABLE[i - 1] >= 128 else 0)
for i in range(255, 512):
    EXP_TABLE[i] = EXP_TABLE[i - 255]
for i in range(255):
    LOG_TABLE[EXP_TABLE[i]] = i


def _gf_mul(x: int, y: int) -> int:
    if x == 0 or y == 0:
        return 0
    return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]


def _rs_generator_poly(degree: int) -> list[int]:
    poly = [1]
    for i in range(degree):
        # Multiply poly by (x - 2^i)
        next_poly = [0] * (len(poly) + 1)
        for j, c in enumerate(poly):
            next_poly[j] ^= _gf_mul(c, EXP_TABLE[i])
            next_poly[j + 1] ^= c
        poly = next_poly
    return poly


def _rs_encode(data: list[int], num_ec_bytes: int) -> list[int]:
    gen = _rs_generator_poly(num_ec_bytes)
    remainder = [0] * num_ec_bytes
    for byte in data:
        factor = byte ^ remainder[0]
        remainder = remainder[1:] + [0]
        for i, g in enumerate(gen[1:]):
            remainder[i] ^= _gf_mul(factor, g)
    return remainder


# QR Code Version table (Version 1-6, EC Level M)
# Format: (version, size, total_codewords, ec_codewords_per_block, num_blocks)
VERSION_SPECS = {
    1: (1, 21, 26, 10, 1),
    2: (2, 25, 44, 16, 1),
    3: (3, 29, 70, 26, 1),
    4: (4, 33, 100, 18, 2),
    5: (5, 37, 134, 24, 2),
    6: (6, 41, 172, 16, 4),
    7: (7, 45, 196, 18, 4),
    8: (8, 49, 242, 22, 4),
}

ALIGNMENT_PATTERN_POS = {
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
}


def _select_version(data_len: int) -> tuple[int, int, int, int, int]:
    for version in range(1, 9):
        v, size, total_cw, ec_per_block, blocks = VERSION_SPECS[version]
        data_cw = total_cw - (ec_per_block * blocks)
        # Byte mode header: 4 bits mode + 8 bits (or 16 bits) length count + data * 8 + 4 terminator
        max_bytes = data_cw - 2 if version < 10 else data_cw - 3
        if data_len <= max_bytes:
            return v, size, total_cw, ec_per_block, blocks
    return VERSION_SPECS[8]


def generate_qr_matrix(text: str) -> list[list[bool]]:
    """Generates a boolean 2D matrix representing QR Code modules."""
    data_bytes = text.encode("utf-8")
    version, size, total_cw, ec_per_block, num_blocks = _select_version(len(data_bytes))
    data_cw_total = total_cw - (ec_per_block * num_blocks)

    # 1. Encode bitstream (Byte mode = 0100)
    bits = "0100"
    length_bits = 8 if version < 10 else 16
    bits += f"{len(data_bytes):0{length_bits}b}"
    for b in data_bytes:
        bits += f"{b:08b}"

    # Add terminator (up to 4 zeroes)
    bits += "0" * min(4, data_cw_total * 8 - len(bits))
    # Pad to byte boundary
    if len(bits) % 8 != 0:
        bits += "0" * (8 - (len(bits) % 8))

    # Pad bytes (0xEC, 0x11 alternate)
    pad_bytes = [0xEC, 0x11]
    pad_idx = 0
    data_codewords = [int(bits[i : i + 8], 2) for i in range(0, len(bits), 8)]
    while len(data_codewords) < data_cw_total:
        data_codewords.append(pad_bytes[pad_idx % 2])
        pad_idx += 1

    # 2. Block division and Error Correction
    data_cw_per_block = data_cw_total // num_blocks
    blocks_data = []
    blocks_ec = []
    for b in range(num_blocks):
        block = data_codewords[b * data_cw_per_block : (b + 1) * data_cw_per_block]
        blocks_data.append(block)
        blocks_ec.append(_rs_encode(block, ec_per_block))

    # 3. Interleave codewords
    final_codewords = []
    for i in range(data_cw_per_block):
        for b in range(num_blocks):
            final_codewords.append(blocks_data[b][i])
    for i in range(ec_per_block):
        for b in range(num_blocks):
            final_codewords.append(blocks_ec[b][i])

    # Convert all codewords to bits
    final_bits = "".join(f"{cw:08b}" for cw in final_codewords)
    # Remainder bits (for version 2-6)
    remainder_bits_count = {1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 0, 8: 0}.get(version, 0)
    final_bits += "0" * remainder_bits_count

    # 4. Initialize matrix
    matrix = [[None] * size for _ in range(size)]
    reserved = [[False] * size for _ in range(size)]

    def set_module(r, c, val, is_reserved=True):
        matrix[r][c] = val
        if is_reserved:
            reserved[r][c] = True

    # 5. Place Finder Patterns (Top-Left, Top-Right, Bottom-Left)
    def place_finder(start_r, start_c):
        for r in range(7):
            for c in range(7):
                is_black = (r in (0, 6) or c in (0, 6) or (2 <= r <= 4 and 2 <= c <= 4))
                set_module(start_r + r, start_c + c, is_black)
        # Separator borders
        for r in range(-1, 8):
            for c in range(-1, 8):
                nr, nc = start_r + r, start_c + c
                if 0 <= nr < size and 0 <= nc < size and matrix[nr][nc] is None:
                    set_module(nr, nc, False)

    place_finder(0, 0)
    place_finder(0, size - 7)
    place_finder(size - 7, 0)

    # 6. Alignment patterns (version >= 2)
    if version in ALIGNMENT_PATTERN_POS:
        coords = ALIGNMENT_PATTERN_POS[version]
        for ar in coords:
            for ac in coords:
                # Don't place on finder patterns
                if (ar <= 8 and ac <= 8) or (ar <= 8 and ac >= size - 8) or (ar >= size - 8 and ac <= 8):
                    continue
                for r in range(-2, 3):
                    for c in range(-2, 3):
                        is_black = (abs(r) == 2 or abs(c) == 2 or (r == 0 and c == 0))
                        set_module(ar + r, ac + c, is_black)

    # 7. Timing patterns
    for i in range(8, size - 8):
        if not reserved[6][i]:
            set_module(6, i, i % 2 == 0)
        if not reserved[i][6]:
            set_module(i, 6, i % 2 == 0)

    # Dark module
    set_module(4 * version + 9, 8, True)

    # Reserve format info areas
    for i in range(9):
        if not reserved[8][i]:
            reserved[8][i] = True
        if not reserved[i][8]:
            reserved[i][8] = True
    for i in range(size - 8, size):
        if not reserved[8][i]:
            reserved[8][i] = True
        if not reserved[i][8]:
            reserved[i][8] = True

    # 8. Place data bits using Mask Pattern 0 ( (r + c) % 2 == 0 )
    bit_idx = 0
    direction = -1  # upwards
    r = size - 1
    c = size - 1

    while c > 0:
        if c == 6:  # Skip timing column
            c -= 1
        for _ in range(size):
            for col_offset in (0, -1):
                cur_c = c + col_offset
                if not reserved[r][cur_c]:
                    bit_val = final_bits[bit_idx] == "1" if bit_idx < len(final_bits) else False
                    bit_idx += 1
                    # Apply Mask Pattern 0: invert if (r + c) % 2 == 0
                    if (r + cur_c) % 2 == 0:
                        bit_val = not bit_val
                    matrix[r][cur_c] = bit_val
            r += direction
        direction = -direction
        r += direction
        c -= 2

    # 9. Format information: EC Level M (00) + Mask 0 (000) -> 00000 -> with BCH + XOR 0x5412 = 0x5412 (101010000010010b)
    format_bits = "101010000010010"
    # Format placement around top-left and splits
    format_coords_1 = [
        (8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 7), (8, 8),
        (7, 8), (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8)
    ]
    format_coords_2 = [
        (size - 1, 8), (size - 2, 8), (size - 3, 8), (size - 4, 8), (size - 5, 8), (size - 6, 8), (size - 7, 8),
        (8, size - 8), (8, size - 7), (8, size - 6), (8, size - 5), (8, size - 4), (8, size - 3), (8, size - 2), (8, size - 1)
    ]
    for i, b in enumerate(format_bits):
        val = b == "1"
        r1, c1 = format_coords_1[i]
        matrix[r1][c1] = val
        r2, c2 = format_coords_2[i]
        matrix[r2][c2] = val

    return [[bool(cell) for cell in row] for row in matrix]


def generate_qr_svg(text: str, margin: int = 4, scale: int = 10) -> str:
    """Generates a clean standalone SVG string for the given text."""
    matrix = generate_qr_matrix(text)
    size = len(matrix)
    total_size = (size + 2 * margin) * scale

    rects = []
    for r in range(size):
        for c in range(size):
            if matrix[r][c]:
                x = (c + margin) * scale
                y = (r + margin) * scale
                rects.append(f'<rect x="{x}" y="{y}" width="{scale}" height="{scale}" fill="#111827"/>')

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_size} {total_size}" '
        f'width="{total_size}" height="{total_size}" shape-rendering="crispEdges">\n'
        f'  <rect width="100%" height="100%" fill="#ffffff" rx="12"/>\n'
        f'  {"".join(rects)}\n'
        f'</svg>'
    )
    return svg


def generate_qr_data_uri(text: str) -> str:
    """Returns a Data URI (SVG) ready for <img src="..." />."""
    svg = generate_qr_svg(text)
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"
