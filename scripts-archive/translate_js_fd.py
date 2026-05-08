#!/usr/bin/env python3
"""
Translatey string-urile din const FD={...} în fișierele HTML.
Acestea sunt descrierile poveștilor în JavaScript, ignorate de BeautifulSoup.
"""
import re, time, glob, os
from deep_translator import GoogleTranslator

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

translator = GoogleTranslator(source='en', target='ro')

def translate_text(text):
    """Translatey un bloc de text lung."""
    # Împarte în paragrafe pentru a respecta limita Google Translate
    paragraphs = text.split('\n\n')
    translated_paragraphs = []
    for para in paragraphs:
        if not para.strip():
            translated_paragraphs.append(para)
            continue
        try:
            tr = translator.translate(para.strip())
            translated_paragraphs.append(tr or para)
            time.sleep(0.15)
        except Exception as e:
            print(f"    Eroare traducere paragraf: {e}")
            translated_paragraphs.append(para)
    return '\n\n'.join(translated_paragraphs)

def process_file(filepath):
    content = open(filepath, encoding='utf-8', errors='ignore').read()

    # Caută const FD={...};
    fd_match = re.search(r'(const FD\s*=\s*\{)(.*?)(\};)', content, re.DOTALL)
    if not fd_match:
        return False

    fd_body = fd_match.group(2)

    # Extrage cheile și string-urile (format: 'key':"text lung...")
    # String-urile pot conține \n ca literal
    entries = re.findall(r"'([^']+)'\s*:\s*\"((?:[^\"\\]|\\.)*)\"", fd_body)
    if not entries:
        return False

    print(f"  Găsite {len(entries)} povești de tradus...")

    new_fd_body = fd_body
    for key, value in entries:
        # Decodifică \n în text real
        decoded = value.replace('\\n', '\n')

        # Verifică dacă deja tradus (conține diacritice românești)
        if re.search(r'[ăîâșțĂÎÂȘȚ]', decoded):
            print(f"    '{key}': deja tradus, skip")
            continue

        print(f"    Traduc '{key}'...")
        translated = translate_text(decoded)

        # Re-encodifică \n
        encoded = translated.replace('\n', '\\n')

        # Înlocuiește în body
        old_entry = f"'{key}\":{chr(34)}{value}{chr(34)}"
        # Folosim înlocuire directă
        old_pattern = f"'{key}':\"{value}\""
        new_pattern = f"'{key}':\"{encoded}\""
        new_fd_body = new_fd_body.replace(old_pattern, new_pattern)

    new_content = content[:fd_match.start(2)] + new_fd_body + content[fd_match.end(2):]

    if new_content != content:
        open(filepath, 'w', encoding='utf-8').write(new_content)
        return True
    return False

files = glob.glob(f'{BASE}/**/*.html', recursive=True) + glob.glob(f'{BASE}/*.html')
files = [f for f in files if 'en-ca' not in f and '@' not in os.path.basename(f)]

target_files = [f for f in files if 'const FD=' in open(f, encoding='utf-8', errors='ignore').read()]
print(f"Fișiere cu const FD: {len(target_files)}")

for filepath in target_files:
    rel = os.path.relpath(filepath, BASE)
    print(f"\n{rel}:")
    try:
        result = process_file(filepath)
        print(f"  {'✓ Tradus' if result else '- Neschimbat'}")
    except Exception as e:
        print(f"  ✗ Eroare: {e}")

print("\nGata!")
