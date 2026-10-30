import json, sys
from pypdf import PdfReader

r = PdfReader(sys.argv[1])
schriften, tabs = set(), 0
for s in r.pages:
    f = s.get("/Resources", {}).get("/Font", {})
    for k in f:
        o = f[k].get_object()
        d = o.get("/DescendantFonts")
        fd = o.get("/FontDescriptor") if d is None else d[0].get_object().get("/FontDescriptor")
        fd = fd.get_object() if fd else {}
        schriften.add((str(o.get("/BaseFont")), any(x in fd for x in ("/FontFile", "/FontFile2", "/FontFile3"))))
m = r.metadata
kat = r.trailer["/Root"]
print(json.dumps({
    "seiten": len(r.pages),
    "text": [s.extract_text() for s in r.pages],
    "schriften": sorted(schriften),
    "titel": str(m.title), "autor": str(m.get("/Author")), "keywords": str(m.get("/Keywords")), "sprache": str(kat.get("/Lang")),
    "bilder": sum(len(s.images) for s in r.pages),
}, ensure_ascii=False))
