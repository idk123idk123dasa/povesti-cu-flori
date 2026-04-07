#!/usr/bin/env python3
"""Translate English text in JSON API files to Romanian."""

import json
import glob
import re
from bs4 import BeautifulSoup, NavigableString, Comment

# Large EN->RO dictionary for all page content
TRANSLATIONS = {
    # Recenzii page
    "What Real Customers Are Saying About The Flower Letters": "Ce spun clienții reali despre Scrisorile cu Flori",
    "Wondering what makes The Flower Letters such a beloved experience? Below, you'll find heartfelt reviews from real subscribers who've stepped into the magic of our mailed storytelling. From historical romance to vintage adventure, discover why this gift is cherished all year long.": "Te întrebi ce face din Scrisorile cu Flori o experiență atât de iubită? Mai jos vei găsi recenzii sincere de la abonați reali care au intrat în magia poveștilor noastre livrate prin poștă. De la romantic istoric la aventuri vintage, descoperă de ce acest cadou este prețuit tot anul.",
    "Find Your Story": "Găsește-ți povestea",

    # FAQ page
    "GENERAL QUESTIONS": "ÎNTREBĂRI GENERALE",
    "What are The Flower Letters?": "Ce sunt Scrisorile cu Flori?",
    "The Flower Letters is a 12-month story experience that brings captivating stories to life through beautifully illustrated letters delivered straight to your mailbox, twice a month.": "Scrisorile cu Flori este o experiență de poveste pe 12 luni care aduce povești captivante la viață prin scrisori frumos ilustrate, livrate direct în cutia ta poștală, de două ori pe lună.",
    "How does it work?": "Cum funcționează?",
    "How much does it cost?": "Cât costă?",
    "Can I cancel at any time?": "Pot anula oricând?",
    "Is this a good gift?": "Este un cadou bun?",
    "How often will I receive letters?": "Cât de des voi primi scrisori?",
    "What comes in each envelope?": "Ce conține fiecare plic?",
    "Where do you ship?": "Unde expediați?",
    "Do you ship internationally?": "Expediați internațional?",
    "What if my letters are lost or damaged?": "Ce se întâmplă dacă scrisorile mele se pierd sau se deteriorează?",
    "SUBSCRIPTION QUESTIONS": "ÎNTREBĂRI DESPRE ABONAMENT",
    "SHIPPING QUESTIONS": "ÎNTREBĂRI DESPRE EXPEDIERE",
    "GIFT QUESTIONS": "ÎNTREBĂRI DESPRE CADOURI",
    "STORY QUESTIONS": "ÎNTREBĂRI DESPRE POVEȘTI",
    "Yes": "Da",
    "No": "Nu",
    "Yes!": "Da!",
    "Absolutely!": "Absolut!",

    # How it works
    "a thoughtful gift made simple": "un cadou atent, simplificat",
    "Twenty-four beautifully illustrated letters, delivered over twelve months—a gift that keeps on giving.": "Douăzeci și patru de scrisori frumos ilustrate, livrate pe parcursul a douăsprezece luni — un cadou care continuă să ofere.",
    "AS GIFT": "CA CADOU",
    "FOR ME": "PENTRU MINE",
    "Step 1": "Pasul 1",
    "Step 2": "Pasul 2",
    "Step 3": "Pasul 3",
    "Choose a Story": "Alege o poveste",
    "Choose Your Story": "Alege-ți povestea",
    "We Ship Your Letters": "Noi expediem scrisorile tale",
    "Enjoy The Magic": "Bucură-te de magie",
    "Pick a Story": "Alege o poveste",

    # Gift page
    "The perfect last minute gift": "Cadoul perfect de ultimă clipă",
    "Order Today...Give Today!": "Comandă azi...Dăruiește azi!",
    "Place your order": "Plasează comanda",
    "Gift Card Printout": "Card cadou printabil",
    "Is this a gift?": "Acesta este un cadou?",
    "Download our gift card printout": "Descarcă cardul nostru cadou printabil",
    "give it to the recipient": "dăruiește-l destinatarului",

    # About/Mission
    "ABOUT THE AUTHOR": "DESPRE AUTOR",
    "meet hannie clark": "cunoaște-o pe Hannie Clark",
    "Author, Illustrator and Co-Creator of The Flower Letters": "Autoare, ilustratoare și co-creatoare a Scrisorilor cu Flori",
    "Our Mission": "Misiunea noastră",
    "Joy | Relief | Connection | Enrichment": "Bucurie | Alinare | Conexiune | Îmbogățire",
    "Bring Joy": "Aducem bucurie",
    "Offer Relief": "Oferim alinare",
    "Foster Connection": "Cultivăm conexiunea",
    "Provide Enrichment": "Oferim îmbogățire",

    # Learn More
    "Learn The History": "Descoperă istoria",
    "Browse Articles By STORY": "Răsfoiește articolele după POVESTE",
    "Extended Learning": "Învățare extinsă",

    # Trust badges / common
    "3.5 Million+": "Peste 3,5 milioane",
    "3 Million+": "Peste 3 milioane",
    "Letters Mailed": "Scrisori expediate",
    "Five-Star Reviews": "Recenzii de cinci stele",
    "Risk-Free": "Fără risc",
    "Cancel Anytime": "Anulează oricând",
    "Money Back Guarantee": "Garanție de returnare a banilor",
    "30 Day Money Back Guarantee": "Garanție de returnare a banilor în 30 de zile",
    "Protected Shipping": "Livrare protejată",
    "Free Shipping": "Livrare gratuită",

    # Products/pricing
    "Default Title": "Titlu implicit",
    "Error": "Eroare",
    "Quantity must be 1 or more": "Cantitatea trebuie să fie 1 sau mai mare",
    "Adding product to your cart": "Se adaugă produsul în coș",
    "calculated at checkout": "calculat la finalizare",
    "Regular price": "Preț normal",
    "Sale price": "Preț redus",
    "Unit price": "Preț unitar",
    "Sold out": "Epuizat",
    "In stock": "În stoc",
    "Add to Cart": "Adaugă în coș",
    "Add to cart": "Adaugă în coș",

    # Reviews
    "Customer Reviews": "Recenzii clienți",
    "Verified Customer": "Client verificat",
    "Write a Review": "Scrie o recenzie",
    "Based on": "Bazat pe",
    "verified reviews": "recenzii verificate",
    "reviews": "recenzii",
    "out of 5": "din 5",
    "stars": "stele",
    "star": "stea",

    # Social
    "Share on Facebook": "Distribuie pe Facebook",
    "Tweet on Twitter": "Postează pe Twitter",
    "Pin on Pinterest": "Fixează pe Pinterest",
    "Share": "Distribuie",
    "Tweet": "Tweet",

    # Podcast
    "ALL EPISODES": "TOATE EPISOADELE",
    "WATCH ON YOUTUBE": "VIZIONEAZĂ PE YOUTUBE",
    "Listen Now": "Ascultă acum",

    # Shipping
    "mailing dates": "date de expediere",
    "the flower letterS": "scrisorile cu flori",
    "The Flower Letters": "Scrisorile cu Flori",

    # Common buttons/CTAs
    "Learn More": "Află mai mult",
    "Learn more": "Află mai mult",
    "Read More": "Citește mai mult",
    "Read more": "Citește mai mult",
    "Shop Now": "Cumpără acum",
    "Shop now": "Cumpără acum",
    "Subscribe": "Abonează-te",
    "Sign Up": "Înscrie-te",
    "Sign up": "Înscrie-te",
    "Contact Us": "Contactează-ne",
    "Get Started": "Începe acum",
    "View All": "Vezi tot",
    "See All": "Vezi tot",
    "See all reviews": "Vezi toate recenziile",
    "See all": "Vezi tot",
    "Back": "Înapoi",
    "Close": "Închide",
    "Next": "Următorul",
    "Previous": "Anteriorul",
    "Submit": "Trimite",
    "Send": "Trimite",
    "Email": "Email",
    "Name": "Nume",
    "Message": "Mesaj",
    "Phone": "Telefon",

    # Wallpaper
    "Get beautiful hand-drawn mobile wallpapers": "Descarcă imagini de fundal frumoase, desenate manual, pentru telefonul mobil",

    # Printables
    "First letter mails in 1-3 business days!": "Prima scrisoare se expediază în 1-3 zile lucrătoare!",
    "Mega Bundle": "Pachet Mega",
    "All 4 Collections": "Toate cele 4 colecții",
    "Bundle": "Pachet",

    # Summary / common words
    "Summary": "Rezumat",
    "Description": "Descriere",
    "Details": "Detalii",
    "Features": "Caracteristici",
    "Includes": "Include",
    "What's Included": "Ce este inclus",
    "Overview": "Prezentare generală",
    "OVERVIEW": "PREZENTARE GENERALĂ",
    "per month": "pe lună",
    "per year": "pe an",
    "monthly": "lunar",
    "annually": "anual",
    "Prepaid": "Preplătit",

    # Footer-like
    "about": "despre",
    "story collections": "colecții de povești",
    "learn more": "află mai mult",
    "newsletter": "newsletter",
    "Copyright": "Drepturi de autor",
    "All rights reserved": "Toate drepturile rezervate",
    "Powered by Shopify": "Realizat cu Shopify",

    # Common phrases
    "click here": "click aici",
    "save even more": "economisește și mai mult",
    "annual subscription": "abonament anual",
    "Now mailing internationally!": "Acum expediem internațional!",
    "International Shipping Available": "Expediere internațională disponibilă",
    "subscribers will receive": "abonații vor primi",
}

# Longer paragraphs that need full translation
PARAGRAPH_TRANSLATIONS = {
    "In each envelope, you'll find heartfelt correspondence between story characters, along with thoughtfully designed extras": "În fiecare plic vei găsi corespondență sinceră între personajele poveștii, împreună cu extras-uri gândite cu grijă",
    "This website and our products are intended for entertainment purposes only": "Acest site web și produsele noastre sunt destinate exclusiv scopurilor de divertisment",
    "We do not claim to be historians or history teachers": "Nu pretindem că suntem istorici sau profesori de istorie",
    "We mail using the USPS mail system": "Expediem folosind sistemul poștal USPS",
    "This Privacy Policy describes how your personal information is collected, used, and shared": "Această Politică de Confidențialitate descrie cum sunt colectate, utilizate și partajate informațiile tale personale",
    "Personal information we collect": "Informații personale pe care le colectăm",
    "TERMS OF SERVICE": "TERMENI ȘI CONDIȚII",
    "This website is operated by The Flower Letters": "Acest site web este operat de Scrisorile cu Flori",
    "REFUNDS": "RAMBURSĂRI",
    "Guarantee": "Garanție",
}


def translate_html_content(html):
    """Translate English text in HTML content to Romanian."""
    if not html or len(html) < 10:
        return html

    soup = BeautifulSoup(html, 'html.parser')

    for element in soup.find_all(string=True):
        if isinstance(element, Comment):
            continue

        parent = element.parent
        if parent and parent.name in ('script', 'style', 'noscript', 'code'):
            continue

        skip = False
        for ancestor in element.parents:
            if ancestor.name in ('script', 'style', 'noscript'):
                skip = True
                break
        if skip:
            continue

        original = str(element)
        stripped = original.strip()
        if not stripped or len(stripped) < 2:
            continue

        translated = original

        # Try exact match first
        if stripped in TRANSLATIONS:
            translated = original.replace(stripped, TRANSLATIONS[stripped])
        else:
            # Try paragraph translations (partial match)
            for en, ro in PARAGRAPH_TRANSLATIONS.items():
                if en in translated:
                    translated = translated.replace(en, ro)

            # Try phrase translations
            for en, ro in TRANSLATIONS.items():
                if len(en) > 3 and en in translated:
                    translated = translated.replace(en, ro)

        if translated != original:
            element.replace_with(NavigableString(translated))

    return str(soup)


def process_json_file(filepath):
    """Process a single JSON file and translate its content."""
    with open(filepath, 'r', encoding='utf-8') as f:
        raw = f.read().strip()
    if not raw:
        return False
    data = json.loads(raw)

    if isinstance(data, list):
        # products/index.json is a list
        return False

    modified = False

    if 'content' in data and data['content']:
        new_content = translate_html_content(data['content'])
        if new_content != data['content']:
            data['content'] = new_content
            modified = True

    if 'title' in data and data['title']:
        t = data['title']
        if t in TRANSLATIONS:
            data['title'] = TRANSLATIONS[t]
            modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    return modified


def main():
    files = (
        glob.glob('frontend/public/api/pages/*.json') +
        glob.glob('frontend/public/api/policies/*.json') +
        glob.glob('frontend/public/api/products/*.json') +
        glob.glob('frontend/public/api/blogs/**/*.json', recursive=True)
    )

    # Skip index files
    files = [f for f in files if not f.endswith('index.json')]

    translated = 0
    for f in sorted(files):
        name = '/'.join(f.split('/')[-2:])
        result = process_json_file(f)
        if result:
            translated += 1
            print(f'  ✓ {name}')

    print(f'\nTraduse: {translated}/{len(files)} fișiere')


if __name__ == '__main__':
    main()
