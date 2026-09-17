"""Chequeo de ALCANCE DE BLOQUE: let/const declarados dentro de un bloque {} y usados fuera de el,
dentro de la misma funcion.

Complementa scopecheck.py (que solo ve identificadores que NINGUN scope declara). Este ve el caso
que aquel no ve: la variable existe, pero en un bloque que no cubre el uso. Es el bug que la prueba
de humo del 2026-09-17 atrapo en Transaccion (Servidor)_REF: `let idTransaccion` dentro del
`if (CREATE||EDIT)` y dos usos despues del `if`, en la misma funcion
(ReferenceError: idTransaccion is not defined, beforeSubmit :1952:59).

Control positivo obligatorio: sobre el REF de TRS previo al fix (git 910368e) debe marcar
idTransaccion en las lineas 1952 y 1957. Si no lo marca, el chequeo esta roto y no vale para los
demas archivos.

Uso:  python tools/blockscope.py "LOC UY/<script>_REF.js" [...]    (exit 1 si hay hallazgos)
"""
import re, sys, pathlib


def strip(src):
    def blank(m):
        return re.sub(r"[^\n]", " ", m.group(0))
    src = re.sub(r"/\*.*?\*/", blank, src, flags=re.S)
    src = re.sub(r"//[^\n]*", blank, src)
    src = re.sub(r"'(?:\\.|[^'\\\n])*'", blank, src)
    src = re.sub(r'"(?:\\.|[^"\\\n])*"', blank, src)
    src = re.sub(r"`(?:\\.|[^`\\])*`", blank, src, flags=re.S)
    return src


def matching_open_paren(src, close_pos):
    depth = 0
    for i in range(close_pos, -1, -1):
        if src[i] == ")":
            depth += 1
        elif src[i] == "(":
            depth -= 1
            if depth == 0:
                return i
    return -1


def analyze(path):
    src = strip(pathlib.Path(path).read_text(encoding="utf-8"))
    stack, blocks = [], []
    for i, ch in enumerate(src):
        if ch == "{":
            stack.append(i)
        elif ch == "}" and stack:
            blocks.append((stack.pop(), i))
    blocks.sort()

    # Bloques que son cuerpo de funcion, con su lista de parametros.
    func_blocks, func_params = [], {}
    for a, b in blocks:
        j = a - 1
        while j >= 0 and src[j].isspace():
            j -= 1
        if j >= 1 and src[j - 1:j + 1] == "=>":
            k = j - 2
            while k >= 0 and src[k].isspace():
                k -= 1
            if src[k] == ")":
                op = matching_open_paren(src, k)
                func_blocks.append((a, b)); func_params[(a, b)] = src[op + 1:k]
            else:
                m = re.search(r"([A-Za-z_$][\w$]*)\s*$", src[:k + 1])
                func_blocks.append((a, b)); func_params[(a, b)] = m.group(1) if m else ""
            continue
        if j >= 0 and src[j] == ")":
            op = matching_open_paren(src, j)
            if op < 0:
                continue
            before = src[:op].rstrip()
            if re.search(r"\bfunction(\s+[A-Za-z_$][\w$]*)?\s*$", before):
                func_blocks.append((a, b)); func_params[(a, b)] = src[op + 1:j]
            elif re.search(r"\b(if|for|while|switch|catch|with)\s*$", before):
                continue
            elif re.search(r"[A-Za-z_$][\w$]*\s*$", before) and not re.search(r"\b(return|typeof|new|in|of|else|do)\s*$", before):
                func_blocks.append((a, b)); func_params[(a, b)] = src[op + 1:j]  # metodo abreviado `nombre(...) {`

    def innermost(pos, candidates=blocks):
        best = None
        for a, b in candidates:
            if a < pos < b and (best is None or a > best[0]):
                best = (a, b)
        return best

    def word(name):
        return r"(?<![\w$])" + re.escape(name) + r"(?![\w$])"

    issues = set()
    for m in re.finditer(r"\b(?:let|const)\s+([A-Za-z_$][\w$]*)", src):
        name, dpos = m.group(1), m.start(1)
        blk = innermost(dpos)
        if not blk:
            continue
        fn = innermost(dpos, func_blocks) or (0, len(src))
        if blk == fn:  # declarada al nivel de la funcion: cubre todo el cuerpo
            continue
        a, b = blk
        fa, fb = fn
        if re.search(word(name), func_params.get(fn, "")):  # es parametro de la propia funcion
            continue
        other_decls = []
        for dm in re.finditer(r"\b(let|const|var)\s+(" + re.escape(name) + r")\b", src[fa:fb]):
            p = fa + dm.start(2)
            if p == dpos:
                continue
            other_decls.append(fn if dm.group(1) == "var" else innermost(p))
        param_cover = [fb_ for fb_ in func_blocks if fa < fb_[0] < fb and re.search(word(name), func_params.get(fb_, ""))]
        for u in re.finditer(r"(?<![\w$.])" + re.escape(name) + r"\b(?!\s*:)", src[fa:fb]):
            up = fa + u.start()
            if a <= up < b or up == dpos:
                continue
            if any(c and c[0] < up < c[1] for c in other_decls):
                continue
            if any(c[0] < up < c[1] for c in param_cover):
                continue
            # parametro de una arrow function con cuerpo de EXPRESION en la misma linea: `(x) => f(x)` / `x => f(x)`
            ls = src.rfind("\n", 0, up) + 1
            le = src.find("\n", up)
            line = src[ls:le if le != -1 else len(src)]
            if re.search(r"\(\s*[^()]*" + word(name) + r"[^()]*\)\s*=>", line) or re.search(word(name) + r"\s*=>", line):
                continue
            issues.add((name, src.count("\n", 0, dpos) + 1, src.count("\n", 0, up) + 1))
    return sorted(issues, key=lambda x: x[2])


if __name__ == "__main__":
    total = 0
    for f in sys.argv[1:]:
        res = analyze(f)
        print(f"=== {pathlib.Path(f).name} ===")
        if not res:
            print("  OK: ningun let/const usado fuera de su bloque")
        for name, d, u in res:
            print(f"  {name}: declarada en linea {d}, usada fuera de su bloque en linea {u}")
        total += len(res)
    sys.exit(1 if total else 0)
