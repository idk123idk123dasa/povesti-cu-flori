#!/usr/bin/env python3
"""Full translation of all HTML files - text only, no HTML/CSS/JS changes."""

import os
import re
import glob
from bs4 import BeautifulSoup, NavigableString, Comment

import sys
BASE_DIR = sys.argv[1] if len(sys.argv) > 1 else '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com'

# === MASSIVE EN->RO TRANSLATION DICTIONARY ===
# Ordered: longer phrases first for priority matching

TRANSLATIONS = {
    # === SITE TITLE ===
    "Stories Told Through Letters | The Flower Letters": "Povești spuse prin scrisori | Scrisorile cu Flori",
    "The Flower Letters": "Scrisorile cu Flori",
    "the flower letterS": "scrisorile cu flori",
    "THE FLOWER LETTERS": "SCRISORILE CU FLORI",

    # === NAV & HEADER ===
    "Skip to content": "Sari la conținut",
    "Close search": "Închide căutarea",
    "CHOOSE YOUR STORY": "ALEGE-ȚI POVESTEA",
    "NEW! Camellia Grace | Gilded Age": "NOU! Camellia Grace | Epoca de Aur",
    "Adelaide Magnolia | Regency": "Adelaide Magnolia | Regență",
    "Audrey Rose | WW2": "Audrey Rose | Al Doilea Război Mondial",
    "Orchid Mae | Archaeology": "Orchid Mae | Arheologie",
    "Lily Clara | Western": "Lily Clara | Western",
    "Norah Aven 1 | Fantasy": "Norah Aven 1 | Fantasy",
    "Norah Aven 2 | Fantasy": "Norah Aven 2 | Fantasy",
    "Norah Aven 3 | Fantasy": "Norah Aven 3 | Fantasy",
    "Norah Aven Complete Sets | Fantasy": "Norah Aven Seturi Complete | Fantasy",
    "Norah Aven Full Sets": "Norah Aven Seturi Complete",
    "Norah Aven Chronicles": "Cronicile Norah Aven",
    "About The Author": "Despre Autor",
    "Printables NEW!": "Materiale printabile NOU!",
    "Printable Gift Introduction": "Cadou printabil - Introducere",
    "Mailing Information": "Informații expediere",
    "Frequently Asked Questions": "Întrebări frecvente",
    "Wallpaper Downloads": "Descarcă imagini de fundal",
    "How it Works": "Cum funcționează",
    "How it works": "Cum funcționează",
    "Gift Printouts": "Cadouri printabile",
    "Floral Tins": "Cutii florale metalice",
    "Floral Prints": "Ilustrații florale",
    "Payment methods": "Metode de plată",
    "GET STARTED": "ÎNCEPE ACUM",
    "Search": "Căutare",
    "Log in": "Autentificare",
    "Login": "Autentificare",
    "Cart": "Coș",
    "items": "produse",
    "Shop": "Magazin",
    "Stories": "Povești",
    "Tins": "Cutii metalice",
    "Gifting": "Cadouri",
    "Learn": "Descoperă",
    "More": "Mai mult",
    "Reviews": "Recenzii",
    "Mission": "Misiune",
    "Podcast": "Podcast",
    "Submit": "Trimite",
    "Mailings": "Expediții",

    # === FOOTER ===
    "story collections": "colecții de povești",
    "Adelaide Magnolia Collection": "Colecția Adelaide Magnolia",
    "Audrey Rose Collection": "Colecția Audrey Rose",
    "Lily Clara Collection": "Colecția Lily Clara",
    "learn more": "află mai mult",
    "Mailing Dates": "Date de expediere",
    "Contact Us": "Contactează-ne",
    "Our Mission": "Misiunea noastră",
    "Returns & Refunds": "Returnări și rambursări",
    "Privacy Policy": "Politica de confidențialitate",
    "Terms of Service": "Termeni și condiții",
    "Shipping Policy": "Politica de expediere",
    "Disclaimer": "Declinare de responsabilitate",
    "newsletter": "newsletter",

    # === TRUST BADGES ===
    "Protected Shipping": "Livrare protejată",
    "30 Day Money": "Garanție de returnare",
    "Back Guarantee": "în 30 de zile",
    "3 Million+ Letters": "Peste 3 milioane de scrisori",
    "Mailed": "Expediate",
    "Risk-Free,": "Fără risc,",
    "Cancel Anytime": "Anulează oricând",
    "Money-Back Guarantee": "Garanție de returnare a banilor",
    "100% Satisfaction 30-Day Guarantee (Letters Only)": "Garanție de satisfacție 100% în 30 de zile (doar scrisori)",

    # === HOMEPAGE ===
    "Something beautiful": "Ceva frumos",
    "is coming in the mail.": "vine prin poștă.",
    "Something beautiful is coming in the mail": "Ceva frumos vine prin poștă",
    "Discover the magic of stories told through letters. Delivered twice a month, all year long.": "Descoperă magia poveștilor spuse prin scrisori. Livrate de două ori pe lună, tot anul.",
    "Hand-illustrated story letters delivered straight to her mailbox, twice a month. The gift moms actually remember.": "Scrisori cu povești ilustrate manual, livrate direct în cutia poștală, de două ori pe lună. Cadoul pe care mamele chiar și-l amintesc.",
    "Find The Perfect Story": "Găsește povestea perfectă",
    "Joy delivered one letter at a time": "Bucurie livrată câte o scrisoare pe rând",
    "Explore Stories": "Explorează poveștile",
    "Explore Our Stories": "Explorează poveștile noastre",
    "Our Stories": "Poveștile noastre",
    "Gilded Age Romance": "Romantic din Epoca de Aur",
    "Archeology Adventure": "Aventură arheologică",
    "WW2 Romance": "Romantic din Al Doilea Război Mondial",
    "Western Adventure": "Aventură western",
    "Regency Romance": "Romantic din epoca Regenței",
    "Fantasy Adventure": "Aventură fantasy",
    "Meet the Creators": "Cunoaște creatorii",
    "Newsletter Signup": "Abonare Newsletter",
    "Sign up for exclusive offers, original stories, events and more.": "Înscrie-te pentru oferte exclusive, povești originale, evenimente și multe altele.",

    # === PRODUCT PAGES ===
    "Regular price": "Preț normal",
    "Sale price": "Preț redus",
    "Unit price": "Preț unitar",
    "Sold out": "Epuizat",
    "Sale": "Reducere",
    "Add to Cart": "Adaugă în coș",
    "Add to cart": "Adaugă în coș",
    "Adding product to your cart": "Se adaugă produsul în coș",
    "Quantity must be 1 or more": "Cantitatea trebuie să fie 1 sau mai mare",
    "calculated at checkout": "calculat la finalizare",
    "Default Title": "Titlu implicit",
    "Error": "Eroare",
    "Share on Facebook": "Distribuie pe Facebook",
    "Tweet on Twitter": "Postează pe Twitter",
    "Pin on Pinterest": "Fixează pe Pinterest",
    "Share": "Distribuie",
    "Tweet": "Tweet",
    "Previous slide": "Slide anterior",
    "Next slide": "Slide următor",
    "Shipping": "Livrare",
    "Select options": "Selectează opțiunile",
    "Digital Download": "Descărcare digitală",
    "Digital File Types: PDF": "Tip fișier digital: PDF",

    # Product descriptions
    "Click here to s": "Click aici pentru a",
    "ave even more with our annual subscription": "economisi și mai mult cu abonamentul anual",
    "subscribers will receive": "abonații vor primi",
    "2 letters per months for 12 months": "2 scrisori pe lună timp de 12 luni",
    "1 postcard is included in every other letter": "1 carte poștală este inclusă la fiecare a doua scrisoare",
    "And a few surprises along the way!": "Și câteva surprize pe parcurs!",
    "Subscriber will be charged": "Abonatul va fi taxat",
    "each month, for 12 months": "în fiecare lună, timp de 12 luni",
    "Cancel your subscription at any time": "Anulează abonamentul oricând",
    "Each letter is professionally designed, illustrated, and packaged with care": "Fiecare scrisoare este proiectată profesional, ilustrată și ambalată cu grijă",
    "Is this a gift?": "Acesta este un cadou?",
    "Download our gift card printout and give it to the recipient on the special occasion.": "Descarcă cardul nostru cadou printabil și oferă-l destinatarului cu ocazia specială.",
    "Gift Card Printout": "Card cadou printabil",
    "Now mailing internationally!": "Acum expediem internațional!",
    "Includes postcards, maps, posters stickers, and more!": "Include cărți poștale, hărți, postere, autocolante și multe altele!",
    "Includes original artwork by Hannie Clark": "Include lucrări originale de artă de Hannie Clark",

    # Product features
    "For $12 per month subscribers will receive:": "Pentru $12 pe lună abonații vor primi:",
    "For $13 per month subscribers will receive:": "Pentru $13 pe lună abonații vor primi:",

    # Printables
    "An email will be sent to the address provided at checkout with a link to download your files.": "Un email va fi trimis la adresa furnizată la finalizare cu un link pentru descărcarea fișierelor.",
    "Please allow 10 minutes for your email to arrive. Check your junk and spam folders in case the email is filtered.": "Vă rugăm să așteptați 10 minute pentru sosirea email-ului. Verificați folderele de junk și spam.",
    "Instant download items are non-refundable. Please do not hesitate to contact us with any questions or concerns.": "Articolele cu descărcare instantanee nu sunt rambursabile. Nu ezitați să ne contactați cu orice întrebări.",
    "Colors may vary depending on printer, paper and ink.": "Culorile pot varia în funcție de imprimantă, hârtie și cerneală.",
    "Intended for personal use only.": "Destinat exclusiv utilizării personale.",
    "Do not share, distribute, or sell the designs. For enhanced licensing please contact us.": "Nu partajați, distribuiți sau vindeți design-urile. Pentru licențe extinse, contactați-ne.",
    "First letter mails in 1-3 business days!": "Prima scrisoare se expediază în 1-3 zile lucrătoare!",

    # Sizes
    "Sizes - 8x10 inches": "Dimensiuni - 8x10 inci",
    "16 pages 8.5 x 11 inches": "16 pagini 8.5 x 11 inci",

    # === HOW IT WORKS ===
    "a thoughtful gift made simple": "un cadou atent, simplificat",
    "AS GIFT": "CA CADOU",
    "FOR ME": "PENTRU MINE",
    "Step 1": "Pasul 1",
    "Step 2": "Pasul 2",
    "Step 3": "Pasul 3",
    "Choose a Story": "Alege o poveste",
    "Choose Your Story": "Alege-ți povestea",

    # === GIFT PAGE ===
    "Choose a Story & Gift Today →": "Alege o poveste și dăruiește azi →",
    "Full Color Foldable Download": "Descărcare pliabilă color",
    "Full Color Email Attachment": "Atașament email color",
    "Gift Introduction": "Introducere cadou",
    "Complete Your Order": "Finalizează comanda",
    "Enter your own billing information. All billing details will be sent to the email you provide.": "Introdu datele tale de facturare. Toate detaliile vor fi trimise la email-ul furnizat.",

    # === ABOUT / MISSION ===
    "ABOUT THE AUTHOR": "DESPRE AUTOR",
    "meet hannie clark": "cunoaște-o pe Hannie Clark",
    "Author, Illustrator and Co-Creator of The Flower Letters": "Autoare, ilustratoare și co-creatoare a Scrisorilor cu Flori",
    "Joy | Relief | Connection | Enrichment": "Bucurie | Alinare | Conexiune | Îmbogățire",
    "Bring Joy": "Aducem bucurie",
    "Offer Relief": "Oferim alinare",
    "Foster Connection": "Cultivăm conexiunea",
    "Provide Enrichment": "Oferim îmbogățire",

    # === REVIEWS ===
    "What Real Customers Are Saying About The Flower Letters": "Ce spun clienții reali despre Scrisorile cu Flori",
    "Verified Customer": "Client verificat",
    "See all reviews": "Vezi toate recenziile",
    "Write a Review": "Scrie o recenzie",
    "Customer Reviews": "Recenzii clienți",
    "Based on": "Bazat pe",
    "verified reviews": "recenzii verificate",
    "out of 5": "din 5",

    # === LEARN MORE ===
    "Learn The History": "Descoperă istoria",
    "Browse Articles By STORY": "Răsfoiește articolele după POVESTE",
    "Extended Learning": "Învățare extinsă",

    # === PODCAST ===
    "ALL EPISODES": "TOATE EPISOADELE",
    "WATCH ON YOUTUBE": "VIZIONEAZĂ PE YOUTUBE",
    "Listen Now": "Ascultă acum",

    # === FAQ ===
    "GENERAL QUESTIONS": "ÎNTREBĂRI GENERALE",
    "SUBSCRIPTION QUESTIONS": "ÎNTREBĂRI DESPRE ABONAMENT",
    "SHIPPING QUESTIONS": "ÎNTREBĂRI DESPRE EXPEDIERE",
    "GIFT QUESTIONS": "ÎNTREBĂRI DESPRE CADOURI",
    "STORY QUESTIONS": "ÎNTREBĂRI DESPRE POVEȘTI",

    # === REFUND / SHIPPING POLICIES ===
    "Monthly Subscriptions": "Abonamente lunare",
    "Prepaid Subscriptions": "Abonamente preplătite",
    "Refunds for Non-Letter Products": "Rambursări pentru produse non-scrisori",
    "Shipping fees are non-refundable. Refunds will be processed upon receipt of the product that is intact and unused.": "Taxele de expediere nu sunt rambursabile. Rambursările vor fi procesate la primirea produsului intact și nefolosit.",
    "Please send returns to:": "Vă rugăm trimiteți returnările la:",
    "ATTN: THE FLOWER LETTERS": "ATTN: SCRISORILE CU FLORI",
    "Items must be unused and returned in the same condition that you received it.": "Articolele trebuie să fie nefolosite și returnate în aceeași stare în care le-ați primit.",
    "For further assistance, please contact support@theflowerletters.com. Response times are typically 1-3 business days.": "Pentru asistență suplimentară, contactați support@theflowerletters.com. Timpii de răspuns sunt de obicei 1-3 zile lucrătoare.",
    "REFUNDS": "RAMBURSĂRI",
    "Guarantee": "Garanție",
    "TERMS OF SERVICE": "TERMENI ȘI CONDIȚII",
    "OVERVIEW": "PREZENTARE GENERALĂ",
    "Personal information we collect": "Informații personale pe care le colectăm",

    # Shipping page
    "mailing dates": "date de expediere",
    "International orders have an estimated delivery time of 2-4 weeks after shipment.": "Comenzile internaționale au un timp estimat de livrare de 2-4 săptămâni după expediere.",

    # Return instructions
    "- An order # or email you ordered with": "- Numărul comenzii sau email-ul cu care ați comandat",
    "- Story collection or product": "- Colecția de povești sau produsul",

    # === COMMON BUTTONS/UI ===
    "Learn More": "Află mai mult",
    "Learn more": "Află mai mult",
    "Read More": "Citește mai mult",
    "Read more": "Citește mai mult",
    "Shop Now": "Cumpără acum",
    "Shop now": "Cumpără acum",
    "Subscribe": "Abonează-te",
    "Sign Up": "Înscrie-te",
    "Sign up": "Înscrie-te",
    "Get Started": "Începe acum",
    "View All": "Vezi tot",
    "View all": "Vezi tot",
    "Continue Shopping": "Continuă cumpărăturile",
    "Continue shopping": "Continuă cumpărăturile",
    "Order Now": "Comandă acum",
    "Order now": "Comandă acum",
    "Buy Now": "Cumpără acum",
    "Click here to sign up.": "Click aici pentru a te înscrie.",
    "Start The Experience": "Începe experiența",
    "Back to Floral Collection Prints": "Înapoi la ilustrații florale",
    "Back to Floral Collection Tins": "Înapoi la cutii florale metalice",

    # Collection pages
    "Floral Collection Prints": "Colecția de ilustrații florale",
    "Floral Collection Tins": "Colecția de cutii florale metalice",
    "The Adelaide Magnolia Floral Print": "Ilustrația florală Adelaide Magnolia",
    "The Audrey Rose Floral Print": "Ilustrația florală Audrey Rose",
    "The Lily Clara Floral Print": "Ilustrația florală Lily Clara",

    # === GET STARTED / ORDER PAGES ===
    "Use left/right arrows to navigate the slideshow or swipe left/right if using a mobile device": "Folosește săgețile stânga/dreapta pentru a naviga sau glisează pe dispozitivul mobil",
    "Choose Your Plan →": "Alege planul tău →",
    "Choose Your Plan": "Alege planul tău",
    "Already ordered? Download your gift card:": "Ai comandat deja? Descarcă cardul cadou:",
    "Your Selections": "Selecțiile tale",
    "Stories Told Through 24 Letters Sent Twice a Month for 12 Months. The Perfect Gift For Mom!": "Povești spuse prin 24 de scrisori trimise de două ori pe lună, timp de 12 luni. Cadoul perfect pentru mama!",
    "More Than Just Letters": "Mai mult decât simple scrisori",
    "Every envelope is filled with surprises — telegrams, newspaper clippings, maps, and more to help enrich the story.": "Fiecare plic e plin cu surprize — telegrame, decupaje din ziare, hărți și multe altele pentru a îmbogăți povestea.",
    "How do I give this as a gift?": "Cum ofer asta cadou?",
    "What will I receive?": "Ce voi primi?",
    "When will my letters arrive?": "Când vor ajunge scrisorile mele?",
    "When will the first letter arrive?": "Când va ajunge prima scrisoare?",
    "Preview Your Envelope →": "Previzualizează plicul tău →",
    "Enter your recipient's details and preview their personalized envelope.": "Introdu detaliile destinatarului și previzualizează plicul personalizat.",
    "We will ship on the day you select.": "Vom expedia în ziua pe care o selectezi.",
    "Your personalized envelope": "Plicul tău personalizat",
    "Select how you'd like to pay for the 12-month story experience.": "Selectează cum dorești să plătești pentru experiența de 12 luni.",
    "Have a discount code? You can apply it at checkout.": "Ai un cod de reducere? Îl poți aplica la finalizare.",
    "Download your free gift card →": "Descarcă cardul cadou gratuit →",
    "Expertly crafted and written story experiences": "Experiențe de poveste scrise și create cu măiestrie",
    "Can I change the shipping address after ordering?": "Pot schimba adresa de livrare după comandă?",
    "and we'll update it before the next mailing.": "și o vom actualiza înainte de următoarea expediere.",
    "This is a physical product that will be shipped to you": "Acesta este un produs fizic care va fi expediat către tine",
    "— real history behind every letter": "— istorie reală în spatele fiecărei scrisori",
    "— perfect for presenting as a gift": "— perfect pentru a fi oferit cadou",
    "— Not happy after the first two letters? Full refund, no questions asked.": "— Nu ești mulțumit după primele două scrisori? Rambursare completă, fără întrebări.",
    "Learn the Words, People, and Expressions:": "Descoperă cuvintele, persoanele și expresiile:",
    "Back to The Colecția Lily Clara - Învățare extinsă": "Înapoi la Colecția Lily Clara - Învățare extinsă",
    "Back to The Colecția Adelaide Magnolia - Învățare extinsă": "Înapoi la Colecția Adelaide Magnolia - Învățare extinsă",
    "Back to The Colecția Audrey Rose - Învățare extinsă": "Înapoi la Colecția Audrey Rose - Învățare extinsă",
    "Back to The Orchid Mae Collection - Învățare extinsă": "Înapoi la Colecția Orchid Mae - Învățare extinsă",

    # Testimonials on product pages
    "I have so enjoyed these letters!": "Mi-au plăcut enorm aceste scrisori!",
    "Got the Flower Letters for my Mom for Mother's Day. She loved them so much that my husband and I read them too!": "Am luat Scrisorile cu Flori pentru mama de Ziua Mamei. I-au plăcut atât de mult încât soțul meu și cu mine le-am citit și noi!",
    "This is a wonderful story. It is worth every penny. Everyone is different and so enjoyable.": "Aceasta este o poveste minunată. Merită fiecare bănuț. Fiecare e diferită și atât de plăcută.",

    # Shipping/delivery
    "Your first letter ships via USPS Ground Advantage and typically arrives within 2–5 business days.": "Prima ta scrisoare se expediază prin USPS și ajunge de obicei în 2-5 zile lucrătoare.",
    "Letters are mailed twice each month.": "Scrisorile sunt expediate de două ori pe lună.",
    "Your first letter ships with USPS tracking. All remaining letters are mailed via regular mail twice each month.": "Prima scrisoare se expediază cu urmărire USPS. Restul scrisorilor sunt trimise prin poștă normală de două ori pe lună.",
    "Giving this as a gift?": "Oferi asta cadou?",
    "Your subscription includes free": "Abonamentul tău include gratuit",
    "— historical context and insights for every letter in your story, free with every subscription.": "— context istoric și informații pentru fiecare scrisoare din povestea ta, gratuit cu fiecare abonament.",
    "If you do not receive your products within these time frames, please contact support@theflowerletters.com with the follo": "Dacă nu primiți produsele în aceste intervale de timp, contactați support@theflowerletters.com cu următoarele",
    "-Story collection and missing letter number or product": "-Colecția de povești și numărul scrisorii lipsă sau produsul",
    "We offer a 30-day money-back guarantee.": "Oferim garanție de returnare a banilor în 30 de zile.",

    # Common UI remaining
    "Simply enter your recipient's name and shipping address at checkout": "Pur și simplu introdu numele și adresa destinatarului la finalizare",
    "the letters will be mailed directly to them": "scrisorile vor fi trimise direct către ei",
    "to present in person, or email digitally to let them know their story is on the way.": "pentru a le prezenta personal, sau trimite digital prin email pentru a le spune că povestea lor e pe drum.",
    "international orders are sent as a complete set of letters delivered all at once": "comenzile internaționale sunt trimise ca un set complet de scrisori livrate dintr-o dată",
    "The first letter will be addressed": "Prima scrisoare va fi adresată",
    "and the remainder will be personalized to your recipient.": "iar restul vor fi personalizate pentru destinatarul tău.",
    "Welcome": "Bine ai venit",

    # Misc
    "Summary": "Rezumat",
    "Description": "Descriere",
    "Quantity": "Cantitate",
    "Color": "Culoare",
    "Size": "Mărime",
    "Name": "Nume",
    "Email": "Email",
    "Message": "Mesaj",
    "Send": "Trimite",
    "Phone": "Telefon",
    "Close": "Închide",
    "Back": "Înapoi",
    "Next": "Următorul",
    "Previous": "Anteriorul",
    "Loading": "Se încarcă",
    "about": "despre",
    "Copyright": "Drepturi de autor",
    "All rights reserved": "Toate drepturile rezervate",
    "Powered by Shopify": "Realizat cu Shopify",
    "Other Words, People and Phrases:": "Alte cuvinte, persoane și expresii:",
}


def translate_text(text):
    """Translate a text node. Only translates if exact match or contains known phrase."""
    stripped = text.strip()
    if not stripped or len(stripped) < 2:
        return text

    # Exact match
    if stripped in TRANSLATIONS:
        return text.replace(stripped, TRANSLATIONS[stripped])

    # Partial match for longer phrases
    result = text
    for en, ro in sorted(TRANSLATIONS.items(), key=lambda x: -len(x[0])):
        if len(en) > 10 and en in result:
            result = result.replace(en, ro)

    return result


def translate_html_file(filepath):
    """Translate visible text in an HTML file. Does not touch HTML structure, CSS, or JS."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except:
        return False

    if not content.strip():
        return False

    try:
        soup = BeautifulSoup(content, 'html.parser')
    except:
        return False

    modified = False
    skip_tags = {'script', 'style', 'code', 'pre', 'noscript', 'svg'}

    # Translate lang attribute
    html_tag = soup.find('html')
    if html_tag and html_tag.get('lang', '').startswith('en'):
        html_tag['lang'] = 'ro'
        modified = True

    # Translate <title>
    title_tag = soup.find('title')
    if title_tag and title_tag.string:
        orig = title_tag.string
        new = translate_text(orig)
        if new != orig:
            title_tag.string = new
            modified = True

    # Translate meta description
    for meta in soup.find_all('meta', attrs={'name': 'description'}):
        val = meta.get('content', '')
        if val:
            new = translate_text(val)
            if new != val:
                meta['content'] = new
                modified = True

    # Translate og:title, og:description
    for meta in soup.find_all('meta', attrs={'property': True}):
        prop = meta.get('property', '')
        if prop in ('og:title', 'og:description', 'twitter:title', 'twitter:description'):
            val = meta.get('content', '')
            if val:
                new = translate_text(val)
                if new != val:
                    meta['content'] = new
                    modified = True

    # Translate alt attributes
    for img in soup.find_all('img'):
        alt = img.get('alt', '')
        if alt and 'Flower Letters' in alt:
            img['alt'] = alt.replace('The Flower Letters', 'Scrisorile cu Flori').replace('Flower Letters', 'Scrisorile cu Flori')
            modified = True

    # Translate aria-label attributes
    for el in soup.find_all(attrs={'aria-label': True}):
        val = el['aria-label']
        new = translate_text(val)
        if new != val:
            el['aria-label'] = new
            modified = True

    # Translate all visible text nodes
    for element in soup.find_all(string=True):
        if isinstance(element, Comment):
            continue

        # Skip script/style tags
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
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            return True
        except:
            return False

    return False


def main():
    html_files = glob.glob(os.path.join(BASE_DIR, '**', '*.html'), recursive=True)

    # Skip en-ca locale and query-string files
    html_files = [f for f in html_files if 'en-ca' not in f]

    print(f"Găsite {len(html_files)} fișiere HTML de tradus")

    translated = 0
    for filepath in sorted(html_files):
        rel = os.path.relpath(filepath, BASE_DIR)
        result = translate_html_file(filepath)
        if result:
            translated += 1
            print(f"  ✓ {rel}")

    print(f"\nGata! Traduse {translated}/{len(html_files)} fișiere")


if __name__ == '__main__':
    main()
