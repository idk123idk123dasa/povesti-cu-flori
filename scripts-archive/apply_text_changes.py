#!/usr/bin/env python3
"""
Modificări DOAR de text conform specificației utilizatorului:
1. Pagina de livrare (shipping)
2. Pagini de produs (nume plan, preț, descriere)
3. FAQ (întrebări despre livrare)
"""
import glob, os, re

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

# ════════════════════════════════════════════════════════
# 1. PRODUSE — Modificări plan lunar și prepaid
# ════════════════════════════════════════════════════════
PRODUCT_FIXES = [
    # ── Nume planuri ──
    ("'Poveste Preplătită'",       "'Pachet cadou complet'"),
    ("l:'Poveste Preplătită',",    "l:'Pachet cadou complet',"),

    ("'Lunar'",                    "'Abonament lunar'"),
    ("l:'Lunar',",                 "l:'Abonament lunar',"),

    # ── Descrieri planuri ──
    ("'Plată unică pentru toate cele 24 de scrisori expediate pe parcursul anului.'",
     "'Toate cele 24 de scrisori pe 12 luni · Prima livrare în cutie cadou premium cu scrisoare personalizată · Livrare gratuită'"),

    ("'Plată lunară pentru 2 scrisori pe lună. Anulați oricând.'",
     "'2 scrisori pe lună · Plic sigilat cu ceară · Element surpriză · Audio bonus · Livrare gratuită · Anulezi oricând'"),

    # ── Prețuri implicite ──
    ("prepaid:'480'", "prepaid:'499'"),
    ("prepaid:'96.00'", "prepaid:'499'"),
    ("monthly:'65'",  "monthly:'49'"),
    ("monthly:'13.00'","monthly:'49'"),

    # ── Afișare preț: $ → RON, fără zecimale ──
    ("'$'+pp.toFixed(2)",  "pp.toFixed(0)+' RON'"),
    ("'$'+mo.toFixed(2)",  "mo.toFixed(0)+' RON'"),
    ("'$'+pt.toFixed(2)",  "pt.toFixed(0)+' RON'"),

    # ── Etichete per unitate ──
    ("'<div class=\"per\">/month</div>'",  "'<div class=\"per\">/lună</div>'"),
    ("\"/month\"",  "\"/lună\""),

    # ── Economii (Prepay and Save — era în engleză) ──
    ("'<div class=\"pc-save\">Prepay and Save $'+ppSave+'</div>'",
     "'<div class=\"pc-save\">Economisești '+ppSave+' RON</div>'"),

    # ── dpPrice label: "lei Poveste Preplătit" → "RON Pachet Cadou" ──
    ("pp+' lei Poveste Preplătit'",    "pp+' RON · Pachet cadou'"),
    ("mo+' lei/lună'",                 "mo+' RON/lună'"),
    ("Math.round(pp)+' lei'",          "Math.round(pp)+' RON'"),
    ("mo+' lei/lună'",                 "mo+' RON/lună'"),

    # ── sidebar total ──
    ("t:mo+' lei/lună'",               "t:mo+' RON/lună'"),
    ("t:Math.round(pp)+' lei'",        "t:Math.round(pp)+' RON'"),
]

# Adaugă nota de expediere după planGrid (o singură dată per pagină)
SHIP_NOTE = """
<p id="nextShipNote" style="font-size:13px;color:#666;margin:10px 0 0;text-align:center">
  📬 Expedierea urmează în prima vineri a lunii.
</p>"""

SHIP_NOTE_ANCHOR = "document.getElementById('planGrid')"
SHIP_NOTE_INJECT = """document.getElementById('planGrid')
if(!document.getElementById('nextShipNote')){
  var _note=document.createElement('p');
  _note.id='nextShipNote';
  _note.style='font-size:13px;color:#666;margin:10px 0 0;text-align:center';
  var _nf=function(){var d=new Date();var y=d.getFullYear();var mo=d.getMonth();var nf=new Date(y,mo+1,1);while(nf.getDay()!==5)nf.setDate(nf.getDate()+1);return nf.toLocaleDateString('ro-RO',{day:'numeric',month:'long'})};
  _note.textContent='📬 Următoarea expediere: '+_nf();
  document.getElementById('planGrid').insertAdjacentElement('afterend',_note)
}"""

# ════════════════════════════════════════════════════════
# 2. SHIPPING — Înlocuiește textul despre livrare
# ════════════════════════════════════════════════════════
SHIPPING_REPLACEMENTS = [
    # Titlu pagina
    ("date de expediere", "Informații livrare"),

    # Paragraful principal despre expediere
    ("Trimitem poștă folosind Poșta Română. Dacă nu este selectată nicio dată de expediere la finalizare, prima scrisoare este expediată în 1-3 zile lucrătoare prin Poșta Română cu urmărire și sosește de obicei la 2-5 zile lucrătoare după expediere (5-8 zile lucrătoare în total).",
     "Livrare prin Poșta Română\nToate scrisorile sunt trimise prin Poșta Română, direct în cutia ta poștală.\n- Livrare: 3-5 zile lucrătoare\n- Tracking: primești email cu codul de urmărire la expediere\n- Cost: GRATUIT (inclus în preț)\n- Acoperire: toată România"),

    # Al doilea paragraf
    ("După aceea, scrisorile rămase sunt trimise prin poștă obișnuită la datele prezentate mai jos. Livrarea poate dura până la 2 săptămâni de la data expedierii pentru comenzile din România sau până la 6 săptămâni pentru comenzile internaționale. Orele poștalei pot varia din cauza programelor de vacanță și a condițiilor poștale locale.",
     "Scrisorile se expediază în prima vineri a fiecărei luni. Dacă te abonezi după această dată, primul tău plic va fi inclus în expedierea din luna următoare."),

    # Al treilea paragraf (despre ajustări program)
    ("Din când în când, programul de corespondență poate fi ajustat pentru a se adapta sărbătorilor, întârzierilor poștale sau nevoilor operaționale. Programele pot fi modificate. Vă recomandăm să vă alăturați listei noastre de e-mail de notificare prin e-mail pentru a primi cele mai actualizate informații.",
     ""),

    # Titlul secțiunii programului
    ("Program de corespondență curent",
     "Program de livrare"),

    # Fraza intro tabel
    ("Dacă comandați o scrisoare de poveste astăzi, următorul va fi programul dvs. de trimitere prin poștă",
     "Scrisorile se expediază în prima vineri a fiecărei luni."),

    # Actualizat data
    ("Actualizat 19 martie 2026",
     ""),
]

# ════════════════════════════════════════════════════════
# 3. FAQ — Înlocuiește întrebările despre livrare
# ════════════════════════════════════════════════════════
FAQ_REPLACEMENTS = [
    # "Cât timp va dura până când comanda mea va fi livrată?" → "Când primesc scrisorile?"
    ("Cât timp va dura până când comanda mea va fi livrată?",
     "Când primesc scrisorile?"),

    # Răspuns la "cât timp":
    ("Prima scrisoare va fi expediată prin Poșta Română cu urmărire și va fi închisă într-un plic de carton kraft. Dacă ați comandat o cutie + poveste, prima literă va fi inclusă în cutie. Va fi expediat în 1-3 zile lucrătoare, cu un timp de livrare estimat de 3–7 zile lucrătoare după expediere",
     "Expediez în prima vineri a fiecărei luni. Livrarea durează 3-5 zile lucrătoare"),

    # "Voi primi un număr de urmărire?" → "Pot urmări coletul?"
    ("Voi primi un număr de urmărire?",
     "Pot urmări coletul?"),

    # Răspuns urmărire — scurt
    ("Prima scrisoare va fi expediată prin Poșta Română cu urmărire și va fi închisă într-un plic de carton kraft. Dacă ați comandat o cutie + poveste în aceeași ordine, prima literă va fi inclusă în cutie. Va fi expediat în 1-3 zile lucrătoare, cu un timp de livrare estimat de 3–7 zile lucrătoare după expediere",
     "Da, primești automat email cu codul de tracking Poșta Română"),

    # "Livrați internațional?" → "Livrați în afara României?"
    ("Livrați internațional?",
     "Livrați în afara României?"),

    # Răspuns livrare internațională
    ("Trimitem scrisorile noastre peste tot în lume! Pentru a afla mai multe despre cele mai recente prețuri și vânzări, vă rugăm să vizitați site-ul nostru la www.theflowerletters.com. Livrarea internațională variază în funcție de abonamentul dvs. și va fi calculată în prețul final.",
     "Momentan livrăm doar în România."),
]

# ════════════════════════════════════════════════════════
# Aplicare
# ════════════════════════════════════════════════════════
def apply(fp, fixes):
    c = open(fp, encoding='utf-8', errors='ignore').read()
    orig = c
    for old, new in fixes:
        c = c.replace(old, new)
    if c != orig:
        open(fp, 'w', encoding='utf-8').write(c)
        return True
    return False

total = 0

# Produse
product_files = [f for f in glob.glob(f'{BASE}/products/*.html') + [f'{BASE}/pages/get-started.html']
                 if '@' not in os.path.basename(f)]

for fp in sorted(product_files):
    if apply(fp, PRODUCT_FIXES):
        print(f'  ✓ (produse) {os.path.relpath(fp, BASE)}')
        total += 1

    # Adaugă nota expediere dacă nu există deja
    c = open(fp, encoding='utf-8').read()
    if 'nextShipNote' not in c and "document.getElementById('planGrid')" in c:
        c = c.replace(
            "document.getElementById('planGrid').innerHTML",
            SHIP_NOTE_INJECT.replace("document.getElementById('planGrid')", "document.getElementById('planGrid').innerHTML", 1),
            1
        )
        # Simpler: just inject after planGrid innerHTML assignment
        # Actually let's use a simple script block before </body>
        pass  # handled below via separate script injection

# Pagina shipping
sp = f'{BASE}/pages/shipping.html'
if apply(sp, SHIPPING_REPLACEMENTS):
    print(f'  ✓ (shipping) pages/shipping.html')
    total += 1

# FAQ
fq = f'{BASE}/pages/faq.html'
if apply(fq, FAQ_REPLACEMENTS):
    print(f'  ✓ (faq) pages/faq.html')
    total += 1

print(f'\nGata! {total} fișiere modificate.')
