#!/usr/bin/env python3
"""
Adaptează tot ce ține de transport american la România:
1. Formularul de adresă - fix JS care citește aState/aZip/aCo greșit
2. Adaugă câmp Cod Poștal dacă lipsește
3. Înlocuiește USPS cu Poșta Română
4. Înlocuiește referințele la SUA/America cu România
5. Fix etichete greșite în formular
"""
import re, glob, os

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

# ── 1. TEXT SUBSTITUTIONS (toate fișierele) ──────────────────────────────────
TEXT_FIXES = [
    # USPS → Poșta Română
    ('prin USPS cu urmărire', 'prin Poșta Română cu urmărire'),
    ('prin USPS Ground cu urmărire', 'prin Poșta Română cu urmărire'),
    ('USPS Ground cu urmărire', 'Poșta Română cu urmărire'),
    ('expediată prin USPS Ground', 'expediată prin Poșta Română'),
    ('trimite prin USPS Ground', 'trimite prin Poșta Română'),
    ('sistemul de corespondență USPS', 'Poșta Română'),
    ('serviciul poștal USPS', 'Poșta Română'),
    ('prin USPS', 'prin Poșta Română'),
    ('prin poșta USPS', 'prin Poșta Română'),
    ('întârzierilor USPS', 'întârzierilor poștale'),
    ('First-Class Mail', 'poștă standard'),
    ('USPS', 'Poșta Română'),  # orice rămânere

    # SUA / comenzi americane → România
    ('comenzile din SUA sau 6 săptămâni pentru comenzile internaționale',
     'comenzile din România sau 3-6 săptămâni pentru comenzile internaționale'),
    ('comenzile din SUA sau până la 6 săptămâni pentru comenzile internaționale',
     'comenzile din România sau până la 6 săptămâni pentru comenzile internaționale'),
    ('pentru comenzile din SUA și șase săptămâni pentru comenzile internaționale',
     'pentru comenzile din România și 3-6 săptămâni pentru comenzile internaționale'),
    ('pentru comenzile din SUA',
     'pentru comenzile din România'),
    ('după expediere în SUA (timp total de tranzit: 5–8 zile)',
     'după expediere (timp total: 5–10 zile lucrătoare)'),
    ('după expediere în SUA (timp total de tranzit: 5-8 zile)',
     'după expediere (timp total: 5–10 zile lucrătoare)'),
    ('2–5 zile după expediere în SUA', '3–7 zile lucrătoare după expediere'),
    ('2-5 zile după expediere în SUA', '3–7 zile lucrătoare după expediere'),
    ('expediere în SUA', 'expediere în România'),
    ('clienților din SUA', 'clienților din România'),
    ('în SUA și', 'în România și'),
    (' în SUA ', ' în România '),
    ('expedierile din SUA', 'expedierile din România'),
    # "SUA" izolat (cu grijă)
    (' SUA)', ' România)'),
    ('(SUA)', '(România)'),

    # Livrare internațională - actualizare timp
    ('două săptămâni pentru comenzile din România și șase săptămâni',
     '5-10 zile lucrătoare pentru comenzile din România și 3-6 săptămâni'),

    # Fix etichetele greșite din formular
    ('Numărul complet al destinatarului', 'Numele complet al destinatarului'),
    ('Primul și ultimul număr', 'Primul și ultimul nume'),
    ('Apartament, apartament, unitate (optional)', 'Apartament, etaj, unitate (opțional)'),
    ('Apartament, apartament, unitate', 'Apartament, etaj, unitate'),

    # Ship note USPS
    ('expediată cu urmărire USPS', 'expediată cu urmărire prin Poșta Română'),

    # "Navele" (bad translation of "Ships") → fix labels
    ('Navele cu prima scrisoare', 'Expedierea primei scrisori'),
    ('Prima scrisoare Nave', 'Expedierea primei scrisori'),
    ('>Nave<', '>Data expedierii<'),

    # Mailing schedule text
    ('datele de expediere a scrisorilor cu flori', 'datele de expediere Scrisori Cu Povești'),

    # USPS tracking link in shipping policy
    ('https://pe.usps.com/text/imm/immctry.htm', 'https://www.posta-romana.ro/'),
    ('indexul actual USPS al țărilor', 'lista țărilor acceptate'),
    ('Trimitem poștă către orice țară din indexul actual USPS al țărilor și localităților găsite <a href="https://www.posta-romana.ro/">aici</a>.',
     'Trimitem în România și internațional. Pentru detalii despre livrarea internațională, contactați-ne.'),

    # "Serviciul Poștal din SUA"
    ('Serviciul Poștal din SUA', 'Poșta Română'),
    ('Toate scrisorile sunt trimise prin poștă folosind Serviciul Poștal din SUA',
     'Toate scrisorile sunt trimise prin Poșta Română'),

    # USD prices in shipping policy → lei (5x)
    ('5 USD/scrisoare în SUA și 7 USD/scrisoare la nivel internațional',
     '25 lei/scrisoare în România și 35 lei/scrisoare internațional'),
    ('5 USD/litera în SUA și 7 USD/litera la nivel internațional',
     '25 lei/scrisoare în România și 35 lei/scrisoare internațional'),
    ('5 USD/scrisoare (7 USD/scrisoare la nivel internațional)',
     '25 lei/scrisoare (35 lei/scrisoare internațional)'),
    ('5 USD/scrisoare în SUA și 7 USD/scrisoare',
     '25 lei/scrisoare în România și 35 lei/scrisoare'),
]

# ── 2. JS FIXES (formularul de adresă - în paginile cu checkout) ─────────────
JS_FIXES = [
    # updateEnv și checkout citesc aState dar câmpul se numește aJudet
    ("document.getElementById('aState').value.trim().toUpperCase()",
     "document.getElementById('aJudet')?.value||''"),
    ("document.getElementById('aState').value.trim()",
     "document.getElementById('aJudet')?.value||''"),
    ("document.getElementById('aState')?.value||''",
     "document.getElementById('aJudet')?.value||''"),

    # Country hardcodat România (aCo nu există în formular)
    ("document.getElementById('aCo').value",
     "'Romania'"),

    # Array pentru uppercase - aState → aJudet
    ("['aAddr1','aAddr2','aCity','aState','aZip']",
     "['aAddr1','aAddr2','aCity','aJudet','aZip']"),

    # Session storage care salvează st cu aState
    ("state:document.getElementById('aState')?.value||''",
     "state:document.getElementById('aJudet')?.value||''"),
    ("zip:document.getElementById('aZip')?.value||''",
     "zip:document.getElementById('aZip')?.value||''"),

    # country default
    ("country:document.getElementById('aCo')?.value||'US'",
     "country:'Romania'"),
    ("country:document.getElementById('aCo')?.value||'RO'",
     "country:'Romania'"),
]

# ── 3. Adaugă câmp Cod Poștal dacă nu există ─────────────────────────────────
COD_POSTAL_FIELD = '<div class="fg"><label>Cod Poștal</label><input autocomplete="postal-code" id="aZip" oninput="updateEnv()" placeholder="Ex: 010101" type="text"/></div>'

# Inserăm codul poștal după câmpul Oraș (aCity)
CITY_FIELD_RE = re.compile(
    r'(<div class="fg-row"><div class="fg"><label>Oraş</label>.*?</div></div>)',
    re.DOTALL
)

def add_postal_code(content):
    """Adaugă câmpul Cod Poștal după câmpul Oraș dacă nu există deja."""
    if 'id="aZip"' in content:
        return content  # Există deja

    # Găsim câmpul Oraș și inserăm Cod Poștal după
    city_match = re.search(
        r'(<div class="fg-row"><div class="fg"><label>Oraş</label>.*?</div></div>)',
        content, re.DOTALL
    )
    if city_match:
        insert_after = city_match.end()
        return content[:insert_after] + '\n<div class="fg-row"><div class="fg">' + COD_POSTAL_FIELD + '</div></div>' + content[insert_after:]
    return content

def fix_file(content):
    c = content

    # Text fixes
    for old, new in TEXT_FIXES:
        c = c.replace(old, new)

    # JS fixes
    for old, new in JS_FIXES:
        c = c.replace(old, new)

    # Add postal code field
    c = add_postal_code(c)

    return c

# Procesăm toate fișierele HTML
files = glob.glob(f'{BASE}/**/*.html', recursive=True) + glob.glob(f'{BASE}/*.html')
files = [f for f in files if 'en-ca' not in f and '@' not in os.path.basename(f)]

total = 0
for filepath in files:
    content = open(filepath, encoding='utf-8', errors='ignore').read()
    new_content = fix_file(content)
    if new_content != content:
        open(filepath, 'w', encoding='utf-8').write(new_content)
        rel = os.path.relpath(filepath, BASE)
        print(f'  ✓ {rel}')
        total += 1

print(f'\nGata! {total} fișiere modificate.')
