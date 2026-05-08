#!/usr/bin/env python3
"""Deep translation - processes each HTML file, finds ALL English text nodes and translates them."""

import os
import sys
import re
import glob
from bs4 import BeautifulSoup, NavigableString, Comment

BASE_DIR = sys.argv[1] if len(sys.argv) > 1 else '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

# Common English words that indicate a text is in English
EN_INDICATORS = set('the and for with from that this your our you will are was have has been each can what how when where which their about would could every also were they them than more into been through after before during between under over most other some made'.split())

def is_english(text):
    """Check if text is likely English (not Romanian or proper nouns)."""
    words = re.findall(r'[a-z]+', text.lower())
    if len(words) < 3:
        return False
    en_count = sum(1 for w in words if w in EN_INDICATORS)
    return en_count >= 2

# Massive translation map for sentence-level translations
# These are common sentences/paragraphs found across the site
SENTENCE_MAP = {
    # Product page common text
    "For $12 per month subscribers will receive:": "Pentru $12 pe lună abonații vor primi:",
    "For $13 per month subscribers will receive:": "Pentru $13 pe lună abonații vor primi:",
    "2 letters per months for 12 months": "2 scrisori pe lună timp de 12 luni",
    "1 postcard is included in every other letter": "1 carte poștală este inclusă la fiecare a doua scrisoare",
    "And a few surprises along the way!": "Și câteva surprize pe parcurs!",
    "Our Debut collection takes place during WWII": "Colecția noastră de debut se desfășoară în timpul celui de-al Doilea Război Mondial",
    "is centered on one of the most significant days in history": "și se concentrează pe una dintre cele mai importante zile din istorie",
    "Each letter is professionally designed, illustrated, and packaged with care.": "Fiecare scrisoare este proiectată profesional, ilustrată și ambalată cu grijă.",
    "Is this a gift?": "Acesta este un cadou?",
    "Download our gift card printout and give it to the recipient on the special occasion.": "Descarcă cardul nostru cadou printabil și oferă-l destinatarului cu ocazia specială.",
    "Now mailing internationally!": "Acum expediem internațional!",
    "Subscriber will be charged": "Abonatul va fi taxat",
    "each month, for 12 months": "în fiecare lună, timp de 12 luni",
    "Cancel your subscription at any time.": "Anulează abonamentul oricând.",
    "Click here to s": "Click aici pentru a",
    "ave even more with our annual subscription": "economisi și mai mult cu abonamentul anual",

    # Get Started page
    "Stories Told Through 24 Letters Sent Twice a Month for 12 Months.": "Povești spuse prin 24 de scrisori trimise de două ori pe lună, timp de 12 luni.",
    "The Perfect Gift For Mom!": "Cadoul perfect pentru mama!",
    "More Than Just Letters": "Mai mult decât simple scrisori",
    "Every envelope is filled with surprises": "Fiecare plic e plin cu surprize",
    "telegrams, newspaper clippings, maps, and more to help enrich the story.": "telegrame, decupaje din ziare, hărți și multe altele pentru a îmbogăți povestea.",
    "How do I give this as a gift?": "Cum ofer asta cadou?",
    "Simply enter your recipient's name and shipping address at checkout": "Pur și simplu introdu numele și adresa destinatarului la finalizare",
    "the letters will be mailed directly to them.": "scrisorile vor fi trimise direct către ei.",
    "What will I receive?": "Ce voi primi?",
    "When will my letters arrive?": "Când vor ajunge scrisorile mele?",
    "When will the first letter arrive?": "Când va ajunge prima scrisoare?",
    "Your first letter ships via USPS Ground Advantage": "Prima ta scrisoare se expediază prin USPS Ground Advantage",
    "and typically arrives within 2–5 business days.": "și ajunge de obicei în 2-5 zile lucrătoare.",
    "Choose Your Plan": "Alege planul tău",
    "Select how you'd like to pay for the 12-month story experience.": "Selectează cum dorești să plătești pentru experiența de 12 luni.",
    "Have a discount code? You can apply it at checkout.": "Ai un cod de reducere? Îl poți aplica la finalizare.",
    "Preview Your Envelope": "Previzualizează plicul tău",
    "Enter your recipient's details and preview their personalized envelope.": "Introdu detaliile destinatarului și previzualizează plicul personalizat.",
    "We will ship on the day you select.": "Vom expedia în ziua pe care o selectezi.",
    "Your personalized envelope": "Plicul tău personalizat",
    "Download your free gift card": "Descarcă cardul cadou gratuit",
    "Already ordered? Download your gift card:": "Ai comandat deja? Descarcă cardul cadou:",
    "Expertly crafted and written story experiences": "Experiențe de poveste scrise și create cu măiestrie",
    "Can I change the shipping address after ordering?": "Pot schimba adresa de livrare după comandă?",
    "and we'll update it before the next mailing.": "și o vom actualiza înainte de următoarea expediere.",
    "Letters are mailed twice each month.": "Scrisorile sunt expediate de două ori pe lună.",
    "Your first letter ships with USPS tracking.": "Prima scrisoare se expediază cu urmărire USPS.",
    "All remaining letters are mailed via regular mail twice each month.": "Restul scrisorilor sunt trimise prin poștă normală de două ori pe lună.",
    "Giving this as a gift?": "Oferi asta cadou?",
    "Your subscription includes free": "Abonamentul tău include gratuit",
    "historical context and insights for every letter in your story": "context istoric și informații pentru fiecare scrisoare din povestea ta",
    "free with every subscription.": "gratuit cu fiecare abonament.",
    "Not happy after the first two letters? Full refund, no questions asked.": "Nu ești mulțumit după primele două scrisori? Rambursare completă, fără întrebări.",
    "real history behind every letter": "istorie reală în spatele fiecărei scrisori",
    "perfect for presenting as a gift": "perfect pentru a fi oferit cadou",
    "This is a physical product that will be shipped to you": "Acesta este un produs fizic care va fi expediat către tine",
    "30-Day Money-Back Guarantee": "Garanție de returnare a banilor în 30 de zile",
    "If you're not happy after the first two letters": "Dacă nu ești mulțumit după primele două scrisori",
    "let us know and we'll issue a full refund.": "anunță-ne și vom emite o rambursare completă.",
    "Your Selections": "Selecțiile tale",
    "Use left/right arrows to navigate the slideshow or swipe left/right if using a mobile device": "Folosește săgețile stânga/dreapta pentru a naviga sau glisează pe dispozitivul mobil",
    "Choose Your Plan →": "Alege planul tău →",

    # How It Works page
    "a thoughtful gift made simple": "un cadou atent, simplificat",
    "Twenty-four beautifully illustrated letters": "Douăzeci și patru de scrisori frumos ilustrate",
    "delivered over twelve months": "livrate pe parcursul a douăsprezece luni",
    "a gift that keeps on giving.": "un cadou care continuă să ofere.",
    "Choose a story that speaks to you or your recipient.": "Alege o poveste care ți se adresează ție sau destinatarului tău.",
    "We mail 2 letters per month for 12 months.": "Expediem 2 scrisori pe lună timp de 12 luni.",
    "Sit back, relax, and enjoy the magic of mail.": "Relaxează-te și bucură-te de magia scrisorilor.",
    "What our customers are saying": "Ce spun clienții noștri",
    "as seen in": "după cum s-a văzut în",

    # Gift pages
    "The perfect last minute gift": "Cadoul perfect de ultimă clipă",
    "Order Today...Give Today!": "Comandă azi...Dăruiește azi!",
    "Place your order": "Plasează comanda",
    "If you're giving The Flower Letters as a gift": "Dacă oferi Scrisorile cu Flori cadou",
    "we have created a card printout you can give to the recipient": "am creat un card printabil pe care îl poți oferi destinatarului",
    "on the special occasion": "cu ocazia specială",
    "Full Color Foldable Download": "Descărcare pliabilă color",
    "Full Color Email Attachment": "Atașament email color",
    "Enter your own billing information.": "Introdu datele tale de facturare.",
    "All billing details will be sent to the email you provide.": "Toate detaliile vor fi trimise la email-ul furnizat.",
    "Complete Your Order": "Finalizează comanda",
    "Gift Introduction": "Introducere cadou",

    # Mission page
    "Joy | Relief | Connection | Enrichment": "Bucurie | Alinare | Conexiune | Îmbogățire",
    "Bring Joy": "Aducem bucurie",
    "Offer Relief": "Oferim alinare",
    "Foster Connection": "Cultivăm conexiunea",
    "Provide Enrichment": "Oferim îmbogățire",
    "In 2020, we started The Flower Letters": "În 2020, am început Scrisorile cu Flori",
    "with the hope a few people would see what we're doing": "cu speranța că câțiva oameni vor vedea ce facem",

    # Common testimonials
    "I have so enjoyed these letters!": "Mi-au plăcut enorm aceste scrisori!",
    "I feel as though I've stepped back in time when I read them!": "Simt că am călătorit înapoi în timp când le citesc!",
    "The attention to detail is amazing.": "Atenția la detalii este uimitoare.",
    "Got the Flower Letters for my Mom for Mother's Day.": "Am luat Scrisorile cu Flori pentru mama de Ziua Mamei.",
    "She loved them so much": "I-au plăcut atât de mult",
    "This is a wonderful story.": "Aceasta este o poveste minunată.",
    "It is worth every penny.": "Merită fiecare bănuț.",
    "Everyone is different and so enjoyable.": "Fiecare e diferită și atât de plăcută.",

    # Blog common elements
    "Read more": "Citește mai mult",
    "Read More": "Citește mai mult",
    "Continue reading": "Continuă lectura",
    "Share this article": "Distribuie acest articol",
    "Related articles": "Articole similare",
    "Back to": "Înapoi la",
    "Older Post": "Articol mai vechi",
    "Newer Post": "Articol mai nou",
    "Leave a comment": "Lasă un comentariu",
    "Tags": "Etichete",
    "Posted by": "Postat de",
    "Learn the Words, People, and Expressions:": "Descoperă cuvintele, persoanele și expresiile:",
    "Other Words, People and Phrases:": "Alte cuvinte, persoane și expresii:",

    # Printables
    "Digital Download": "Descărcare digitală",
    "Digital File Types: PDF": "Tip fișier digital: PDF",
    "Includes original artwork by Hannie Clark": "Include lucrări originale de artă de Hannie Clark",
    "An email will be sent to the address provided at checkout with a link to download your files.": "Un email va fi trimis la adresa furnizată la finalizare cu un link pentru descărcarea fișierelor.",
    "Please allow 10 minutes for your email to arrive.": "Vă rugăm să așteptați 10 minute pentru sosirea email-ului.",
    "Check your junk and spam folders in case the email is filtered.": "Verificați folderele de junk și spam.",
    "Instant download items are non-refundable.": "Articolele cu descărcare instantanee nu sunt rambursabile.",
    "Please do not hesitate to contact us with any questions or concerns.": "Nu ezitați să ne contactați cu orice întrebări.",
    "Colors may vary depending on printer, paper and ink.": "Culorile pot varia în funcție de imprimantă, hârtie și cerneală.",
    "Intended for personal use only.": "Destinat exclusiv utilizării personale.",
    "Do not share, distribute, or sell the designs.": "Nu partajați, distribuiți sau vindeți design-urile.",
    "For enhanced licensing please contact us.": "Pentru licențe extinse, contactați-ne.",
    "First letter mails in 1-3 business days!": "Prima scrisoare se expediază în 1-3 zile lucrătoare!",
    "Use the graphics for unlimited personal projects": "Folosește grafica pentru proiecte personale nelimitate",

    # Shipping/Policy
    "Shipping Rates and Free Shipping": "Tarife de expediere și livrare gratuită",
    "Shipping charges will apply to all orders.": "Taxele de expediere se aplică la toate comenzile.",
    "Before the final checkout, you will be presented with your shipping rate.": "Înainte de finalizarea comenzii, vi se va prezenta tariful de expediere.",
    "When are letters mailed?": "Când se expediază scrisorile?",
    "The first letter will be mailed within 1 - 3 business days.": "Prima scrisoare va fi expediată în 1-3 zile lucrătoare.",
    "International Shipping": "Expediere internațională",
    "All letters are mailed using the US Postal Service": "Toate scrisorile sunt expediate prin Serviciul Poștal American",
    "Resending Letters": "Retrimiterea scrisorilor",
    "When are other products mailed?": "Când se expediază alte produse?",
    "Exchanging for a Different Story": "Schimbarea cu o altă poveste",

    # Cart
    "Your cart is empty": "Coșul tău este gol",
    "Continue shopping": "Continuă cumpărăturile",

    # Misc
    "Start The Experience": "Începe experiența",
    "See mailing dates here": "Vezi datele de expediere aici",
    "Click here to sign up.": "Click aici pentru a te înscrie.",
    "Welcome": "Bine ai venit",
    "Newsletter Signup": "Abonare Newsletter",
    "Sign up for exclusive offers, original stories, events and more.": "Înscrie-te pentru oferte exclusive, povești originale, evenimente și multe altele.",
    "Meet the Creators": "Cunoaște creatorii",
    "Welcome — we're so glad you're here!": "Bine ai venit — ne bucurăm că ești aici!",
}

# Word-level replacements for remaining English (applied carefully)
WORD_MAP = {
    "The Flower Letters": "Scrisorile cu Flori",
    "the Flower Letters": "Scrisorile cu Flori",
    "Flower Letters": "Scrisorile cu Flori",
    "Click here": "Click aici",
    "click here": "click aici",
    "Learn more": "Află mai mult",
    "Learn More": "Află mai mult",
    "Read more": "Citește mai mult",
    "Read More": "Citește mai mult",
    "Shop Now": "Cumpără acum",
    "Shop now": "Cumpără acum",
    "Add to Cart": "Adaugă în coș",
    "Add to cart": "Adaugă în coș",
    "Subscribe": "Abonează-te",
    "Sign Up": "Înscrie-te",
    "Sign up": "Înscrie-te",
    "Contact Us": "Contactează-ne",
    "Contact us": "Contactează-ne",
    "Free Shipping": "Livrare gratuită",
    "free shipping": "livrare gratuită",
    "business days": "zile lucrătoare",
    "per month": "pe lună",
    "per year": "pe an",
}


def translate_text_node(text):
    """Translate a text node from English to Romanian."""
    stripped = text.strip()
    if not stripped or len(stripped) < 3:
        return text

    # Try exact sentence match first
    if stripped in SENTENCE_MAP:
        return text.replace(stripped, SENTENCE_MAP[stripped])

    # Try partial sentence matches (longer first)
    result = text
    for en, ro in sorted(SENTENCE_MAP.items(), key=lambda x: -len(x[0])):
        if len(en) > 10 and en in result:
            result = result.replace(en, ro)

    # Try word-level replacements
    for en, ro in sorted(WORD_MAP.items(), key=lambda x: -len(x[0])):
        if en in result:
            result = result.replace(en, ro)

    return result


def process_file(filepath):
    """Process a single HTML file and translate all English text."""
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

    for element in soup.find_all(string=True):
        if isinstance(element, Comment):
            continue

        skip = False
        for ancestor in element.parents:
            if ancestor.name in skip_tags:
                skip = True
                break
        if skip:
            continue

        original = str(element)
        if not original.strip() or len(original.strip()) < 3:
            continue

        translated = translate_text_node(original)
        if translated != original:
            element.replace_with(NavigableString(translated))
            modified = True

    # Also translate title
    title = soup.find('title')
    if title and title.string:
        new_title = translate_text_node(title.string)
        if new_title != title.string:
            title.string = new_title
            modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(str(soup))
        return True
    return False


def main():
    html_files = glob.glob(os.path.join(BASE_DIR, '**', '*.html'), recursive=True)
    html_files = [f for f in html_files if 'en-ca' not in f]

    print(f"Procesez {len(html_files)} fișiere...")

    translated = 0
    for filepath in sorted(html_files):
        rel = os.path.relpath(filepath, BASE_DIR)
        result = process_file(filepath)
        if result:
            translated += 1
            print(f"  ✓ {rel}")

    print(f"\nTraduse: {translated}/{len(html_files)} fișiere")


if __name__ == '__main__':
    main()
