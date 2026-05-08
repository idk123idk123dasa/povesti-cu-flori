#!/usr/bin/env python3
"""
Fixează prețurile afișate de JavaScript:
1. Schimbă prețurile default din USD în lei (×5)
2. Înlocuiește '$' prefix cu 'lei' suffix în renderPlans() și showDetailPricing()
"""
import re, glob, os

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

def fix_content(content):
    if 'function renderPlans' not in content:
        return content

    c = content

    # 1. Fix default prices object ×5
    def fix_prices_obj(m):
        obj = m.group(0)
        def mul(pm):
            v = float(pm.group(1))
            return f"'{round(v * 5)}'"
        return re.sub(r"'(\d+\.\d+)'", mul, obj)
    c = re.sub(r"prices=\{monthly:'[\d.]+'.*?prepaidTinVid:''}", fix_prices_obj, c, flags=re.DOTALL)

    # 2. Fix showDetailPricing currency display
    c = c.replace("'$'+mo+'/mo'", "mo+' lei/lună'")
    c = c.replace("'$'+pp+' Prepaid Story'", "pp+' lei Poveste Prepaid'")
    c = c.replace("'$'+pt+' Prepaid+Tin'", "pt+' lei Prepaid+Cutie'")

    # 3. Fix renderPlans currency display
    c = c.replace("'$'+pt.toFixed(2)", "Math.round(pt)+' lei'")
    c = c.replace("'$'+pp.toFixed(2)", "Math.round(pp)+' lei'")
    c = c.replace("'$'+mo.toFixed(2)", "Math.round(mo)+' lei'")

    # 4. Fix was/compare prices
    c = c.replace(
        "'<span class=\"was\">$'+ptW+'</span>'",
        "(ptW?'<span class=\"was\">'+ptW+' lei</span>':'')"
    )
    c = c.replace(
        "'<span class=\"was\">$'+ppW+'</span>'",
        "(ppW?'<span class=\"was\">'+ppW+' lei</span>':'')"
    )
    c = c.replace(
        "'<span class=\"was\">$'+moW+'</span>'",
        "(moW?'<span class=\"was\">'+moW+' lei</span>':'')"
    )

    # 5. Fix save text
    c = c.replace(
        "'Buy Together and Save $'+ptSaveVsSeparate+'</div>'",
        "'Cumpărați împreună și economisiți '+Math.round(ptSaveVsSeparate)+' lei</div>'"
    )
    c = c.replace(
        "'Prepay and Save $'+ppSave",
        "'Economisiți '+Math.round(ppSave)+' lei prepătiind'"
    )

    # 6. Fix loadPrices to multiply fetched prices ×5
    c = c.replace(
        "prices.prepaidTin=v.price;prices.prepaidTinWas=v.compare_at_price||'';",
        "prices.prepaidTin=Math.round(parseFloat(v.price)*5);prices.prepaidTinWas=v.compare_at_price?Math.round(parseFloat(v.compare_at_price)*5):'';"
    )
    c = c.replace(
        "prices.prepaid=v.price;prices.prepaidWas=v.compare_at_price||'';",
        "prices.prepaid=Math.round(parseFloat(v.price)*5);prices.prepaidWas=v.compare_at_price?Math.round(parseFloat(v.compare_at_price)*5):'';"
    )
    c = c.replace(
        "prices.monthly=v.price;prices.monthlyWas=v.compare_at_price||'';",
        "prices.monthly=Math.round(parseFloat(v.price)*5);prices.monthlyWas=v.compare_at_price?Math.round(parseFloat(v.compare_at_price)*5):'';"
    )

    return c

files = glob.glob(f'{BASE}/**/*.html', recursive=True) + glob.glob(f'{BASE}/*.html')
files = [f for f in files if 'en-ca' not in f and '@' not in os.path.basename(f)]

for filepath in files:
    content = open(filepath, encoding='utf-8', errors='ignore').read()
    if 'function renderPlans' not in content:
        continue
    rel = os.path.relpath(filepath, BASE)
    new_content = fix_content(content)
    if new_content != content:
        open(filepath, 'w', encoding='utf-8').write(new_content)
        print(f"  ✓ {rel}")
    else:
        print(f"  - {rel} (neschimbat)")

print("\nGata!")
