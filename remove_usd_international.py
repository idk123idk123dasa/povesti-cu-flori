#!/usr/bin/env python3
"""
Scoate referințe USD vizibile și tot ce ține de internațional din HTML
(nu atinge conținutul din <script> tags - JS/JSON tracking)
"""
import glob, os, re

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

def remove_outside_scripts(content, pattern, replacement='', use_regex=False, flags=re.S):
    """Replace pattern only in HTML content, not inside <script> tags."""
    parts = re.split(r'(<script[\s\S]*?</script>)', content, flags=re.I)
    result = []
    for part in parts:
        if part.lower().startswith('<script'):
            result.append(part)
        else:
            if use_regex:
                result.append(re.sub(pattern, replacement, part, flags=flags))
            else:
                result.append(part.replace(pattern, replacement))
    return ''.join(result)

total = 0

files = (
    glob.glob(f'{BASE}/products/*.html') +
    glob.glob(f'{BASE}/pages/*.html') +
    glob.glob(f'{BASE}/policies/*.html') +
    [f'{BASE}/index.html', f'{BASE}/cart.html']
)
files = [f for f in files if '@' not in os.path.basename(f)]

for fp in sorted(files):
    try:
        c = open(fp, encoding='utf-8', errors='ignore').read()
    except:
        continue
    orig = c

    # ── USD vizibil ──
    c = remove_outside_scripts(c, 'De la 13 USD/lună', 'De la 49 RON/lună')
    c = remove_outside_scripts(c, 'De la 12 USD/lună', 'De la 49 RON/lună')
    c = remove_outside_scripts(c, 'Pentru 12 USD pe lună', 'Abonament lunar')
    c = remove_outside_scripts(c, '155,40 USD', '499 RON')
    c = remove_outside_scripts(c, '12,95 USD pe lună', '49 RON/lună')
    c = remove_outside_scripts(c, '12,95 USD', '49 RON')
    c = remove_outside_scripts(c, '5 USD/litera', 'cost de înlocuire')
    c = remove_outside_scripts(c, '7 USD/litera', 'cost de înlocuire')
    c = remove_outside_scripts(c, '0 lei USD', '0 RON')
    # Generic USD
    c = remove_outside_scripts(c, r'\d+[,\.]?\d*\s*USD', '', use_regex=True)
    c = remove_outside_scripts(c, r'USD\s*\d+[,\.]?\d*', '', use_regex=True)

    # ── Internațional ──
    # FAQ Q+A blocks
    c = remove_outside_scripts(c,
        r'<dt[^>]*>(?:Livrați internațional\?|Livrați în afara României\?)</dt>\s*<dd[^>]*>.*?</dd>',
        '', use_regex=True, flags=re.S|re.I)
    # Sentences about international
    c = remove_outside_scripts(c,
        r'[^<.]*comenzile? internaționale[^<.]*\.?',
        '', use_regex=True)
    c = remove_outside_scripts(c,
        r'[^<.]*livrare internațională[^<.]*\.?',
        '', use_regex=True)
    c = remove_outside_scripts(c,
        r'[^<.]*clienți(?:i)? internațional[^<.]*\.?',
        '', use_regex=True)
    c = remove_outside_scripts(c,
        r'\s*sau până la 6 săptămâni pentru comenzile internaționale',
        '', use_regex=True)
    c = remove_outside_scripts(c,
        r'[^<.]*internațional[ăe]?[^<.]*livrare[^<.]*\.?',
        '', use_regex=True)
    # Replace remaining visible "internațional" → "național"
    c = remove_outside_scripts(c,
        r'(?i)internațional([ăe]?\b)',
        r'național\1', use_regex=True)
    c = remove_outside_scripts(c,
        r'(?i)international([e]?\b)',
        r'național\1', use_regex=True)

    if c != orig:
        open(fp, 'w', encoding='utf-8', errors='ignore').write(c)
        print(f'  ✓ {os.path.relpath(fp, BASE)}')
        total += 1

print(f'\nGata! {total} fișiere modificate.')
