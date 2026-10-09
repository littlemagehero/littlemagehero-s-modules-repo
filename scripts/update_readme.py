import json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / "json/modules.json").read_text(encoding="utf-8"))
mods = data.get("modules", []) if isinstance(data, dict) else data

rows = ["| Module | Author | Version | Description |", "|---|---|---|---|"]
for m in sorted(mods, key=lambda m: str(m.get("name", "")).lower()):
    desc = str(m.get("description", "-")).replace("\\n", " ").replace("\n", " ").replace("|", "/").strip()
    rows.append(f"| {m.get('name', m.get('id', '?'))} | {m.get('author', '-')} | {m.get('version', '-')} | {desc} |")

readme = root / "README.md"
text = readme.read_text(encoding="utf-8")
s, e = "<!-- MODULES:START -->", "<!-- MODULES:END -->"
a, b = text.index(s) + len(s), text.index(e)
readme.write_text(text[:a] + "\n" + "\n".join(rows) + "\n" + text[b:], encoding="utf-8")
