# Encodes the captured swing frames (tools/out/swing/*.png) as AVIF into assets/story-swing/.
# python tools/swing-encode.py [quality]
import glob, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DARK = "--dark" in sys.argv
if DARK: sys.argv.remove("--dark")
SRC = os.path.join(HERE, "out", "swing-dark" if DARK else "swing")
OUT = os.path.join(HERE, "..", "assets", "story-swing-dark" if DARK else "story-swing")
os.makedirs(OUT, exist_ok=True)
q = int(sys.argv[1]) if len(sys.argv) > 1 else 62
total = 0
for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
    im = Image.open(f).convert("RGB")
    name = os.path.splitext(os.path.basename(f))[0]
    # the shot includes a 4 px margin each side; crop to the frame
    w, h = im.size
    m = round(4 * (2560 / 1600 if name.startswith("land") else 1080 / 900))
    im = im.crop((m, m, w - m, h - m))
    out = os.path.join(OUT, name + ".avif")
    im.save(out, "AVIF", quality=q, speed=6)
    total += os.path.getsize(out)
print("frames", len(glob.glob(os.path.join(OUT, "*.avif"))), "total KB", total // 1024)
