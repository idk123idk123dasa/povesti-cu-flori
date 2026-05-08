#!/usr/bin/env python3
import re, os, time, glob
from bs4 import BeautifulSoup, NavigableString, Comment
from deep_translator import GoogleTranslator

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'
SEP = '\n|||\n'

EN_RE = re.compile(r'\b(the|and|for|with|your|our|this|that|from|have|been|will|are|you|can|get|all|more|about|what|when|how|was|its|not|but|they|also|here|there|which|than|then|into|some|just|only|would|could|should|their|these|those|every|each|through|before|after|other|another|first|last|make|made|send|sent|receive|free|gift|shop|love|read|letter|story|subscribe|subscription|monthly|annual|order|checkout|payment|shipping|mailing|address|email|date|card|download|digital|print|click|please|contact|question|review|customer|verified|collection|welcome|choose|select|enter|complete|start|find|explore|letters|stories|sign|page|learn|based|using|used|use|help|visit|share|follow|join|new|view|show|back|next|see|try|want|need|look|give|take|keep|come|know|think|feel|believe|understand|create|build|include|provide|offer|allow|enable|support|manage|track|update|change|remove|edit|save|submit|cancel|confirm|close|open|search|filter|sort|load|home|about|contact|blog|news|product|service|price|cost|buy|purchase|sale|discount|delivery|return|refund|policy|terms|privacy|account|profile|settings|logout|login|register|password|username|phone|city|country|region|zip|postal|province|available|currently|recently|immediately|quickly|easily|simply|directly|automatically|personally|especially|generally|usually|always|never|often|sometimes|already|still|again|even|however|therefore|because|since|while|although|unless|until|whether|either|neither|both|each|every|any|some|few|many|much|most|less|least|same|different|large|small|long|short|high|low|good|bad|best|worst|right|wrong|true|false|yes|please|thank|sorry|hello|goodbye|okay)\b', re.IGNORECASE)

SKIP_TAGS = {'script','style','code','pre','noscript','svg','template'}
SKIP_RE = re.compile(r'^[\s\W\d]*$|^https?://|@[a-z]|^\{|^\[|^\$', re.IGNORECASE)

translator = GoogleTranslator(source='en', target='ro')
cache = {}

def needs_translation(text):
    s = text.strip()
    if not s or len(s) < 4: return False
    if SKIP_RE.match(s): return False
    if re.search(r'[ăîâșțĂÎÂȘȚ]', s): return False
    return bool(EN_RE.search(s))

def batch_translate(texts):
    if not texts: return []
    results = [None] * len(texts)
    to_do = []
    for i, t in enumerate(texts):
        s = t.strip()
        if s in cache:
            results[i] = t.replace(s, cache[s]) if cache[s] != s else t
        else:
            to_do.append((i, s, t))

    chunks, cur, cur_len = [], [], 0
    for item in to_do:
        txt = item[1]
        if cur_len + len(txt) > 3500 and cur:
            chunks.append(cur); cur = [item]; cur_len = len(txt)
        else:
            cur.append(item); cur_len += len(txt) + len(SEP)
    if cur: chunks.append(cur)

    for chunk in chunks:
        combined = SEP.join(s for _, s, _ in chunk)
        try:
            translated = translator.translate(combined)
            parts = [p.strip() for p in translated.split('|||')]
            if len(parts) == len(chunk):
                for (i, orig, full), tr in zip(chunk, parts):
                    cache[orig] = tr
                    results[i] = full.replace(orig, tr) if tr != orig else full
            else:
                for i, orig, full in chunk:
                    try:
                        tr = translator.translate(orig)
                        cache[orig] = tr or orig
                        results[i] = full.replace(orig, tr) if tr and tr != orig else full
                        time.sleep(0.05)
                    except:
                        cache[orig] = orig; results[i] = full
        except:
            for i, orig, full in chunk:
                cache[orig] = orig; results[i] = full
        time.sleep(0.1)
    return results

def translate_file(filepath):
    content = open(filepath, encoding='utf-8', errors='ignore').read()
    if not content.strip(): return False
    soup = BeautifulSoup(content, 'html.parser')
    modified = False

    html_tag = soup.find('html')
    if html_tag and html_tag.get('lang','').startswith('en'):
        html_tag['lang'] = 'ro'; modified = True

    text_nodes, attr_nodes, meta_nodes = [], [], []

    for el in soup.find_all(string=True):
        if isinstance(el, Comment): continue
        if any(getattr(a,'name','') in SKIP_TAGS for a in el.parents): continue
        orig = str(el)
        if needs_translation(orig): text_nodes.append((el, orig))

    for el in soup.find_all(True):
        for attr in ['alt','placeholder','aria-label','title']:
            val = el.get(attr,'')
            if val and needs_translation(val): attr_nodes.append((el, attr, val))

    for meta in soup.find_all('meta'):
        name = meta.get('name','') + meta.get('property','')
        if any(x in name for x in ['description','og:title','og:description','twitter:title','twitter:description']):
            val = meta.get('content','')
            if val and needs_translation(val): meta_nodes.append((meta, val))

    title_tag = soup.find('title')
    title_val = title_tag.string if title_tag and title_tag.string and needs_translation(title_tag.string) else None

    all_texts = ([t for _,t in text_nodes] + [v for _,_,v in attr_nodes] +
                 [v for _,v in meta_nodes] + ([title_val] if title_val else []))

    if all_texts:
        translated = batch_translate(all_texts)
        idx = 0
        for el, orig in text_nodes:
            tr = translated[idx]; idx += 1
            if tr and tr != orig: el.replace_with(NavigableString(tr)); modified = True
        for el, attr, orig in attr_nodes:
            tr = translated[idx]; idx += 1
            if tr and tr != orig: el[attr] = tr; modified = True
        for meta, orig in meta_nodes:
            tr = translated[idx]; idx += 1
            if tr and tr != orig: meta['content'] = tr; modified = True
        if title_val:
            tr = translated[idx]; idx += 1
            if tr and tr != title_val and title_tag: title_tag.string = tr; modified = True

    if modified:
        open(filepath, 'w', encoding='utf-8').write(str(soup))
        return True
    return False

FILES_PRIORITY = [
    'pages/terms-and-conditions.html',
    'pages/faq.html',
    'products/the-audrey-rose-collection-monthly.html',
    'pages/cg-learn-article-4-depression-expo.html',
    'pages/privacy-policy.html',
    'products/the-orchid-mae-letters.html',
    'products/the-norah-aven-chronicles.html',
    'products/the-lily-clara-collection-annual.html',
    'products/the-audrey-rose-letters-prepaid.html',
    'products/the-adelaide-magnolia-collection-annual.html',
    'products/an-immersive-story-experience-told-through-letters.html',
    'pages/get-started.html',
    'pages/gift-story-letters.html',
    'pages/gift-printout.html',
    'pages/digital-printables.html',
    'pages/cg-learn-1-summering-in-opulence.html',
    'index.html',
    'pages/cg-learn-article-3-legacy-of-faith.html',
    'pages/the-flower-letters-reviews.html',
    'pages/cg-learn-article-2-robber-barons.html',
    'blogs/audrey-rose/dancecard.html',
    'blogs/audrey-rose/rationing-during-world-war-ii.html',
    'products/the-norah-aven-chronicles-pt2.html',
    'policies/shipping-policy.html',
    'pages/mission.html',
    'pages/shipping.html',
]

all_html = glob.glob(f'{BASE}/**/*.html', recursive=True) + glob.glob(f'{BASE}/*.html')
all_html = [f for f in all_html if 'en-ca' not in f and '@' not in os.path.basename(f)]
in_priority = set(FILES_PRIORITY)
remaining = [f for f in sorted(all_html) if os.path.relpath(f, BASE) not in in_priority]
ordered = [os.path.join(BASE, p) for p in FILES_PRIORITY] + remaining

total = len(ordered)
print(f'Traducere {total} pagini...', flush=True)
for i, filepath in enumerate(ordered, 1):
    if not os.path.exists(filepath): continue
    rel = os.path.relpath(filepath, BASE)
    try:
        result = translate_file(filepath)
        print(f'  {"✓" if result else "-"} [{i}/{total}] {rel}', flush=True)
    except Exception as e:
        print(f'  ✗ [{i}/{total}] {rel}: {e}', flush=True)

print('Gata!', flush=True)
