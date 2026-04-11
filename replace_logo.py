#!/usr/bin/env python3
"""
Înlocuiește toate tag-urile <img> cu logo-ul The Flower Letters cu SVG-ul românesc.
"""
import re, glob, os

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'
NEW_LOGO = '/assets/logo-scrisorile.svg'

# Pattern pentru img tags cu logo-ul original
LOGO_RE = re.compile(
    r'<img([^>]*?)(?:data-src|src)="[^"]*The-Flower-Letters-Logo[^"]*"([^>]*?)>',
    re.IGNORECASE | re.DOTALL
)

def replace_logo_img(match):
    # Extrage atributele existente (class, style, alt, etc.)
    attrs_before = match.group(1)
    attrs_after = match.group(2)
    all_attrs = attrs_before + ' ' + attrs_after

    # Păstrează class și style
    cls = re.search(r'class="([^"]*)"', all_attrs)
    style = re.search(r'style="([^"]*)"', all_attrs)

    cls_str = f' class="{cls.group(1)}"' if cls else ''
    style_str = f' style="{style.group(1)}"' if style else ' style="max-width:100px"'

    return f'<img src="{NEW_LOGO}" alt="Scrisorile cu Flori"{cls_str}{style_str}/>'

files = glob.glob(f'{BASE}/**/*.html', recursive=True) + glob.glob(f'{BASE}/*.html')
files = [f for f in files if 'en-ca' not in f and '@' not in os.path.basename(f)]

total = 0
for filepath in files:
    content = open(filepath, encoding='utf-8', errors='ignore').read()
    if 'The-Flower-Letters-Logo' not in content:
        continue

    new_content, n = LOGO_RE.subn(replace_logo_img, content)
    if n > 0:
        open(filepath, 'w', encoding='utf-8').write(new_content)
        rel = os.path.relpath(filepath, BASE)
        print(f"  ✓ {rel}: {n} logo-uri înlocuite")
        total += n

print(f"\nGata! {total} logo-uri înlocuite total.")
