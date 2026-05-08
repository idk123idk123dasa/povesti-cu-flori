#!/usr/bin/env python3
"""
Actualizează toate informațiile de livrare:
- Poșta Română, joi săptămânal, 7-14 zile lucrătoare
- Comenzi înainte de joi 18:00 → lot curent; după → lotul următor
- Înlocuiește USPS, "poștă obișnuită", "prima/a 2-a vineri" etc.
"""
import glob, os, re

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

EXPLANATION = (
    'Trimitem toate plicurile o dată pe săptămână, în fiecare joi. '
    'Dacă comanzi înainte de joi ora 18:00, scrisoarea ta pleacă în același lot și ajunge în 7–10 zile. '
    'Dacă comanzi după joi, pleacă în lotul următor — deci poți aștepta până la 14 zile. '
    'Indiferent când comanzi, îți garantăm livrarea în maximum 14 zile lucrătoare.'
)

# ── Înlocuiri simple (plain text) ──────────────────────────────────────────
SIMPLE = [
    # USPS
    ('USPS Ground Advantage', 'Poșta Română'),
    ('USPS Tracking', 'urmărire Poșta Română'),
    ('USPS', 'Poșta Română'),
    # "poștă obișnuită" → toate cu tracking
    ('trimise prin poștă obișnuită și nu vor include informații de urmărire',
     'expediate prin Poșta Română cu urmărire'),
    ('trimise prin poștă obișnuită și, în general, vor fi trimise prin poștă în a 2-a și a 4-a vineri a fiecărei luni',
     'expediate prin Poșta Română în fiecare joi'),
    ('trimise prin poștă obișnuită și, în general, vor fi trimise prin poștă în a 2-a și a 4-a vineri',
     'expediate prin Poșta Română în fiecare joi'),
    ('trimise prin poștă obișnuită',
     'expediate prin Poșta Română'),
    ('trimise prin poştă obişnuită',
     'expediate prin Poșta Română'),
    ('poștă obișnuită Poșta Română',
     'Poșta Română'),
    ('poștă obișnuită',
     'Poșta Română'),
    # Zile/schedule
    ('prima vineri a fiecărei luni',
     'în fiecare joi'),
    ('prima vineri a lunii',
     'în fiecare joi'),
    ('a 2-a și a 4-a vineri a fiecărei luni',
     'în fiecare joi'),
    ('a doua și a patra săptămână a fiecărei luni',
     'în fiecare joi'),
    ('în a 2-a și a 4-a vineri a fiecărei luni',
     'în fiecare joi'),
    # Zile livrare → 7-10 / 7-14
    ('2-5 zile lucrătoare după expediere (timp total: 5–8 zile)',
     '7–10 zile lucrătoare de la expediere'),
    ('2-5 zile lucrătoare după expediere (în total 5-8 zile lucrătoare)',
     '7–10 zile lucrătoare de la expediere'),
    ('2–5 zile după expediere (timp total: 5–10 zile lucrătoare)',
     '7–10 zile lucrătoare de la expediere'),
    ('2-5 zile lucrătoare după expediere în România (timp total de tranzit: 5-8 zile lucrătoare)',
     '7–10 zile lucrătoare de la expediere'),
    ('2-5 zile lucrătoare după expediere în România (timp total de tranzit: 5–8 zile lucrătoare)',
     '7–10 zile lucrătoare de la expediere'),
    ('2–5 zile lucrătoare după expediere (timp total: 5–10 zile lucrătoare)',
     '7–10 zile lucrătoare de la expediere'),
    ('estimat de livrare de 2-5 zile lucrătoare după expediere (timp total de tranzit: 5–8 zile lucrătoare)',
     'de livrare de 7–10 zile lucrătoare'),
    ('3–7 zile lucrătoare după expediere',
     '7–10 zile lucrătoare de la expediere'),
    ('3-5 zile lucrătoare', '7–10 zile lucrătoare'),
    ('2-5 zile lucrătoare', '7–10 zile lucrătoare'),
    ('2–5 zile lucrătoare', '7–10 zile lucrătoare'),
    ('5–8 zile lucrătoare', '7–14 zile lucrătoare'),
    ('5-8 zile lucrătoare', '7–14 zile lucrătoare'),
    ('până la 2 săptămâni pentru livrarea în România și 4-6 săptămâni pentru livrarea națională',
     'maximum 14 zile lucrătoare'),
    ('până la 2 săptămâni pentru livrare',
     'maximum 14 zile lucrătoare'),
    ('2-4 săptămâni la nivel național', '7–14 zile lucrătoare'),
    ('1 - 2 săptămâni', '7–14 zile lucrătoare'),
    ('1-2 săptămâni', '7–14 zile lucrătoare'),
    # Prima scrisoare expediere
    ('Va fi expediat în 1-3 zile lucrătoare',
     'Va fi expediat în lotul de joi (comenzi înainte de joi ora 18:00)'),
    ('Va fi expediat la data de expediere selectată sau în termen de trei zile lucrătoare de la cumpărare',
     'Va fi expediat în lotul de joi următor comenzii'),
    ('Va fi expediat în termen de trei zile lucrătoare',
     'Va fi expediat în lotul de joi următor comenzii'),
    ('expediată în 1-3 zile lucrătoare', 'expediată în lotul de joi'),
    ('Expediez în prima vineri a fiecărei luni.\nLivrarea durează 3-5 zile lucrătoare',
     'Expediem în fiecare joi.\nLivrarea durează 7–10 zile lucrătoare'),
    ('expediată în 1 - 3 zile lucrătoare',
     'expediată în lotul de joi'),
    ('Prima scrisoare va fi trimisă prin poștă în 1 - 3 zile lucrătoare.',
     'Prima scrisoare va fi expediată în lotul de joi (comenzi înainte de joi ora 18:00).'),
    # "urmărire nu disponibilă" → scoate
    ('Vă rugăm să rețineți că scrisorile rămase vor fi trimise prin poștă obișnuită și nu vor include informații de urmărire.',
     ''),
    ('Urmărirea nu este disponibilă.',
     ''),
    ('nu vor include informații de urmărire.',
     ''),
    # "Livrare informată cu Poșta Română" → keep, just update anchor text
    # get-started USPS note
    ('Prima scrisoare este expediată cu urmărire USPS. Toate scrisorile rămase sunt trimise prin poștă obișnuită de două ori pe lună.',
     'Expedierea se face în fiecare joi. Livrare 7–14 zile lucrătoare prin Poșta Română.'),
    ('Prima scrisoare este expediată prin USPS Ground Advantage și de obicei ajunge în 2-5 zile lucrătoare. Trimiterile obișnuite ajung de obicei în 2 săptămâni de la fiecare dată de trimitere.',
     EXPLANATION),
    # shipping.html main text
    ('Livrare: 3-5 zile lucrătoare',
     'Livrare: 7–14 zile lucrătoare'),
    ('Scrisorile se expediază în prima vineri a fiecărei luni.',
     'Expedierea se face în fiecare joi.'),
    ('Scrisorile se expediază în fiecare joi.',
     'Expedierea se face în fiecare joi.'),
    # shipping-policy
    ('Scrisorile sunt de obicei trimise prin poștă în a doua și a patra săptămână a fiecărei luni.',
     'Scrisorile sunt expediate în fiecare joi.'),
    # faq schedule note
    ('Scrisorile rămase vor fi trimise prin poștă obișnuită și, în general, vor fi trimise prin poștă în a 2-a și a 4-a vineri a fiecărei luni.',
     'Toate scrisorile sunt expediate prin Poșta Română în fiecare joi.'),
    ('Vă rugăm să acordați până la 2 săptămâni pentru livrarea în România',
     'Vă rugăm să acordați până la 14 zile lucrătoare pentru livrare'),
]

# ── Înlocuiri regex (aplicate în afara <script>) ───────────────────────────
def apply_outside_scripts(content, pattern, replacement, use_regex=False, flags=re.S):
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

# ── Shipping.html: înlocuiește blocul principal cu noul conținut ───────────
NEW_SHIPPING_BLOCK = (
    'Livrare prin Poșta Română\n'
    'Toate scrisorile sunt trimise prin Poșta Română, cu tracking, direct în cutia ta poștală.\n'
    '- Expediere: în fiecare joi\n'
    '- Livrare: 7–14 zile lucrătoare\n'
    '- Tracking: primești email cu codul de urmărire la expediere\n'
    '- Cost: GRATUIT (inclus în preț)\n'
    '- Acoperire: toată România\n\n'
    + EXPLANATION
)

OLD_SHIPPING_BLOCK = (
    'Livrare prin Poșta Română\n'
    'Toate scrisorile sunt trimise prin Poșta Română, direct în cutia ta poștală.\n'
    '- Livrare: 3-5 zile lucrătoare\n'
    '- Tracking: primești email cu codul de urmărire la expediere\n'
    '- Cost: GRATUIT (inclus în preț)\n'
    '- Acoperire: toată România'
)

total = 0
files = (
    glob.glob(f'{BASE}/products/*.html') +
    glob.glob(f'{BASE}/pages/*.html') +
    glob.glob(f'{BASE}/policies/*.html') +
    [f'{BASE}/index.html', f'{BASE}/cart.html']
)
files = [f for f in files if '@' not in os.path.basename(f) and 'en-ca' not in f]

for fp in sorted(files):
    try:
        c = open(fp, encoding='utf-8', errors='ignore').read()
    except:
        continue
    orig = c

    # Shipping.html: replace main block
    if fp.endswith('pages/shipping.html'):
        c = c.replace(OLD_SHIPPING_BLOCK, NEW_SHIPPING_BLOCK)

    # Simple replacements (outside script tags)
    for old, new in SIMPLE:
        c = apply_outside_scripts(c, old, new)

    # Regex replacements outside scripts
    # "în 2-4 săptămâni" / "în 1-2 săptămâni" remaining
    c = apply_outside_scripts(c,
        r'în \d[–-]\d+ săptămâni',
        'în 7–14 zile lucrătoare',
        use_regex=True)
    # "1-3 zile lucrătoare" remaining (expediere)
    c = apply_outside_scripts(c,
        r'în 1[–-]3 zile lucrătoare',
        'în lotul de joi',
        use_regex=True)
    # "termen de trei zile lucrătoare" remaining
    c = apply_outside_scripts(c,
        r'(?:în )?termen de trei zile lucrătoare',
        'în lotul de joi următor',
        use_regex=True)

    if c != orig:
        open(fp, 'w', encoding='utf-8', errors='ignore').write(c)
        print(f'  ✓ {os.path.relpath(fp, BASE)}')
        total += 1

# ── Adaugă explicația în shipping.html dacă nu există deja ─────────────────
sp = f'{BASE}/pages/shipping.html'
c = open(sp, encoding='utf-8', errors='ignore').read()
if EXPLANATION[:50] not in c:
    # Add explanation box before the mailing schedule table section
    BOX = (
        f'<div style="background:#fdf6ec;border-left:4px solid #B8913A;padding:16px 20px;margin:20px 0;border-radius:4px;font-size:14px;line-height:1.7;color:#4d555e">'
        f'📬 <strong>Cum funcționează livrarea?</strong><br/>'
        f'{EXPLANATION}'
        f'</div>'
    )
    # Insert before the mailing schedule section or before the klaviyo form
    if 'Program de livrare' in c:
        c = c.replace('Program de livrare', BOX + '\nProgram de livrare', 1)
    else:
        c = c.replace('klaviyo-form', BOX + '\n<div class="klaviyo-form', 1)
        c = c.replace(BOX + '\n<div class="klaviyo-form', BOX + '\n<div class="klaviyo-form')
    open(sp, 'w', encoding='utf-8', errors='ignore').write(c)
    print(f'  ✓ shipping.html (adăugat box explicație)')

print(f'\nGata! {total} fișiere modificate.')
