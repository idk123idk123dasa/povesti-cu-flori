#!/usr/bin/env python3
"""
Traduce textul englez rămas în paginile de produse.
"""
import glob, os

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

# ── Traduceri comune tuturor produselor ──────────────────────────────────────
COMMON = [
    # Plan names (ordinea contează: + Tin înainte de Prepaid Story)
    ("l:'Prepaid Story + Tin'", "l:'Poveste Preplătită + Cutie'"),
    ("l:'Prepaid Story'",        "l:'Poveste Preplătită'"),
    ("l:'Monthly'",              "l:'Lunar'"),

    # Plan descrieri
    ('Includes Prepaid Story + Matching Keepsake Tin. First letter ships inside the tin.',
     'Include Poveste Preplătită + Cutie Amintiri asortată. Prima scrisoare ajunge în cutie.'),
    ('One-time payment for all 24 letters mailed throughout the year.',
     'Plată unică pentru toate cele 24 de scrisori expediate pe parcursul anului.'),
    ('Monthly payments for 2 letters sent each month. Cancel anytime.',
     'Plată lunară pentru 2 scrisori pe lună. Anulați oricând.'),

    # Date expediere label
    ("'First Letter Ships (inside tin)'", "'Prima Scrisoare Expediată (în cutie)'"),
    ("'First Letter Ships'",              "'Prima Scrisoare Expediată'"),
    ("'First letter ships'",              "'Prima scrisoare expediată'"),

    # Buton sinopsis
    ("'Read full synopsis ↓'",        "'Citește sinopsisul complet ↓'"),

    # Buton continuare
    ("'Continue With '",  "'Continuă cu '"),
    ("'Continue with '",  "'Continuă cu '"),

    # Badge
    ('BEST VALUE',    'CEA MAI BUNĂ OFERTĂ'),

    # Taguri plan în HTML
    ('>Monthly<',   '>Lunar<'),
    ('>one-time<',  '>o singură plată<'),
    ('>One-time<',  '>O singură plată<'),

    # Features incluse
    ('24 beautiful letters',        '24 de scrisori frumoase'),
    ('12-month story experience',   'experiență de 12 luni'),
    ('Custom keepsake tin',         'Cutie amintiri personalizată'),
    ('30-day money-back guarantee', 'Garanție de rambursare 30 de zile'),
    ('Guaranteed Delivery',         'Livrare garantată'),
    ('Postcards, telegrams & extras', 'Cărți poștale, telegrame și extra'),

    # "First letter ships" standalone (în descriere plan)
    ('First letter ships',  'Prima scrisoare expediată'),
]

# ── Traduceri specifice Norah Aven Complete Sets ─────────────────────────────
NORAH_COMPLETE = [
    ('Spring Bloom Exclusive! {amount_discount} Off - LIMITED AVAILABILITY',
     'Ofertă Exclusivă! {amount_discount} Reducere - DISPONIBILITATE LIMITATĂ'),
    ('Spring Bloom Exclusive! ',
     'Ofertă Exclusivă! '),
    ('LIMITED AVAILABILITY',
     'DISPONIBILITATE LIMITATĂ'),

    # Descriere produs - Variant 1 (Seturi complete)
    ('This special edition includes all 24 letters in the tin at once, so you can experience Norah Aven\'s entire story from beginning to end.',
     'Această ediție specială include toate cele 24 de scrisori în cutie deodată, astfel încât să poți experimenta întreaga poveste Norah Aven de la început până la sfârșit.'),

    # Prefer to receive / Click here
    ('<strong>Prefer to receive 2 letters per month? </strong><a href="/products/an-immersive-story-experience-told-through-letters"><strong>Click here&gt;&gt;</strong></a>',
     '<strong>Preferi să primești 2 scrisori pe lună? </strong><a href="/products/an-immersive-story-experience-told-through-letters"><strong>Click aici&gt;&gt;</strong></a>'),
    ('<strong>Prefer to receive 2 letters per month? </strong><a href="/products/the-norah-aven-chronicles-pt2"><strong>Click here&gt;&gt;</strong></a>',
     '<strong>Preferi să primești 2 scrisori pe lună? </strong><a href="/products/the-norah-aven-chronicles-pt2"><strong>Click aici&gt;&gt;</strong></a>'),
    ('Prefer to receive 2 letters per month?',
     'Preferi să primești 2 scrisori pe lună?'),

    # Part 2 continuation notice
    ('Part 2 is a continuation—please experience Part 1 before beginning this journey.',
     'Partea 2 este o continuare — vă rugăm să parcurgeți mai întâi Partea 1 înainte de a începe această călătorie.'),

    # Story blurb Combo
    ('<h1>The Norah Aven Chronicles Parts 1 and 2 Combo</h1>',
     '<h1>Cronicile Norah Aven — Combo Partea 1 și 2</h1>'),
    ('Step into the complete Norah Aven adventure with <strong>Parts 1 and 2 together</strong>—available at a special bundle price.',
     'Intră în aventura completă Norah Aven cu <strong>Părțile 1 și 2 împreună</strong> — la un preț special de pachet.'),
    ('Seventeen-year-old Norah Lukens has spent years raising herself while her guardian, Dr. Jack A. Lukens—Harvard\'s world-famous myth-chaser—travels the world proving myths are real. But when Norah returns home to find her uncle murdered, she\'s left with only a mysterious journal and a trail of clues that pulls her into a hidden world of ancient magic and Icelandic legend.',
     'Norah Lukens, în vârstă de șaptesprezece ani, a petrecut ani crescând singură în timp ce tutorele ei, Dr. Jack A. Lukens — celebrul vânător de mituri al Universității Harvard — călătorește în lume dovedind că miturile sunt reale. Dar când Norah se întoarce acasă și găsește că unchiul ei a fost ucis, rămâne numai cu un jurnal misterios și un șir de indicii care o trage într-o lume ascunsă de magie antică și legendă islandeză.'),
    ('As the story continues into Part 2, Norah enters an even stranger realm—where paths of light can make you vanish, doors can lead to worlds near and far, myths are history, a single kiss can seal two souls as one, and a stone is never <em>just a stone.</em>',
     'Pe măsură ce povestea continuă în Partea 2, Norah intră într-un tărâm și mai straniu — unde cărările de lumină te pot face să dispari, ușile pot duce spre lumi apropiate și îndepărtate, miturile sunt istorie, un singur sărut poate uni două suflete pentru totdeauna, iar o piatră nu e niciodată <em>doar o piatră.</em>'),
    ('<strong>Get both parts together and experience Norah\'s full journey from the very beginning—one unforgettable letter at a time.</strong>',
     '<strong>Obțineți ambele părți împreună și trăiți întreaga călătorie a Norei de la bun început — o scrisoare de neuitat după alta.</strong>'),

    # Story blurb Part 1 (în complete sets)
    ('Seventeen-year-old Norah Lukens has spent years raising herself while her guardian, Dr. Jack A. Lukens, Harvard\'s legendary myth-chaser, travels the world proving ancient myths are real. But when Norah returns home to find her uncle murdered, she\'s left with nothing but his mysterious journal… and a trail of clues that drags her into a hidden world of Icelandic magic.',
     'Norah Lukens, în vârstă de șaptesprezece ani, a petrecut ani crescând singură în timp ce tutorele ei, Dr. Jack A. Lukens, celebrul vânător de mituri al Universității Harvard, călătorește în lume dovedind că miturile antice sunt reale. Dar când Norah se întoarce acasă și găsește că unchiul ei a fost ucis, rămâne numai cu jurnalul său misterios... și un șir de indicii care o trage într-o lume ascunsă de magie islandeză.'),
    ('With secrets unraveling around her—especially from her estranged best friend James—Norah begins her own myth-chase to uncover the truth behind the Legend of the Cobbogothians… and the shocking answers tied to her own past.',
     'Cu secrete care se dezvăluie în jurul ei — mai ales de la cel mai bun prieten al ei înstrăinat, James — Norah începe propria sa vânătoare de mituri pentru a descoperi adevărul din spatele Legendei Cobbogothienilor... și răspunsurile șocante legate de propriul ei trecut.'),

    # Part 2 story blurb
    ('As Norah steps deeper into a world where myths and legends are not fairy tales—but living history—everything she thought she understood begins to shift. In this new realm, paths of light can make you vanish, doors can lead to worlds both near and far, and a stone is never <em>just</em> a stone.',
     'Pe măsură ce Norah pășește mai adânc într-o lume unde miturile și legendele nu sunt basme — ci istorie vie — tot ceea ce credea că înțelege începe să se schimbe. În acest nou tărâm, cărările de lumină te pot face să dispari, ușile pot duce spre lumi atât apropiate cât și îndepărtate, iar o piatră nu e niciodată <em>doar</em> o piatră.'),
    ('With every letter, Norah is pulled further into danger, magic, and meaning—where even a single kiss can bind two souls together, and the choices she makes may change her fate forever.',
     'Cu fiecare scrisoare, Norah este trasă tot mai adânc în pericol, magie și sens — unde chiar și un singur sărut poate lega două suflete împreună, iar alegerile pe care le face îi pot schimba destinul pentru totdeauna.'),
]

# ── Traduceri specifice Norah Aven pt2 ───────────────────────────────────────
NORAH_PT2 = [
    # Dacă există descriere engleză în pt2
    ('Click here',  'Click aici'),
]

def fix_file(path, extra_fixes=None):
    content = open(path, encoding='utf-8', errors='ignore').read()
    c = content

    for old, new in COMMON:
        c = c.replace(old, new)

    if extra_fixes:
        for old, new in extra_fixes:
            c = c.replace(old, new)

    if c != content:
        open(path, 'w', encoding='utf-8').write(c)
        print(f'  ✓ {os.path.relpath(path, BASE)}')
        return True
    return False

total = 0

# Toate fișierele produse (fără @ în nume)
product_files = [f for f in glob.glob(f'{BASE}/products/*.html')
                 if '@' not in os.path.basename(f)]

for fp in sorted(product_files):
    name = os.path.basename(fp)
    extra = None
    if 'complete-sets' in name:
        extra = NORAH_COMPLETE
    elif 'chronicles-pt2' in name or 'part-3' in name:
        extra = NORAH_PT2

    if fix_file(fp, extra):
        total += 1

print(f'\nGata! {total} fișiere modificate.')
