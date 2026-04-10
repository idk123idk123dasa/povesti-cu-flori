#!/usr/bin/env python3
"""
Translate all HTML files from English to Romanian.
Uses batch Google Translate (one call per file) for efficiency.
"""

import os
import re
import sys
import time
import glob
from bs4 import BeautifulSoup, NavigableString, Comment
from deep_translator import GoogleTranslator

SITE_DIR = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com'
SEP = '\n|||\n'  # separator for batching

# Words that indicate English text
EN_RE = re.compile(
    r'\b(the|and|for|with|your|our|this|that|from|have|been|will|are|you|can|'
    r'get|all|more|about|what|when|how|was|its|not|but|they|also|here|there|'
    r'which|than|then|into|some|just|only|would|could|should|their|these|those|'
    r'every|each|through|before|after|other|first|last|make|send|receive|free|'
    r'gift|shop|love|read|letter|story|subscribe|subscription|monthly|annual|'
    r'order|checkout|payment|shipping|mailing|address|email|date|card|download|'
    r'digital|print|click|please|contact|questions|reviews|customer|verified|'
    r'collection|welcome|choose|select|enter|complete|start|find|explore)\b',
    re.IGNORECASE
)

# Patterns to NOT translate
SKIP_RE = re.compile(
    r'^[\s\W\d]*$|'       # only whitespace/punct/numbers
    r'^https?://|'         # URLs
    r'@[a-z]|'             # emails
    r'^\{|^\[|^\$',        # JSON/template/vars
    re.IGNORECASE
)

SKIP_TAGS = {'script', 'style', 'code', 'pre', 'noscript', 'svg', 'template', 'head'}

# Quick dict for common strings
DICT = {
    "The Flower Letters": "Scrisorile cu Flori",
    "CHOOSE YOUR STORY": "ALEGE-ȚI POVESTEA",
    "Choose Your Story": "Alege-ți povestea",
    "Find The Perfect Story": "Găsește povestea perfectă",
    "About The Author": "Despre Autor",
    "How it Works": "Cum funcționează",
    "Frequently Asked Questions": "Întrebări frecvente",
    "Mailing Information": "Informații expediere",
    "Contact Us": "Contactează-ne",
    "Our Mission": "Misiunea noastră",
    "Privacy Policy": "Politica de confidențialitate",
    "Terms of Service": "Termeni și condiții",
    "Shipping Policy": "Politica de expediere",
    "Returns & Refunds": "Returnări și rambursări",
    "Regular price": "Preț normal",
    "Sale price": "Preț redus",
    "Add to cart": "Adaugă în coș",
    "Add to Cart": "Adaugă în coș",
    "Sold out": "Epuizat",
    "Sign up": "Înscrie-te",
    "Sign Up": "Înscrie-te",
    "Subscribe": "Abonează-te",
    "Learn More": "Află mai mult",
    "Learn more": "Află mai mult",
    "Read More": "Citește mai mult",
    "Shop Now": "Cumpără acum",
    "Get Started": "Începe acum",
    "Skip to content": "Sari la conținut",
    "Search": "Căutare",
    "Log in": "Autentificare",
    "Login": "Autentificare",
    "Cart": "Coș",
    "Close": "Închide",
    "Back": "Înapoi",
    "Next": "Următor",
    "Previous": "Anterior",
    "Verified Customer": "Client verificat",
    "Customer Reviews": "Recenzii clienți",
    "Write a Review": "Scrie o recenzie",
    "See all reviews": "Vezi toate recenziile",
    "Powered by Shopify": "Realizat cu Shopify",
    "All rights reserved": "Toate drepturile rezervate",
    "Gifting": "Cadouri",
    "Stories": "Povești",
    "Reviews": "Recenzii",
    "Mission": "Misiune",
    "Digital Download": "Descărcare digitală",
    "Quantity": "Cantitate",
    "Share": "Distribuie",
    "Payment methods": "Metode de plată",
    "Newsletter Signup": "Abonare newsletter",
    "Shipping": "Livrare",
    "Summary": "Rezumat",
    "Description": "Descriere",
    "Select options": "Selectează opțiunile",
    "Choose Your Plan": "Alege planul tău",
    "Monthly Subscriptions": "Abonamente lunare",
    "Prepaid Subscriptions": "Abonamente preplătite",
    "Cancel Anytime": "Anulează oricând",
    "Money-Back Guarantee": "Garanție de returnare",
    "Protected Shipping": "Livrare protejată",
    "View all": "Vezi tot",
    "View All": "Vezi tot",
    "Order Now": "Comandă acum",
    "Buy Now": "Cumpără acum",
    "Continue shopping": "Continuă cumpărăturile",
    "Sale": "Reducere",
    "Loading": "Se încarcă",
    "Error": "Eroare",
    "Submit": "Trimite",
    "Send": "Trimite",
    "Email": "Email",
    "Name": "Nume",
    "Phone": "Telefon",
    "Message": "Mesaj",
    "Color": "Culoare",
    "Size": "Mărime",
}

translator = GoogleTranslator(source='en', target='ro')
translation_cache = {}


def needs_translation(text):
    stripped = text.strip()
    if not stripped or len(stripped) < 3:
        return False
    if SKIP_RE.match(stripped):
        return False
    # Already Romanian (has diacritics)
    if re.search(r'[ăîâșțĂÎÂȘȚ]', stripped):
        return False
    if EN_RE.search(stripped):
        return True
    # Only letters, no spaces (probably a code/tag)
    if ' ' not in stripped and stripped.isalpha() and len(stripped) < 15:
        return False
    return False


def apply_dict(text):
    """Apply static dictionary substitutions."""
    result = text
    for en, ro in sorted(DICT.items(), key=lambda x: -len(x[0])):
        if en in result:
            result = result.replace(en, ro)
    return result


def batch_translate(texts):
    """Translate a list of texts in one API call."""
    if not texts:
        return []

    # Filter already in cache
    to_translate = []
    indices = []
    results = [''] * len(texts)

    for i, t in enumerate(texts):
        stripped = t.strip()
        if stripped in translation_cache:
            results[i] = t.replace(stripped, translation_cache[stripped]) if translation_cache[stripped] != stripped else t
        else:
            to_translate.append(stripped)
            indices.append(i)

    if not to_translate:
        return results

    # Split into chunks of max 4500 chars (Google Translate limit ~5000)
    chunks = []
    current_chunk = []
    current_len = 0

    for text in to_translate:
        if current_len + len(text) + len(SEP) > 4000 and current_chunk:
            chunks.append(current_chunk)
            current_chunk = [text]
            current_len = len(text)
        else:
            current_chunk.append(text)
            current_len += len(text) + len(SEP)

    if current_chunk:
        chunks.append(current_chunk)

    # Translate each chunk
    translated_flat = []
    for chunk in chunks:
        combined = SEP.join(chunk)
        try:
            translated = translator.translate(combined)
            parts = translated.split('|||')
            # Normalize: strip and handle split differences
            if len(parts) == len(chunk):
                translated_flat.extend([p.strip() for p in parts])
            else:
                # Fallback: translate individually
                for text in chunk:
                    try:
                        t = translator.translate(text)
                        translated_flat.append(t or text)
                        time.sleep(0.1)
                    except:
                        translated_flat.append(text)
        except Exception as e:
            # Fallback to individual translation
            for text in chunk:
                try:
                    t = translator.translate(text)
                    translated_flat.append(t or text)
                    time.sleep(0.1)
                except:
                    translated_flat.append(text)

    # Map back to results
    for idx, (orig_idx, orig_text) in enumerate(zip(indices, to_translate)):
        if idx < len(translated_flat):
            tr = translated_flat[idx]
            translation_cache[orig_text] = tr
            original = texts[orig_idx]
            results[orig_idx] = original.replace(orig_text, tr) if tr != orig_text else original
        else:
            translation_cache[orig_text] = orig_text
            results[orig_idx] = texts[orig_idx]

    return results


def translate_file(filepath):
    try:
        content = open(filepath, encoding='utf-8', errors='ignore').read()
    except:
        return False

    if not content.strip():
        return False

    # First apply static dict to whole content (fast)
    content_with_dict = apply_dict(content)
    if content_with_dict != content:
        content = content_with_dict

    soup = BeautifulSoup(content, 'html.parser')
    modified = content_with_dict != open(filepath, encoding='utf-8', errors='ignore').read()

    # Fix lang
    html_tag = soup.find('html')
    if html_tag and html_tag.get('lang', '').startswith('en'):
        html_tag['lang'] = 'ro'
        modified = True

    # Collect all text nodes that need translation
    nodes_to_translate = []  # (element, original_text)

    for element in soup.find_all(string=True):
        if isinstance(element, Comment):
            continue
        skip = False
        for ancestor in element.parents:
            if hasattr(ancestor, 'name') and ancestor.name in SKIP_TAGS:
                skip = True
                break
        if skip:
            continue

        original = str(element)
        if needs_translation(original):
            nodes_to_translate.append((element, original))

    # Also collect attributes
    attr_nodes = []
    for el in soup.find_all(True):
        for attr in ['alt', 'placeholder', 'aria-label', 'title']:
            val = el.get(attr, '')
            if val and needs_translation(val):
                attr_nodes.append((el, attr, val))

    # Meta tags
    meta_nodes = []
    for meta in soup.find_all('meta'):
        name = meta.get('name','') + meta.get('property','')
        if any(x in name for x in ['description','og:title','og:description','twitter:title','twitter:description']):
            val = meta.get('content','')
            if val and needs_translation(val):
                meta_nodes.append((meta, val))

    # Title tag
    title_tag = soup.find('title')
    title_val = None
    if title_tag and title_tag.string and needs_translation(title_tag.string):
        title_val = title_tag.string

    # Batch translate all collected texts
    all_texts = (
        [t for _, t in nodes_to_translate] +
        [v for _, _, v in attr_nodes] +
        [v for _, v in meta_nodes] +
        ([title_val] if title_val else [])
    )

    if all_texts:
        translated = batch_translate(all_texts)
        idx = 0

        # Apply to text nodes
        for element, original in nodes_to_translate:
            tr = translated[idx]
            idx += 1
            if tr != original:
                element.replace_with(NavigableString(tr))
                modified = True

        # Apply to attributes
        for el, attr, original in attr_nodes:
            tr = translated[idx]
            idx += 1
            if tr != original:
                el[attr] = tr
                modified = True

        # Apply to meta
        for meta, original in meta_nodes:
            tr = translated[idx]
            idx += 1
            if tr != original:
                meta['content'] = tr
                modified = True

        # Apply to title
        if title_val:
            tr = translated[idx]
            idx += 1
            if tr != title_val and title_tag:
                title_tag.string = tr
                modified = True

    if modified:
        try:
            open(filepath, 'w', encoding='utf-8').write(str(soup))
            return True
        except:
            return False
    return False


def main():
    all_files = glob.glob(os.path.join(SITE_DIR, '**', '*.html'), recursive=True)
    # Skip en-ca locale and query-string files
    html_files = [f for f in all_files if 'en-ca' not in f and '@' not in os.path.basename(f)]
    html_files.sort()

    print(f"Traducere {len(html_files)} fișiere HTML...", flush=True)

    done = 0
    translated_count = 0
    for filepath in html_files:
        rel = os.path.relpath(filepath, SITE_DIR)
        try:
            result = translate_file(filepath)
            done += 1
            if result:
                translated_count += 1
                print(f"  ✓ [{done}/{len(html_files)}] {rel}", flush=True)
            else:
                print(f"  - [{done}/{len(html_files)}] {rel}", flush=True)
        except Exception as e:
            print(f"  ✗ [{done}/{len(html_files)}] {rel}: {e}", flush=True)
            done += 1

    print(f"\nGata! {translated_count}/{len(html_files)} fișiere modificate", flush=True)


if __name__ == '__main__':
    main()
