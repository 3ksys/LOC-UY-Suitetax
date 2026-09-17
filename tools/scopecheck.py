"""Chequeo de alcance heurístico: identificadores usados que ningún scope declara.
Mismo tipo de chequeo que atrapó 3 bugs en TRS. Heurístico: puede dar falsos positivos
(claves de objeto sin comillas), nunca debería dar falsos negativos sobre variables libres."""
import re, sys, pathlib

src = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")

# quitar comentarios y strings
src = re.sub(r"/\*.*?\*/", " ", src, flags=re.S)
src = re.sub(r"//[^\n]*", " ", src)
src = re.sub(r"'(?:\\.|[^'\\\n])*'|\"(?:\\.|[^\"\\\n])*\"|`(?:\\.|[^`\\])*`", '""', src, flags=re.S)

GLOBALS = {"log", "Map", "String", "Array", "JSON", "Object", "Number", "Boolean", "Math", "Date",
           "parseFloat", "parseInt", "isNaN", "undefined", "null", "true", "false", "define",
           "require", "console", "Error", "Set", "RegExp", "arguments"}
KEYWORDS = {"function", "return", "if", "else", "for", "while", "do", "try", "catch", "finally",
            "const", "let", "var", "new", "typeof", "instanceof", "in", "of", "this", "throw",
            "break", "continue", "switch", "case", "default", "void", "delete"}

declared = set(GLOBALS)
# parámetros de función
for m in re.finditer(r"function\s*([A-Za-z_$][\w$]*)?\s*\(([^)]*)\)", src):
    if m.group(1): declared.add(m.group(1))
    for p in m.group(2).split(","):
        p = p.strip()
        if p: declared.add(p)
# arrow params
for m in re.finditer(r"\(([^()]*)\)\s*=>", src):
    for p in m.group(1).split(","):
        p = p.strip()
        if p: declared.add(p)
for m in re.finditer(r"\b([A-Za-z_$][\w$]*)\s*=>", src):
    declared.add(m.group(1))
# const/let/var (incluye destructuring simple)
for m in re.finditer(r"\b(?:const|let|var)\s+([^=;]+?)\s*(?:=|;|\bof\b|\bin\b)", src):
    for p in re.split(r"[,{}\[\]\s]+", m.group(1)):
        if p: declared.add(p)
# catch (e)
for m in re.finditer(r"catch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)", src):
    declared.add(m.group(1))

used = {}
for m in re.finditer(r"(?<![\w$.])([A-Za-z_$][\w$]*)\b(?!\s*:)", src):
    ident = m.group(1)
    if ident in KEYWORDS or ident in declared:
        continue
    used.setdefault(ident, 0)
    used[ident] += 1

if used:
    print("POSIBLES VARIABLES LIBRES (revisar):")
    for k, v in sorted(used.items()):
        print(f"  {k}  x{v}")
    sys.exit(1)
print("scope check: sin variables libres")
