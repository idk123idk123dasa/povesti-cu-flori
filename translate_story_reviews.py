#!/usr/bin/env python3
"""
Traduce recenziile din storyRecenzii (popup-ul de recenzii pentru povești)
din engleză în română.
"""
import re, glob, os, json, time
from deep_translator import GoogleTranslator

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'
tr = GoogleTranslator(source='en', target='ro')

TRANSLATED = {
    # camellia-grace
    '"I got the letters for my mother. She watches Gilded Age, Bridgerton, Downton Abbey. She loves the letters and looks forward to them. She says she feels so \'fancy high society.\'"':
        '"Am primit scrisorile pentru mama. Se uită la Gilded Age, Bridgerton, Downton Abbey. Adoră scrisorile și le așteaptă cu nerăbdare. Ea spune că se simte atât de elegantă în înalta societate."',
    '"What a glorious presentation! The detail and love and artistry that went into this is breathtaking. So many sweet things and beautiful details to sweep me away to the Newport mansions."':
        '"Ce prezentare glorioasă! Detaliile, dragostea și arta care s-au pus în aceasta sunt uimitoare. Atâtea lucruri dulci și detalii frumoase care mă duc cu gândul la conacele din Newport."',
    '"This was a gift for Mom. It is her 3rd story. She loves the stories and stores each one carefully. It is common for others in her community to read along with her. This gift is truly special."':
        '"Acesta a fost un cadou pentru mama. Este a treia ei poveste. Adoră poveștile și le păstrează cu grijă pe fiecare. Alții din comunitatea ei citesc adesea împreună cu ea. Acest cadou este cu adevărat special."',
    '"It reminds me of days gone by when people used to write letters to one another in cursive. I look forward to my deliveries."':
        '"Îmi amintește de vremurile trecute când oamenii își scriau scrisori în caligrafie. Aștept cu nerăbdare fiecare livrare."',
    '"First letter in, and it\'s so delightful! I love that the pages are discreetly numbered so I\'ll know the correct order later."':
        '"Prima scrisoare și este atât de minunată! Îmi place că paginile sunt numerotate discret, ca să știu ordinea corectă mai târziu."',
    # audrey-rose
    '"I purchased the Audrey Rose letters as a Mother\'s Day gift. She\'s excited to check her mailbox and always gives me an update on what\'s going on."':
        '"Am cumpărat scrisorile Audrey Rose ca dar de Ziua Mamei. Este entuziasmată să verifice cutia poștală și îmi povestește mereu ce se întâmplă."',
    '"She calls me every time she knows they have been mailed and again when she receives the letter. I just love seeing how excited she gets!"':
        '"Mă sună de fiecare dată când știe că au fost trimise și din nou când primește scrisoarea. Îmi place atât de mult să o văd cât de entuziasmată devine!"',
    '"I gifted the Audrey Rose letters to my 93-year-old grandmother for her birthday. She has loved receiving the letters and anxiously looks forward to them."':
        '"Am dăruit scrisorile Audrey Rose bunicii mele de 93 de ani de ziua ei. A adorat să primească scrisorile și le așteaptă cu nerăbdare."',
    '"I got this for my daughter as a birthday gift. She loves it! She finds herself anxiously awaiting each letter. It really warms my heart."':
        '"Am luat asta pentru fiica mea cadou de ziua ei. Adoră! Se trezește că așteaptă cu nerăbdare fiecare scrisoare. Îmi încălzește cu adevărat inima."',
    '"When my mother-in-law received hers, she was overwhelmed with joy. We have all enjoyed getting the letters and anticipate their arrival."':
        '"Când soacra mea le-a primit, a fost copleșită de bucurie. Cu toții ne-am bucurat de scrisori și le așteptăm cu nerăbdare."',
    # adelaide-magnolia
    '"I gave this to my mom as a Mother\'s Day gift, and she loves it so much! She is always excited when she receives an envelope and can\'t wait to see what\'s inside!"':
        '"Am dat-o mamei mele cadou de Ziua Mamei și o adoră atât de mult! Este mereu entuziasmată când primește un plic și nu poate să aștepte să vadă ce este înăuntru!"',
    '"I purchased the Regency England story for my 91-year-old mother. She loves getting the story parts each month. A wonderful gift to look forward to."':
        '"Am cumpărat povestea Regency England pentru mama mea de 91 de ani. Adoră să primească fragmentele de poveste în fiecare lună. Un cadou minunat de așteptat."',
    '"She loves looking forward to checking her mailbox and seeing the beautiful letter there awaiting her quiet time to sit and read."':
        '"Adoră să aștepte să verifice cutia poștală și să vadă frumoasa scrisoare acolo, așteptând momentul ei liniștit de lectură."',
    '"I purchased Scrisorile cu Flori for my mother for Mother\'s Day. She absolutely loves them! I enjoy watching her get excited each time a new letter arrives."':
        '"Am cumpărat Scrisorile cu Flori pentru mama mea de Ziua Mamei. Pur și simplu le adoră! Îmi place să o văd entuziasmată de fiecare dată când sosește o nouă scrisoare."',
    '"The story is wonderful but I really love the floral artwork. I plan to share the letters with the person who gave them to me — it\'s too good not to share!"':
        '"Povestea este minunată, dar îmi place cu adevărat ilustrația florală. Plănuiesc să împart scrisorile cu persoana care mi le-a dat — e prea frumos să nu împarți!"',
    # lily-clara
    '"I JUST LOVE GETTING THESE LETTERS!!! What an amazing concept — getting letters every month for a year! My daughter-in-law gave me this as a Christmas gift. Best gift I have ever gotten!"':
        '"ADOR ACESTE SCRISORI!!! Ce concept uimitor — să primești scrisori în fiecare lună timp de un an! Nora mea mi-a dat asta cadou de Crăciun. Cel mai bun cadou pe care l-am primit vreodată!"',
    '"It is one of the best gifts they could have given me. I have always loved the West and dreamed of marrying a cowboy. I have enjoyed every single letter."':
        '"Este unul dintre cele mai bune cadouri pe care mi le-au putut face. Am iubit mereu Vestul și am visat să mă căsătoresc cu un cowboy. M-am bucurat de fiecare scrisoare în parte."',
    '"She absolutely loves the letters and gets so excited when she gets a new one in the mail. She decorated her own wooden treasure box to keep them in!"':
        '"Adoră absolut scrisorile și se entuziasmează atât de mult când primește una nouă prin poștă. Și-a decorat propria cutie de lemn de comori pentru a le păstra!"',
    '"She calls it the gift that keeps giving. She is excited to check the mail and follow along with the amazing story!"':
        '"O numește cadoul care continuă să dăruiască. Este entuziasmată să verifice poșta și să urmărească povestea uimitoare!"',
    '"I absolutely love it. I look forward to getting the next letter in the mail and find a quiet place to devour it. All the extras inside are such fun and tremendous quality."':
        '"Pur și simplu o adoră. Aștept cu nerăbdare să primesc următoarea scrisoare și să găsesc un loc liniștit să o savurez. Toate suplimentele din interior sunt atât de amuzante și de o calitate remarcabilă."',
    # orchid-mae
    '"She is six letters in and thoroughly enjoying them. She looks forward to each one! Loves all the extras."':
        '"Este la a șasea scrisoare și le savurează complet. Așteptă fiecare una cu nerăbdare! Adoră toate suplimentele."',
    '"I love the anticipation this process brings — going to the mailbox, finding a beautiful letter. I love reading, getting caught up in and enjoying every page."':
        '"Îmi place anticiparea pe care o aduce acest proces — să merg la cutia poștală, să găsesc o scrisoare frumoasă. Îmi place să citesc, să mă pierd în și să mă bucur de fiecare pagină."',
    '"I was so excited. I can\'t wait until Orchid Mae arrives in Brazil. I\'m looking forward to my letters arriving every month and becoming part of the story."':
        '"Eram atât de entuziasmată. Abia aștept să ajungă Orchid Mae în Brazilia. Aștept cu nerăbdare scrisorile care sosesc în fiecare lună și să devin parte a poveștii."',
    '"I love these letters so much, I ordered a Gift Bundle for 2 of my friends! The detail is wonderful and the writing just pulls me in."':
        '"Adoră atât de mult aceste scrisori încât am comandat un Pachet Cadou pentru 2 dintre prietenii mei! Detaliile sunt minunate și scrisul mă atrage pur și simplu."',
    '"Wow, I could not have anticipated just how much she would LOVE them."':
        '"Uau, nu aș fi putut anticipa cât de mult le-ar ADORA."',
    # norah-aven
    '"I so look forward to receiving each letter! I love the book so far, and enjoy the mystery. This gift from my daughter is truly enjoyable!"':
        '"Aștept cu atâta nerăbdare să primesc fiecare scrisoare! Îmi place cartea până acum și mă bucur de mister. Acest cadou de la fiica mea este cu adevărat plăcut!"',
    '"She was so excited to receive the tin! What a wonderful gift — she loves to read and is a history buff."':
        '"Era atât de entuziasmată să primească cutia! Ce cadou minunat — îi place să citească și este o pasionată de istorie."',
    '"I am absolutely loving the Norah Aven Collection! Beautifully written, incredibly engaging and interactive. This is genius at its finest."':
        '"Sunt absolut îndrăgostită de Colecția Norah Aven! Scrisă frumos, incredibil de captivantă și interactivă. Acesta este geniu la cel mai înalt nivel."',
    '"My 13-year-old daughter loves this. She is very excited for her next letter!"':
        '"Fiica mea de 13 ani adoră asta. Este foarte entuziasmată pentru următoarea ei scrisoare!"',
    '"Our grandma absolutely loves getting these in the mail!! She shares the letters with our family — her great grandkids love them just as much."':
        '"Bunica noastră adoră absolut să le primească prin poștă!! Împarte scrisorile cu familia noastră — nepoții ei le adoră la fel de mult."',
}

def translate_story_recenzii(content):
    """Replaces storyRecenzii review texts with Romanian translations."""
    new_content = content

    # Replace review texts
    for eng, ro in TRANSLATED.items():
        new_content = new_content.replace(eng, ro)

    # Replace "Verified Buyer" with Romanian
    new_content = new_content.replace("', Verified Buyer'", "', Cumpărător Verificat'")
    new_content = new_content.replace('", Verified Buyer"', '", Cumpărător Verificat"')
    new_content = new_content.replace(', Verified Buyer', ', Cumpărător Verificat')

    return new_content

files = glob.glob(f'{BASE}/**/*.html', recursive=True) + glob.glob(f'{BASE}/*.html')
files = [f for f in files if 'en-ca' not in f and '@' not in os.path.basename(f)]

total = 0
for filepath in files:
    content = open(filepath, encoding='utf-8', errors='ignore').read()
    if 'storyRecenzii' not in content:
        continue
    rel = os.path.relpath(filepath, BASE)
    new_content = translate_story_recenzii(content)
    if new_content != content:
        open(filepath, 'w', encoding='utf-8').write(new_content)
        print(f"  ✓ {rel}")
        total += 1
    else:
        print(f"  - {rel} (neschimbat)")

print(f"\nGata! {total} fișiere modificate.")
