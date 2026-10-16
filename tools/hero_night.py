# The home hero's night layers (assets/hero/img/night/). Hills and cab come straight from the approved night pass
# (freight-journey/assets/final/night, built from the same day masters the site uses); the site's own guardrail
# and ground texture are relit with that pass's relight(), so every layer keeps its exact geometry and alpha.
# python tools/hero_night.py
import importlib.util, shutil, sys
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SITE = HERE.parent / "assets" / "hero" / "img"
OUT = SITE / "night"
FJ = HERE.parents[1] / "freight-journey"
spec = importlib.util.spec_from_file_location("bna", FJ / "tools" / "build_night_assets.py")
bna = importlib.util.module_from_spec(spec); sys.modules["bna"] = bna; spec.loader.exec_module(bna)

OUT.mkdir(exist_ok=True)
for name in ("hills", "cab-interior"):
    shutil.copyfile(FJ / "assets" / "final" / "night" / "webp" / f"{name}.webp", OUT / f"{name}.webp")
for name, grade in (("guardrail", "guardrail"), ("ground", "road-shoulder")):
    src = Image.open(SITE / f"{name}.webp")
    night = bna.relight(grade, src)
    night.save(OUT / f"{name}.webp", "WEBP", quality=88, method=4, exact=True)
for f in sorted(OUT.glob("*.webp")):
    im = Image.open(f); print(f.name, im.size, im.mode, f.stat().st_size // 1024, "KB")
