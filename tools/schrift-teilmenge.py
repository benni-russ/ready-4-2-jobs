# Baut die TTF-Dateien in tools/schrift/ für das PDF aus den Teilmengen von @fontsource/ibm-plex-sans:
# Lateinisch, Latin Extended und Vietnamesisch. Griechisch und Kyrillisch bleiben draußen, die App warnt dort.
# Nur für die Entwicklung. Braucht fonttools und brotli.
# Aufruf: python tools/schrift-teilmenge.py <ordner-mit-fontsource-files>
import pathlib, sys, tempfile
from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont

quelle = pathlib.Path(sys.argv[1])
ziel = pathlib.Path(__file__).parent / "schrift"
SCHNITTE = {"Regular": "400-normal", "Bold": "700-normal", "Italic": "400-italic", "BoldItalic": "700-italic"}
TEILE = ["latin", "latin-ext", "vietnamese"]

optionen = subset.Options()
optionen.hinting = False
optionen.layout_features = ["kern", "mark", "mkmk", "ccmp", "locl"]
optionen.name_IDs = ["*"]
optionen.notdef_outline = True

with tempfile.TemporaryDirectory() as tmp:
    for name, stil in SCHNITTE.items():
        vorhanden, dateien = set(), []
        for teil in TEILE:
            f = TTFont(quelle / f"ibm-plex-sans-{teil}-{stil}.woff2")
            neu = set(f.getBestCmap()) - vorhanden
            vorhanden |= neu
            s = subset.Subsetter(optionen)
            s.populate(unicodes=neu)
            s.subset(f)
            f.flavor = None
            pfad = pathlib.Path(tmp) / f"{teil}-{name}.ttf"
            f.save(pfad)
            dateien.append(str(pfad))
        Merger().merge(dateien).save(ziel / f"IBMPlexSans-{name}.ttf")
        print(name, len(vorhanden))
