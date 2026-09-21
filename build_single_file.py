#!/usr/bin/env python3
"""Arma 'atrapa-las-flores.html': un único archivo con CSS, JS y assets embebidos.

Uso:  python3 build_single_file.py
"""
import base64, mimetypes, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'atrapa-las-flores.html')


def data_uri(rel_path):
    full = os.path.join(ROOT, rel_path)
    mime = mimetypes.guess_type(full)[0] or 'application/octet-stream'
    with open(full, 'rb') as fh:
        return f"data:{mime};base64," + base64.b64encode(fh.read()).decode()


def main():
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    css = open(os.path.join(ROOT, 'style.css'), encoding='utf-8').read()
    js = open(os.path.join(ROOT, 'game.js'), encoding='utf-8').read()

    missing = []

    def replace(match):
        rel = match.group(1)
        if os.path.exists(os.path.join(ROOT, rel)):
            return "'" + data_uri(rel) + "'"
        missing.append(rel)
        return match.group(0)

    js = re.sub(r"'(assets/[^']+)'", replace, js)

    html = html.replace('<link rel="stylesheet" href="style.css">',
                        '<style>\n' + css + '\n</style>')
    html = html.replace('<script src="game.js"></script>',
                        '<script>\n' + js + '\n</script>')

    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write(html)

    size = os.path.getsize(OUT) / 1024
    print(f"Listo: {OUT}  ({size:.1f} KB)")
    if missing:
        print("Assets no encontrados (el juego usará su dibujo de reserva):")
        for m in missing:
            print("  -", m)


if __name__ == '__main__':
    sys.exit(main())
