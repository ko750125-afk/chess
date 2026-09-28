import os
from PIL import Image
import numpy as np
from collections import deque

SOURCE_IMG_PATH = r"C:\Users\USER\.gemini\antigravity-ide\brain\e5907eb6-1db7-4789-a804-1627f575c8f2\.user_uploaded\media_1790601448459.png"
OUTPUT_DIR = r"d:\000_New Projects\Chess\public\pieces"

CANVAS_SIZE = 256
TARGET_KING_HEIGHT = 246  # King takes ~96% of the 256px cell height!
BASELINE_Y = 252          # Base sits 4px above the bottom

PIECES_META = [
    # Black pieces
    ("black", "king",   (1, 21, 96, 241)),
    ("black", "queen",  (109, 51, 198, 241)),
    ("black", "bishop", (209, 74, 294, 241)),
    ("black", "knight", (306, 90, 390, 241)),
    ("black", "rook",   (388, 98, 480, 236)),
    ("black", "pawn",   (487, 119, 558, 241)),
    # White pieces
    ("white", "king",   (3, 276, 96, 490)),
    ("white", "queen",  (113, 306, 200, 497)),
    ("white", "bishop", (215, 328, 298, 497)),
    ("white", "knight", (307, 346, 390, 497)),
    ("white", "rook",   (398, 355, 480, 500)),
    ("white", "pawn",   (487, 375, 559, 497)),
]

def extract_tight_piece(src_img, color, box):
    crop = src_img.crop(box).convert("RGBA")
    arr = np.array(crop)
    h, w, _ = arr.shape
    
    r = arr[:, :, 0].astype(float)
    g = arr[:, :, 1].astype(float)
    b = arr[:, :, 2].astype(float)
    
    if color == "black":
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        alpha = np.clip((242 - lum) / (242 - 210) * 255.0, 0, 255).astype(np.uint8)
        arr[:, :, 3] = alpha
    else:
        is_bg_candidate = (
            (r >= 238) & (g >= 238) & (b >= 235) &
            (np.abs(r - b) <= 9) & (np.abs(g - b) <= 7)
        )
        
        bg_mask = np.zeros((h, w), dtype=bool)
        visited = np.zeros((h, w), dtype=bool)
        queue = deque()
        
        for x in range(w):
            for y in [0, h - 1]:
                if is_bg_candidate[y, x] and not visited[y, x]:
                    visited[y, x] = True
                    queue.append((y, x))
        for y in range(h):
            for x in [0, w - 1]:
                if is_bg_candidate[y, x] and not visited[y, x]:
                    visited[y, x] = True
                    queue.append((y, x))
                    
        dirs = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]
        while queue:
            cy, cx = queue.popleft()
            bg_mask[cy, cx] = True
            for dy, dx in dirs:
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w:
                    if not visited[ny, nx] and is_bg_candidate[ny, nx]:
                        visited[ny, nx] = True
                        queue.append((ny, nx))
        
        alpha = np.full((h, w), 255, dtype=np.uint8)
        alpha[bg_mask] = 0
        
        fg_mask = ~bg_mask
        for y in range(h):
            for x in range(w):
                if fg_mask[y, x]:
                    is_edge = False
                    for dy, dx in [(-1,0), (1,0), (0,-1), (0,1)]:
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and bg_mask[ny, nx]:
                            is_edge = True
                            break
                    if is_edge:
                        diff = max(255 - r[y, x], 255 - g[y, x], 255 - b[y, x], (r[y, x] - b[y, x]) * 3)
                        a = np.clip(diff * 4.0, 90, 255)
                        alpha[y, x] = int(a)
                        
        arr[:, :, 3] = alpha

    tight = Image.fromarray(arr, "RGBA")
    bbox = tight.getbbox()
    if bbox:
        tight = tight.crop(bbox)
    return tight

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    src_img = Image.open(SOURCE_IMG_PATH)
    
    # 1. First extract all tight images
    tight_pieces = {}
    for color, ptype, box in PIECES_META:
        tight = extract_tight_piece(src_img, color, box)
        tight_pieces[(color, ptype)] = tight
        tight.save(os.path.join(OUTPUT_DIR, f"{color}_{ptype}_tight.png"), "PNG")

    # 2. Determine global scale so that the King height reaches TARGET_KING_HEIGHT
    king_h_white = tight_pieces[("white", "king")].height
    king_h_black = tight_pieces[("black", "king")].height
    max_king_h = max(king_h_white, king_h_black)
    scale_factor = TARGET_KING_HEIGHT / max_king_h
    print(f"Original King height: {max_king_h}px, Target: {TARGET_KING_HEIGHT}px -> Scale factor: {scale_factor:.4f}")

    # 3. Scale all pieces proportionally and place them on the 256x256 canvas
    for (color, ptype), tight in tight_pieces.items():
        new_w = int(round(tight.width * scale_factor))
        new_h = int(round(tight.height * scale_factor))
        
        # High quality Lanczos resize
        scaled = tight.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        norm = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
        pos_x = (CANVAS_SIZE - new_w) // 2
        pos_y = BASELINE_Y - new_h
        
        # Paste onto canvas
        norm.paste(scaled, (pos_x, pos_y), scaled)
        
        out_file = os.path.join(OUTPUT_DIR, f"{color}_{ptype}.png")
        norm.save(out_file, "PNG")
        print(f"Generated {color}_{ptype}.png: {new_w}x{new_h} at ({pos_x}, {pos_y}) on {CANVAS_SIZE}x{CANVAS_SIZE}")

    print("All pieces successfully enlarged and normalized to fill the cell!")

if __name__ == "__main__":
    main()
