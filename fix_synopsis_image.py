#!/usr/bin/env python3
"""
Fixează:
1. Imaginea se vede bagulita cand se expandeaza sinopsisul
   → .fl .dp-img primeste align-self:start ca sa nu creasca cu textul
2. 'Show less ↑' → 'Afișează mai puțin ↑' (ramânea în engleză)
3. 'Citește sinopsisul' → 'Citește rezumatul' (preferința utilizatorului)
4. Remaining English in JS: pickPlan includes text, updateSidebar prepaid label
5. 'cu cutia poștală' → 'prin cutia poștală' (toate fișierele)
"""
import glob, os

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

FIXES = [
    # ── Fix imagine buggy: dp-img nu trebuie sa creasca cu randul gridului ──
    ('.fl .dp-img{min-height:260px!important}',
     '.fl .dp-img{min-height:260px!important;align-self:start!important}'),

    # ── "Show less ↑" rămasese în engleză ──
    ("b.textContent='Show less ↑'",
     "b.textContent='Afișează mai puțin ↑'"),

    # ── Utilizatorul preferă "rezumatul" în loc de "sinopsisul" ──
    ("b.textContent='Citește sinopsisul complet ↓'",
     "b.textContent='Citește rezumatul complet ↓'"),
    ("document.getElementById('dpMore').textContent='Citește sinopsisul complet ↓'",
     "document.getElementById('dpMore').textContent='Citește rezumatul complet ↓'"),
    # HTML static button
    (">Citiți rezumatul complet ↓<",
     ">Citește rezumatul complet ↓<"),
    (">Citește sinopsisul complet ↓<",
     ">Citește rezumatul complet ↓<"),

    # ── pickPlan: include text rămas în engleză ──
    ("'24 letters, Keepsake Tin, postcards & extras'",
     "'24 de scrisori, Cutie Amintiri, cărți poștale și extra'"),
    ("'24 letters, postcards & extras'",
     "'24 de scrisori, cărți poștale și extra'"),

    # ── updateSidebar: prepaid label rămas 'Prepaid' ──
    ("prepaid:{l:'Prepaid',",
     "prepaid:{l:'Poveste Preplătită',"),

    # ── "cu cutia poștală" → "prin cutia poștală" ──
    ('cu cutia poștală', 'prin cutia poștală'),
]

files = (
    glob.glob(f'{BASE}/products/*.html') +
    glob.glob(f'{BASE}/pages/*.html')
)
files = [f for f in files if '@' not in os.path.basename(f)]

total = 0
for fp in sorted(files):
    content = open(fp, encoding='utf-8', errors='ignore').read()
    c = content
    for old, new in FIXES:
        c = c.replace(old, new)
    if c != content:
        open(fp, 'w', encoding='utf-8').write(c)
        print(f'  ✓ {os.path.relpath(fp, BASE)}')
        total += 1

print(f'\nGata! {total} fișiere modificate.')
