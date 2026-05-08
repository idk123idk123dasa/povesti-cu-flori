#!/usr/bin/env python3
"""Translate all HTML files in the mirrored site from English to Romanian."""

import os
import re
import glob
from bs4 import BeautifulSoup, NavigableString, Comment

# Comprehensive EN -> RO translation dictionary
TRANSLATIONS = {
    # Navigation & UI
    "Skip to content": "Sari la conținut",
    "Submit": "Trimite",
    "Close search": "Închide căutarea",
    "Search": "Căutare",
    "Log in": "Autentificare",
    "Login": "Autentificare",
    "Cart": "Coș",
    "items": "produse",
    "Shop": "Magazin",
    "Stories": "Povești",
    "Tins": "Cutii metalice",
    "About The Author": "Despre Autor",
    "Gifting": "Cadouri",
    "How it Works": "Cum funcționează",
    "How it works": "Cum funcționează",
    "Learn": "Descoperă",
    "More": "Mai mult",
    "Reviews": "Recenzii",
    "Mission": "Misiune",
    "Our Mission": "Misiunea noastră",
    "Podcast": "Podcast",
    "Contact Us": "Contactează-ne",
    "Mailing Information": "Informații expediere",
    "Mailings": "Expediții",
    "Frequently Asked Questions": "Întrebări frecvente",
    "Wallpaper Downloads": "Descarcă imagini de fundal",
    "Search our store": "Caută în magazinul nostru",

    # Printables
    "Printables NEW!": "Materiale printabile NOU!",
    "Printable Gift Introduction": "Cadou printabil - Introducere",
    "Gift Printouts": "Cadouri printabile",
    "Digital Printables": "Materiale digitale printabile",

    # Hero sections
    "CHOOSE YOUR STORY": "ALEGE-ȚI POVESTEA",
    "GET STARTED": "ÎNCEPE ACUM",
    "Explore Stories": "Explorează poveștile",
    "Explore Our Stories": "Explorează poveștile noastre",
    "Find The Perfect Story": "Găsește povestea perfectă",
    "Something beautiful": "Ceva frumos",
    "is coming in the mail.": "vine prin poștă.",
    "Something beautiful is coming in the mail": "Ceva frumos vine prin poștă",
    "Discover the magic of stories told through letters. Delivered twice a month, all year long.": "Descoperă magia poveștilor spuse prin scrisori. Livrate de două ori pe lună, tot anul.",
    "Hand-illustrated story letters delivered straight to her mailbox, twice a month. The gift moms actually remember.": "Scrisori cu povești ilustrate manual, livrate direct în cutia poștală, de două ori pe lună. Cadoul pe care mamele chiar și-l amintesc.",
    "Joy delivered one letter at a time": "Bucurie livrată câte o scrisoare pe rând",
    "Revive the magic of mail with 24 beautifully illustrated letters. One unfolding story. A gift that keeps arriving — and keeps meaning something.": "Readă magia scrisorilor cu 24 de scrisori frumos ilustrate. O poveste care se dezvăluie treptat. Un cadou care continuă să sosească — și continuă să însemne ceva.",

    # Story names and descriptions
    "Our Stories": "Poveștile noastre",
    "Camellia Grace": "Camellia Grace",
    "Gilded Age Romance": "Romantic din Epoca de Aur",
    "Gilded Age": "Epoca de Aur",
    "Orchid Mae": "Orchid Mae",
    "Archeology Adventure": "Aventură arheologică",
    "Archaeology": "Arheologie",
    "Audrey Rose": "Audrey Rose",
    "WW2 Romance": "Romantic din Al Doilea Război Mondial",
    "WW2": "Al Doilea Război Mondial",
    "Lily Clara": "Lily Clara",
    "Western Adventure": "Aventură western",
    "Western": "Western",
    "Adelaide Magnolia": "Adelaide Magnolia",
    "Regency Romance": "Romantic din epoca Regenței",
    "Regency": "Regență",
    "Norah Aven": "Norah Aven",
    "Fantasy Adventure": "Aventură fantasy",
    "Fantasy": "Fantasy",

    # Product-related
    "NEW! Camellia Grace | Gilded Age": "NOU! Camellia Grace | Epoca de Aur",
    "Adelaide Magnolia | Regency": "Adelaide Magnolia | Regență",
    "Audrey Rose | WW2": "Audrey Rose | Al Doilea Război Mondial",
    "Orchid Mae | Archaeology": "Orchid Mae | Arheologie",
    "Lily Clara | Western": "Lily Clara | Western",
    "Norah Aven 1 | Fantasy": "Norah Aven 1 | Fantasy",
    "Norah Aven 2 | Fantasy": "Norah Aven 2 | Fantasy",
    "Norah Aven 3 | Fantasy": "Norah Aven 3 | Fantasy",
    "Norah Aven Complete Sets | Fantasy": "Norah Aven Seturi Complete | Fantasy",
    "Norah Aven 2": "Norah Aven 2",
    "Norah Aven 3": "Norah Aven 3",
    "Norah Aven Full Sets": "Norah Aven Seturi Complete",
    "Floral Tins": "Cutii florale metalice",
    "Floral Prints": "Ilustrații florale",
    "Floral Collection Tins": "Colecția de cutii florale metalice",

    # Trust badges
    "Protected Shipping": "Livrare protejată",
    "30 Day Money": "Garanție de returnare",
    "Back Guarantee": "în 30 de zile",
    "3 Million+ Letters": "Peste 3 milioane de scrisori",
    "Mailed": "Expediate",
    "Risk-Free,": "Fără risc,",
    "Cancel Anytime": "Anulează oricând",

    # Reviews section
    "See all reviews": "Vezi toate recenziile",
    "Verified Customer": "Client verificat",

    # Footer & policies
    "Privacy Policy": "Politica de confidențialitate",
    "Refund Policy": "Politica de returnare",
    "Shipping Policy": "Politica de expediere",
    "Terms and Conditions": "Termeni și condiții",
    "Disclaimer": "Declinarea responsabilității",
    "Terms of Service": "Termeni și condiții",
    "Refund policy": "Politica de returnare",
    "Privacy policy": "Politica de confidențialitate",
    "Terms of service": "Termeni și condiții",
    "Shipping policy": "Politica de expediere",

    # Common buttons and CTAs
    "Add to Cart": "Adaugă în coș",
    "Add to cart": "Adaugă în coș",
    "ADD TO CART": "ADAUGĂ ÎN COȘ",
    "Buy Now": "Cumpără acum",
    "Buy now": "Cumpără acum",
    "BUY NOW": "CUMPĂRĂ ACUM",
    "Subscribe": "Abonează-te",
    "SUBSCRIBE": "ABONEAZĂ-TE",
    "Subscribe & Save": "Abonează-te și economisește",
    "Learn More": "Află mai mult",
    "Learn more": "Află mai mult",
    "LEARN MORE": "AFLĂ MAI MULT",
    "Read More": "Citește mai mult",
    "Read more": "Citește mai mult",
    "Shop Now": "Cumpără acum",
    "Shop now": "Cumpără acum",
    "SHOP NOW": "CUMPĂRĂ ACUM",
    "View All": "Vezi tot",
    "View all": "Vezi tot",
    "VIEW ALL": "VEZI TOT",
    "Continue Shopping": "Continuă cumpărăturile",
    "Continue shopping": "Continuă cumpărăturile",
    "Get Started": "Începe acum",
    "Get started": "Începe acum",
    "Order Now": "Comandă acum",
    "Order now": "Comandă acum",
    "Select options": "Selectează opțiunile",
    "Choose options": "Alege opțiunile",

    # Product page elements
    "Description": "Descriere",
    "Quantity": "Cantitate",
    "Price": "Preț",
    "Regular price": "Preț normal",
    "Sale price": "Preț redus",
    "Sale": "Reducere",
    "SALE": "REDUCERE",
    "Sold out": "Epuizat",
    "SOLD OUT": "EPUIZAT",
    "In stock": "În stoc",
    "Out of stock": "Stoc epuizat",
    "Free shipping": "Livrare gratuită",
    "Free Shipping": "Livrare gratuită",
    "FREE SHIPPING": "LIVRARE GRATUITĂ",

    # Common phrases on the site
    "Stories Told Through Letters": "Povești spuse prin scrisori",
    "Stories Told Through Letters | The Flower Letters": "Povești spuse prin scrisori | Scrisorile cu Flori",
    "The Flower Letters": "Scrisorile cu Flori",
    "the flower letters": "scrisorile cu flori",

    # Subscription/delivery related
    "Monthly": "Lunar",
    "monthly": "lunar",
    "Annual": "Anual",
    "annual": "anual",
    "Prepaid": "Preplătit",
    "prepaid": "preplătit",
    "Delivered twice a month": "Livrat de două ori pe lună",
    "delivered twice a month": "livrat de două ori pe lună",
    "per month": "pe lună",
    "per year": "pe an",
    "/month": "/lună",
    "/year": "/an",

    # FAQ page
    "FAQ": "Întrebări frecvente",
    "Frequently Asked Questions": "Întrebări frecvente",

    # How it works
    "How It Works": "Cum funcționează",
    "Step 1": "Pasul 1",
    "Step 2": "Pasul 2",
    "Step 3": "Pasul 3",
    "Choose your story": "Alege-ți povestea",
    "Choose Your Story": "Alege-ți povestea",
    "We mail your letters": "Noi expediem scrisorile",
    "Enjoy the magic": "Bucură-te de magie",
    "Pick a story": "Alege o poveste",

    # Gift related
    "Gift": "Cadou",
    "gift": "cadou",
    "The perfect gift": "Cadoul perfect",
    "The Perfect Gift": "Cadoul Perfect",
    "Give the gift of story": "Dăruiește cadoul unei povești",
    "Gift Story Letters": "Scrisori cu povești cadou",

    # About/Mission
    "About": "Despre",
    "About Us": "Despre noi",
    "Our Story": "Povestea noastră",
    "Meet the Author": "Cunoaște autorul",

    # Email signup
    "Email": "Email",
    "Enter your email": "Introdu adresa de email",
    "Sign up": "Înscrie-te",
    "Sign Up": "Înscrie-te",
    "SIGN UP": "ÎNSCRIE-TE",
    "Join our mailing list": "Alătură-te listei noastre de email",
    "Newsletter": "Buletin informativ",

    # Checkout
    "Checkout": "Finalizare comandă",
    "checkout": "finalizare comandă",
    "Subtotal": "Subtotal",
    "Total": "Total",
    "Tax": "Taxe",
    "Shipping": "Livrare",
    "Your cart is empty": "Coșul tău este gol",
    "Your Cart": "Coșul tău",

    # General
    "Home": "Acasă",
    "Back": "Înapoi",
    "Close": "Închide",
    "Open": "Deschide",
    "Menu": "Meniu",
    "Share": "Distribuie",
    "Save": "Salvează",
    "Loading": "Se încarcă",
    "Loading...": "Se încarcă...",
    "Copyright": "Drepturi de autor",
    "All rights reserved": "Toate drepturile rezervate",
    "All Rights Reserved": "Toate drepturile rezervate",
    "Powered by Shopify": "Realizat cu Shopify",

    # Reviews page
    "Customer Reviews": "Recenzii clienți",
    "Write a Review": "Scrie o recenzie",
    "Write a review": "Scrie o recenzie",
    "stars": "stele",
    "star": "stea",
    "Based on": "Bazat pe",
    "reviews": "recenzii",
    "review": "recenzie",

    # Contact page
    "Name": "Nume",
    "Message": "Mesaj",
    "Send": "Trimite",
    "Phone": "Telefon",
    "Address": "Adresă",

    # Collection/category pages
    "Collections": "Colecții",
    "Products": "Produse",
    "All Products": "Toate produsele",
    "All products": "Toate produsele",
    "Sort by": "Sortează după",
    "Best selling": "Cele mai vândute",
    "Alphabetically, A-Z": "Alfabetic, A-Z",
    "Alphabetically, Z-A": "Alfabetic, Z-A",
    "Price, low to high": "Preț, crescător",
    "Price, high to low": "Preț, descrescător",
    "Date, old to new": "Dată, vechi la nou",
    "Date, new to old": "Dată, nou la vechi",
    "Filter": "Filtrează",
    "Filters": "Filtre",

    # Misc common words/phrases
    "and": "și",
    "or": "sau",
    "the": "",  # skip, context-dependent
    "with": "cu",
    "from": "de la",
    "for": "pentru",
    "your": "al tău",
    "our": "al nostru",
    "new": "nou",
    "NEW": "NOU",
    "here": "aici",
    "now": "acum",
    "today": "astăzi",
    "see": "vezi",
    "view": "vezi",
    "next": "următorul",
    "previous": "anteriorul",
    "Next": "Următorul",
    "Previous": "Anteriorul",
    "Yes": "Da",
    "No": "Nu",
    "Thank you": "Mulțumim",
    "Thank You": "Mulțumim",
    "thank you": "mulțumim",
    "Welcome": "Bine ai venit",
    "welcome": "bine ai venit",
}

# Longer phrase translations (applied first for better matching)
LONG_TRANSLATIONS = {
    "Each letter leaves me wanting more. I have always loved getting letters. Email is just not the same as an envelope addressed to you in your mailbox every two weeks. I am so glad I decided to do this for myself.":
        "Fiecare scrisoare mă face să vreau mai mult. Întotdeauna mi-a plăcut să primesc scrisori. Email-ul nu se compară cu un plic adresat ție, în cutia ta poștală, la fiecare două săptămâni. Sunt atât de bucuroasă că am decis să fac asta pentru mine.",

    "We purchased the Flower Letters for our mom's birthday... To say this was the PERFECT gift would be an understatement! She calls every 2 weeks with such joy and excitement...":
        "Am cumpărat Scrisorile cu Flori pentru ziua mamei noastre... Să spunem că a fost cadoul PERFECT ar fi puțin spus! Ne sună la fiecare 2 săptămâni cu atâta bucurie și entuziasm...",

    "I love, love, love, the Audrey Rose letters. I listen to music from the era and read my letters.":
        "Ador, ador, ador scrisorile Audrey Rose. Ascult muzică din acea epocă și îmi citesc scrisorile.",

    "It's like being transformed to that time and place. A wonderful journey for sure.":
        "E ca și cum ai fi transportat în acel timp și loc. O călătorie minunată, cu siguranță.",

    "I bought the Audrey Rose story for my mother for Mother's Day ... She said her favorite part is me reading them to her.  These letters have made both of us slow down, in a busy crazy world, and spend time together reading the wonderful story ... Thank you so much for giving my mom and myself that joy of spending time together!":
        "Am cumpărat povestea Audrey Rose pentru mama mea de Ziua Mamei... A spus că partea ei preferată este când i le citesc eu. Aceste scrisori ne-au făcut pe amândouă să încetinim, într-o lume agitată și nebună, și să petrecem timp împreună citind povestea minunată... Vă mulțumim foarte mult că ne-ați oferit mamei mele și mie bucuria de a petrece timp împreună!",

    "Oh my goodness…these letters make me feel the experience of living out WW2... I get so excited when my letters arrive, and make a cup of coffee and enjoy time traveling with Audrey Rose & Charlie. Love story set in 1944 with facts & fiction. Keep 'em coming!":
        "O, Doamne... aceste scrisori mă fac să simt experiența de a trăi în timpul celui de-al Doilea Război Mondial... Mă entuziasmez atât de tare când îmi sosesc scrisorile, îmi fac o cafea și mă bucur călătorind în timp cu Audrey Rose și Charlie. O poveste de dragoste plasată în 1944, cu fapte reale și ficțiune. Să tot vină!",

    "I purchased these for my 90 year old mother. The joy that this has brought her is unbelievable.":
        "Le-am cumpărat pentru mama mea de 90 de ani. Bucuria pe care i-a adus-o este de necrezut.",

    "Thank you for doing this":
        "Vă mulțumim că faceți asta",

    "Discover the magic of stories told through letters. Delivered twice a month, all year long.":
        "Descoperă magia poveștilor spuse prin scrisori. Livrate de două ori pe lună, tot anul.",

    "Hand-illustrated story letters delivered straight to her mailbox, twice a month. The gift moms actually remember.":
        "Scrisori cu povești ilustrate manual, livrate direct în cutia poștală, de două ori pe lună. Cadoul pe care mamele chiar și-l amintesc.",

    "Joy delivered one letter at a time":
        "Bucurie livrată câte o scrisoare pe rând",

    "Revive the magic of mail with 24 beautifully illustrated letters. One unfolding story. A gift that keeps arriving — and keeps meaning something.":
        "Readă magia scrisorilor cu 24 de scrisori frumos ilustrate. O poveste care se dezvăluie treptat. Un cadou care continuă să sosească — și continuă să însemne ceva.",

    "Something beautiful is coming in the mail":
        "Ceva frumos vine prin poștă",

    "Protected Shipping": "Livrare protejată",
    "30 Day Money Back Guarantee": "Garanție de returnare a banilor în 30 de zile",
    "3 Million+ Letters Mailed": "Peste 3 milioane de scrisori expediate",
    "Risk-Free, Cancel Anytime": "Fără risc, anulează oricând",
}

# Title translations
TITLE_TRANSLATIONS = {
    "Stories Told Through Letters | The Flower Letters": "Povești spuse prin scrisori | Scrisorile cu Flori",
    "The Flower Letters": "Scrisorile cu Flori",
    "Get Started": "Începe acum",
    "FAQ": "Întrebări frecvente",
    "Reviews": "Recenzii",
    "Contact Us": "Contactează-ne",
    "How It Works": "Cum funcționează",
    "Privacy Policy": "Politica de confidențialitate",
    "Refund Policy": "Politica de returnare",
    "Shipping Policy": "Politica de expediere",
    "Terms and Conditions": "Termeni și condiții",
}

# Alt text translations
ALT_TRANSLATIONS = {
    "The Flower Letters": "Scrisorile cu Flori",
    "flower letters": "scrisori cu flori",
}


def translate_text(text):
    """Translate a text string from English to Romanian."""
    stripped = text.strip()
    if not stripped:
        return text

    # Check long translations first (exact match on stripped)
    for en, ro in LONG_TRANSLATIONS.items():
        if en in stripped:
            stripped = stripped.replace(en, ro)
            return stripped

    # Check exact match in translations dict
    if stripped in TRANSLATIONS:
        result = TRANSLATIONS[stripped]
        if result:  # skip empty translations (like "the")
            return result

    return text


def translate_html_file(filepath):
    """Translate all visible text in an HTML file."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        print(f"  Error reading {filepath}: {e}")
        return False

    if not content.strip():
        return False

    try:
        soup = BeautifulSoup(content, 'html.parser')
    except Exception as e:
        print(f"  Error parsing {filepath}: {e}")
        return False

    modified = False

    # Translate <title> tag
    title_tag = soup.find('title')
    if title_tag and title_tag.string:
        original = title_tag.string.strip()
        for en, ro in TITLE_TRANSLATIONS.items():
            if en in original:
                title_tag.string = original.replace(en, ro)
                modified = True
                break

    # Translate lang attribute
    html_tag = soup.find('html')
    if html_tag and html_tag.get('lang', '').startswith('en'):
        html_tag['lang'] = 'ro'
        modified = True

    # Translate meta description and og tags
    for meta in soup.find_all('meta'):
        for attr in ['content']:
            val = meta.get(attr, '')
            if val and len(val) > 5:
                new_val = val
                for en, ro in LONG_TRANSLATIONS.items():
                    if en in new_val:
                        new_val = new_val.replace(en, ro)
                for en, ro in TRANSLATIONS.items():
                    if en == new_val.strip():
                        new_val = ro
                        break
                if new_val != val and new_val:
                    meta[attr] = new_val
                    modified = True

    # Translate alt attributes on images
    for img in soup.find_all('img'):
        alt = img.get('alt', '')
        if alt:
            for en, ro in ALT_TRANSLATIONS.items():
                if en in alt:
                    img['alt'] = alt.replace(en, ro)
                    modified = True

    # Translate all text nodes (not inside script/style)
    skip_tags = {'script', 'style', 'code', 'pre', 'noscript', 'svg'}

    for element in soup.find_all(string=True):
        if isinstance(element, Comment):
            continue

        # Skip if inside a script/style/etc tag
        parent = element.parent
        if parent and parent.name in skip_tags:
            continue

        # Check all ancestors
        skip = False
        for ancestor in element.parents:
            if ancestor.name in skip_tags:
                skip = True
                break
        if skip:
            continue

        original = str(element)
        if not original.strip() or len(original.strip()) < 2:
            continue

        translated = translate_text(original)
        if translated != original:
            element.replace_with(NavigableString(translated))
            modified = True

    if modified:
        try:
            # Write back with original encoding approach
            output = str(soup)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(output)
            return True
        except Exception as e:
            print(f"  Error writing {filepath}: {e}")
            return False

    return False


def main():
    base_dir = '/var/develop/scrisoricupovesti/theflowerletters.com'
    html_files = glob.glob(os.path.join(base_dir, '**', '*.html'), recursive=True)

    print(f"Found {len(html_files)} HTML files to translate")

    translated_count = 0
    for filepath in sorted(html_files):
        rel_path = os.path.relpath(filepath, base_dir)
        result = translate_html_file(filepath)
        if result:
            translated_count += 1
            print(f"  ✓ {rel_path}")
        else:
            print(f"  - {rel_path} (no changes)")

    print(f"\nDone! Translated {translated_count}/{len(html_files)} files")


if __name__ == '__main__':
    main()
