#!/usr/bin/env python3
"""
Scoate tot ce ține de cutie/tin din site:
- Cardul de plan "Poveste Preplătită + Cutie"
- Referințe la tinImg, prepaid_tin în JS
- Feature "Cutie amintiri personalizată"
- Recenzia care menționează cutia (tina)
- Link-urile de navigație spre colecția de cutii
- Prețuri/etichete "Preplătit+Cutie"
"""
import glob, os, re

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

FIXES = [
    # ── 1. tinCard → '' (elimină cardul de plan Cutie) ──
    # Pattern: const tinAvailable=...;[const ppSave=...;]const ptSaveVsSeparate=...;const tinCard=...?'...':'';
    # Replace with just: const tinCard='';
    (r"const tinAvailable=prices\.prepaidTinAvailable!==false;const ppSave=\(mo\*12-pp\)\.toFixed\(2\);const ptSaveVsSeparate=ptW&&parseFloat\(ptW\)>pt\?\(parseFloat\(ptW\)-pt\)\.toFixed\(2\):'';const tinCard=tinAvailable\?'.*?':\s*'';",
     "const ppSave=(mo*12-pp).toFixed(2);const tinCard='';"),

    # ── 2. rIncludes: scoate Cutie Amintiri ──
    ("sel.plan==='prepaid_tin'?'24 de scrisori, Cutie Amintiri, cărți poștale și extra':'24 de scrisori, cărți poștale și extra'",
     "'24 de scrisori, cărți poștale și extra'"),

    # ── 3. revImg: scoate tinImg ──
    ("sel.plan==='prepaid_tin'?sel.story.tinImg:sel.story.detailImg",
     "sel.story.detailImg"),
    ("sel.plan==='prepaid_tin'?sel.story.tinImg:sel.story.tileImg",
     "sel.story.tileImg"),
    ("sel.story?.(sel.plan==='prepaid_tin'?sel.story.tinImg:sel.story.detailImg)",
     "sel.story?.detailImg"),

    # ── 4. updateSidebarIncludes: scoate Cutie amintiri ──
    ("const t=sel.plan==='prepaid_tin'?'<div class=\"sb-inc-item\">Cutie amintiri personalizată</div>':'';",
     "const t='';"),
    ("const mt=sel.plan==='prepaid_tin'?'<div class=\"md-inc\">Cutie amintiri personalizată</div>':'';",
     "const mt='';"),

    # ── 5. calcSavings: scoate ramura prepaid_tin ──
    (r"if\(sel\.plan==='prepaid_tin'\)\{const was=prices\.prepaidTinWas\?parseFloat\(prices\.prepaidTinWas\):mo;return\{save:\(was-pt\)\.toFixed\(2\)\}\}",
     ""),

    # ── 6. rShipLabel: scoate "(în cutie)" ──
    ("sel.plan==='prepaid_tin'?'Prima Scrisoare Expediată (în cutie)':'Prima Scrisoare Expediată'",
     "'Prima Scrisoare Expediată'"),
    ("sel.plan==='prepaid_tin'?'Prima scrisoare expediată (în cutie)':'Prima scrisoare expediată'",
     "'Prima scrisoare expediată'"),

    # ── 7. updateSidebar m map: scoate prepaid_tin entry ──
    ("prepaid_tin:{l:'Poveste Preplătită + Cutie',t:Math.round(pt)+' lei'},",
     ""),
    ("prepaid_tin:{l:'Poveste Preplătită + Cutie',t:Math.round(pt)+' lei'}, ",
     ""),

    # ── 8. sbImg: scoate tinImg ──
    ("sel.plan==='prepaid_tin'?sel.story.tinImg:sel.story.tileImg",
     "sel.story.tileImg"),

    # ── 9. checkout: scoate ramura prepaid_tin ──
    (r"else if\(sel\.plan==='prepaid_tin'\)\{const vid=vm\?\.tin\|\|prices\.prepaidTinVid;cartItems\.push\(\{id:parseInt\(vid\),quantity:1,properties:props\}\)\}",
     ""),

    # ── 10. session restore: simplify ──
    ("!(d.plan==='prepaid_tin'&&prices.prepaidTinAvailable===false)",
     "true"),

    # ── 11. Klavio: scoate ramura prepaid_tin ──
    ("if(sel.plan==='prepaid_tin')data['$value']=parseFloat(prices.prepaidTin||126);else if(sel.plan==='prepaid')",
     "if(sel.plan==='prepaid')"),

    # ── 12. FB Pixel: scoate prepaid_tin ──
    ("sel.plan==='prepaid_tin'?parseFloat(prices.prepaidTin||126):sel.plan==='prepaid'?",
     "sel.plan==='prepaid'?"),

    # ── 13. dpPricePT: ascunde prețul Preplătit+Cutie ──
    (r"document\.getElementById\('dpPricePT'\)\.textContent=tinAvailable\?pt\+' lei Preplătit\+Cutie':'';",
     "document.getElementById('dpPricePT').textContent='';"),
    (r"document\.getElementById\('dpPricePT'\)\.textContent=tinAvailable\?pt\+\" lei Preplătit\+Cutie\":'';",
     "document.getElementById('dpPricePT').textContent='';"),

    # ── 14. dp-price-sep: nu mai ascunde separator ──
    (r"document\.querySelectorAll\('\.dp-price-sep'\)\.forEach\(\(s,i\)=>\{s\.style\.display=\(i===1&&!tinAvailable\)\?'none':'inline'\}\);",
     ""),

    # ── 15. prices object: scoate prepaidTin entries ──
    (",prepaidTin:'630',prepaidTinWas:'',prepaidTinVid:''",
     ""),
    (",prepaidTin:'630',prepaidTinWas:'',prepaidTinVid:'',prepaidTinAvailable:true",
     ""),

    # ── 16. vm map: scoate tin variant ids ──
    ("tin:'47045817663744',",  ""),  # audrey-rose
    ("tin:'47045817729280',",  ""),  # adelaide-magnolia
    ("tin:'47353309004032',",  ""),  # camellia-grace
    ("tin:'47045817860352',",  ""),  # orchid-mae
    ("tin:'47045817794816',",  ""),  # lily-clara
    ("tin:'47045817925888',",  ""),  # norah-aven
    # generic pattern pentru orice tin id rămas
    (r"tin:'[0-9]+',(prepaid|monthly)",
     r"\1"),

    # ── 17. Navigație: scoate link-ul spre colecția de cutii ──
    ('<a class="site-nav__link site-nav__child-link" href="/collections/floral-collection-tins">\n<span class="site-nav__label">Cutii metalice</span>\n</a>\n</li>',
     ''),
    ('<li class="lvl-2"><a href="/collections/floral-collection-tins">Cutii florale metalice</a></li>',
     ''),

    # ── 18. Recenzia cu "cutia" (tinul) – norah-aven ──
    ('{t:\'"Era atât de entuziasmată să primească cutia! Ce cadou minunat — îi place să citească și este o pasionată de istorie."\'',
     '{t:\'"Sunt absolut îndrăgostită de Colecția Norah Aven! Scrisă frumos, incredibil de captivantă și interactivă."\''),

    # ── 19. "Prima Scrisoare Expediată (în cutie)" label static ──
    ("'Prima Scrisoare Expediată (în cutie)'",
     "'Prima Scrisoare Expediată'"),

    # ── 20. get-started: preselectPlan scoate prepaidTin ──
    (",prepaidTin:'630'",  ""),
    (",prepaidTinWas:''",  ""),
    (",prepaidTinVid:''",  ""),
    (",prepaidTinAvailable",  ""),
]

# Fișiere afectate
files = (
    glob.glob(f'{BASE}/products/*.html') +
    glob.glob(f'{BASE}/pages/*.html')
)
files = [f for f in files if '@' not in os.path.basename(f) and 'en-ca' not in f]

total = 0
for fp in sorted(files):
    content = open(fp, encoding='utf-8', errors='ignore').read()
    c = content

    for fix in FIXES:
        old, new = fix
        if old.startswith('(') or '\\(' in old or '\\.' in old:
            # regex
            c = re.sub(old, new, c, flags=re.S)
        else:
            c = c.replace(old, new)

    if c != content:
        open(fp, 'w', encoding='utf-8').write(c)
        print(f'  ✓ {os.path.relpath(fp, BASE)}')
        total += 1

print(f'\nGata! {total} fișiere modificate.')
