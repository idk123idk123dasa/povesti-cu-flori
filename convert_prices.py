#!/usr/bin/env python3
"""
Convertește toate prețurile din USD ($) în RON (lei) cu rata 1$ = 5 lei.
"""
import re, glob, os

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

def convert_price(match):
    amount_str = match.group(1)
    try:
        amount = float(amount_str)
        lei = round(amount * 5)
        return f"{lei} lei"
    except:
        return match.group(0)

# Regex: $12.00 sau $12 dar nu ${{amount}} sau ${var}
PRICE_RE = re.compile(r'\$(\d+(?:\.\d+)?)(?!\{|\d)')

def process_file(filepath):
    content = open(filepath, encoding='utf-8', errors='ignore').read()

    # Nu atinge template variables ${{amount}} sau ${...}
    new_content = PRICE_RE.sub(convert_price, content)

    if new_content != content:
        open(filepath, 'w', encoding='utf-8').write(new_content)
        # Numără câte înlocuiri s-au făcut
        count = len(PRICE_RE.findall(content))
        return count
    return 0

files = glob.glob(f'{BASE}/**/*.html', recursive=True) + glob.glob(f'{BASE}/*.html')
files = [f for f in files if 'en-ca' not in f and '@' not in os.path.basename(f)]
files.sort()

total_changes = 0
total_files = 0

for filepath in files:
    rel = os.path.relpath(filepath, BASE)
    count = process_file(filepath)
    if count:
        print(f"  ✓ {rel}: {count} prețuri convertite")
        total_files += 1
        total_changes += count

print(f"\nGata! {total_changes} prețuri convertite în {total_files} fișiere.")
