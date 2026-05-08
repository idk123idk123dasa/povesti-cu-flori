#!/usr/bin/env python3
"""Translate ALL remaining English text in the site to Romanian.
Processes each HTML file, finds English text nodes, translates them."""

import os, re, glob
from bs4 import BeautifulSoup, NavigableString, Comment

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

# English indicator words for detection
EN_WORDS = set('the and for with from that this your our you will are was have has been each can what how when where which their about would could every also were they them than more into through after before during between order receive ship but not all may any who she her his him its our its we us me my by an or at if so do no as up be it on'.split())

def is_english(text):
    words = re.findall(r'[a-z]+', text.lower())
    if len(words) < 3: return False
    return sum(1 for w in words if w in EN_WORDS) >= 2

# === MASSIVE TRANSLATION DICTIONARY ===
T = {
    # FAQ Questions
    "What are Scrisorile cu Flori?": "Ce sunt Scrisorile cu Flori?",
    "How much do the stories cost?": "Cât costă poveștile?",
    "What will I receive with my story experience?": "Ce voi primi cu experiența mea de poveste?",
    "Are your stories family-friendly?": "Sunt poveștile voastre potrivite pentru familie?",
    "Do you have stories for children?": "Aveți povești pentru copii?",
    "How much do the stories cost?": "Cât costă poveștile?",
    "Can I purchase more than one story at a time?": "Pot cumpăra mai multe povești simultan?",
    "What's the difference between the plans?": "Care e diferența dintre planuri?",
    "How do I give this as a gift?": "Cum ofer asta cadou?",
    "What if my recipient already has this story?": "Ce se întâmplă dacă destinatarul are deja această poveste?",
    "Do you ship internationally?": "Expediați internațional?",
    "When will my letters arrive?": "Când vor ajunge scrisorile mele?",
    "When will the first letter arrive?": "Când va ajunge prima scrisoare?",
    "Can I cancel at any time?": "Pot anula oricând?",
    "Can I change the shipping address after ordering?": "Pot schimba adresa de livrare după comandă?",
    "What if my letters are lost or damaged?": "Ce se întâmplă dacă scrisorile mele se pierd sau deteriorează?",
    "How do I manage my subscription?": "Cum îmi gestionez abonamentul?",
    "Do you offer refunds?": "Oferiți rambursări?",
    "What is your return policy?": "Care este politica de returnare?",

    # FAQ Answers (key sentences)
    "Scrisorile cu Flori is a 12-month story experience that brings captivating stories to life through beautifully crafted letters mailed directly to you.": "Scrisorile cu Flori este o experiență de poveste pe 12 luni care aduce la viață povești captivante prin scrisori frumos realizate, trimise direct la tine.",
    "Each story unfolds over the course of 12 months.": "Fiecare poveste se dezvăluie pe parcursul a 12 luni.",
    "In each envelope, you'll find heartfelt correspondence between story characters": "În fiecare plic vei găsi corespondență sinceră între personajele poveștii",
    "along with thoughtfully designed extras like postcards, newspaper clippings, and other charming mementos that enrich the story experience.": "împreună cu extras-uri gândite cu grijă precum cărți poștale, decupaje din ziare și alte amintiri fermecătoare care îmbogățesc experiența poveștii.",
    "Our prepaid story subscriptions are priced at $155.40": "Abonamentele noastre preplătite sunt la prețul de $155.40",
    "while monthly subscriptions are available for $12.95": "iar abonamentele lunare sunt disponibile pentru $12.95",
    "For our international customers, shipping is calculated based on your location and the current exchange rate.": "Pentru clienții noștri internaționali, livrarea se calculează pe baza locației și cursului de schimb curent.",
    "We recommend proceeding to checkout to view the exact cost of shipping to your country.": "Vă recomandăm să treceți la finalizarea comenzii pentru a vedea costul exact al expedierii.",
    "Please note there are no duty fees associated with our letters": "Vă rugăm să rețineți că nu există taxe vamale asociate scrisorilor noastre",
    "with the exception of the first letter, which is shipped as a package rather than standard mail": "cu excepția primei scrisori, care este expediată ca pachet și nu prin poșta standard",
    "and may incur customs fees depending on your country.": "și poate implica taxe vamale în funcție de țara dvs.",
    "For the most up-to-date pricing and special offers, please visit our website.": "Pentru cele mai recente prețuri și oferte speciale, vă rugăm vizitați site-ul nostru.",
    "Each story experience consists of 24 letters sent over a period of twelve months.": "Fiecare experiență de poveste constă din 24 de scrisori trimise pe o perioadă de douăsprezece luni.",
    "In addition to the letters, each envelope includes additional items such as postcards, telegrams, posters, newspaper clippings": "Pe lângă scrisori, fiecare plic include articole suplimentare precum cărți poștale, telegrame, postere, decupaje din ziare",
    "You will also have access to our online": "Vei avea de asemenea acces la articolele noastre online de",
    "articles, which give you historical context and additional insights into the era associated with each story.": "care îți oferă context istoric și informații suplimentare despre epoca asociată fiecărei povești.",
    "These articles contain no spoilers": "Aceste articole nu conțin spoilere",
    "Each story is a singular experience is purchased individually.": "Fiecare poveste este o experiență unică și se achiziționează individual.",
    "You can make one payment up front (with savings) or pay over 12 months.": "Poți face o singură plată în avans (cu economii) sau poți plăti pe parcursul a 12 luni.",
    "You are also welcome to sign up for multiple stories at once": "Ești binevenit să te înscrii la mai multe povești simultan",
    "or take your time and enjoy each story one at a time.": "sau să îți iei timp și să te bucuri de fiecare poveste pe rând.",
    "Yes — our stories are family-friendly overall": "Da — poveștile noastre sunt în general potrivite pentru familie",
    "and we generally recommend them for ages 12+ (teens and adults).": "și le recomandăm în general pentru vârste de 12+ (adolescenți și adulți).",
    "Some stories include light romance, deeper emotional themes": "Unele povești includ romantic ușor, teme emoționale mai profunde",
    "and occasionally darker more serious elements": "și ocazional elemente mai întunecate și serioase",
    "We also reference real historical topics such as war and historical events.": "De asemenea, facem referire la subiecte istorice reale precum războiul și evenimentele istorice.",
    "Because every family has different comfort levels": "Pentru că fiecare familie are niveluri diferite de confort",
    "we recommend parent guidance for younger readers": "recomandăm îndrumare parentală pentru cititorii mai tineri",
    "and we encourage customers to choose the story collection that feels right for the recipient.": "și încurajăm clienții să aleagă colecția de povești care se potrivește destinatarului.",
    "Our stories are best enjoyed by readers aged 12+.": "Poveștile noastre sunt cel mai bine savurate de cititorii cu vârsta de 12+.",

    # Story descriptions
    "Audrey Rose Drollinger meets Corporal Charlie Henderson Burke at a Fourth of July Army Ranger dance in Tullahoma, Tennessee.": "Audrey Rose Drollinger îl întâlnește pe Caporalul Charlie Henderson Burke la un dans al Rangilor Armatei de Ziua Independenței în Tullahoma, Tennessee.",
    "From the moment he lays eyes on her, Charlie knows he's a goner.": "Din momentul în care o vede, Charlie știe că e pierdut.",
    "He has to write to her.": "Trebuie să-i scrie.",
    "When the music ends that night, their story is just beginning": "Când muzica se oprește în acea noapte, povestea lor abia începe",
    "as the two soon learn they have a great deal in common": "deoarece cei doi descoperă curând că au multe în comun",
    "a love for their country, loyalty to the army": "dragoste pentru țara lor, loialitate față de armată",
    "and, of course, an immediate attraction to one another.": "și, desigur, o atracție imediată unul față de celălalt.",
    "As their relationship develops through heartfelt letters": "Pe măsură ce relația lor se dezvoltă prin scrisori sincere",
    "the couple moves closer and closer to one of the most important days of WWII.": "cuplul se apropie tot mai mult de una dintre cele mai importante zile ale celui de-al Doilea Război Mondial.",
    "Yet, neither can see the significant role each will play in the day's events": "Totuși, niciunul nu poate vedea rolul semnificativ pe care îl va juca în evenimentele zilei",
    "and whether they'll both make it out alive.": "și dacă amândoi vor scăpa cu viață.",

    "When spirited dressmaker Lily Clara Moore answers a matrimonial ad, she heads west for an adventure that quickly turns out to be more than she bargained for.": "Când croitoreasa plină de viață Lily Clara Moore răspunde unui anunț matrimonial, se îndreaptă spre vest pentru o aventură care se dovedește rapid mai mult decât se aștepta.",
    "The year is 1884, and a little town in the western United States has found itself the destination spot for cowboys, prospectors, and outlaws.": "Anul este 1884, iar un orășel din vestul Statelor Unite a devenit destinația pentru cowboy, prospectori și bandiți.",

    "The only thing that can save her is her own tenacity": "Singurul lucru care o poate salva este propria ei tenacitate",
    "and the letters she's been exchanging with a very handsome Pinkerton agent Matthew Hickman.": "și scrisorile pe care le schimbă cu foarte frumosul agent Pinkerton Matthew Hickman.",

    # Adelaide Magnolia
    "The Colecția Adelaide Magnolia is set in Jane Austen's England.": "Colecția Adelaide Magnolia este plasată în Anglia lui Jane Austen.",
    "The year is 1817 and the Prince Regent is ruling in Mad King George's stead.": "Anul este 1817 și Prințul Regent conduce în locul Regelui George cel Nebun.",
    "Miss Adelaide Magnolia Arden was once the sensational": "Domnișoara Adelaide Magnolia Arden a fost cândva senzaționala",
    "but has since walked away from high society for reasons unknown.": "dar s-a retras din înalta societate din motive necunoscute.",
    "After his heroic campaign at Waterloo": "După campania sa eroică de la Waterloo",
    "Captain Liam Mattice has spent the last two London seasons searching for": "Căpitanul Liam Mattice a petrecut ultimele două sezoane londoneze căutând",
    "Annual incomes, ball gowns, and the latest scandal of the Prince Regent": "Veniturile anuale, rochiile de bal și ultimul scandal al Prințului Regent",
    "are all London's high society concerns itself with": "sunt tot ce preocupă înalta societate londoneză",
    "but if Adelaide and Liam ever hope to find the true happiness they seek": "dar dacă Adelaide și Liam speră vreodată să găsească adevărata fericire pe care o caută",
    "they must first learn to let go of everything holding them back.": "trebuie mai întâi să învețe să renunțe la tot ce îi ține în loc.",

    # Norah Aven
    "For nine long months while biding her time at Dunstan Academy": "Timp de nouă luni lungi, în timp ce își petrecea timpul la Academia Dunstan",
    "Norah Aven Lukens has believed she is going crazy.": "Norah Aven Lukens a crezut că înnebunește.",
    "After all, seeing things": "La urma urmei, a vedea lucruri",
    "things that can't possibly be real": "lucruri care nu pot fi reale",
    "isn't a great omen.": "nu este un semn bun.",
    "When Norah returns home, ready to get her life back to normal": "Când Norah se întoarce acasă, gata să-și recapete viața normală",
    "she learns that her chronically absent, myth-chasing guardian": "află că tutorele ei cronic absent, vânător de mituri",
    "has died under mysterious circumstances.": "a murit în circumstanțe misterioase.",
    "Armed with clues planted in her uncle's research": "Înarmată cu indicii plantate în cercetarea unchiului ei",
    "Norah sets out on her own myth-chasing adventure to unravel the mystery surrounding his death.": "Norah pornește în propria aventură de vânătoare de mituri pentru a dezlega misterul morții sale.",
    "She's soon plunged into a secret, ancient world": "Este curând aruncată într-o lume secretă, antică",
    "Norah soon discovers that Uncle Jack's clues are sending her on a very different adventure than she expected": "Norah descoperă curând că indiciile Unchiului Jack o trimit într-o aventură foarte diferită de cea la care se aștepta",
    "and perhaps — for better or for worse— she's not as crazy as she thought.": "și poate — spre bine sau spre rău — nu e atât de nebună pe cât credea.",

    # Orchid Mae
    "It's 1910, the height of the Progressive Era": "Este 1910, apogeul Erei Progresiste",
    "and 20-year-old Orchid Mae Entwistle is quickly becoming the next Nellie Bly amongst American journalists.": "iar Orchid Mae Entwistle, în vârstă de 20 de ani, devine rapid următoarea Nellie Bly printre jurnaliștii americani.",
    "As a muckraker reporter, there's one thing she knows for sure:": "Ca reporter muckraker, știe un lucru sigur:",
    "the truth always matters.": "adevărul contează întotdeauna.",
    "When a mysterious letter comes from her archeologist aunt": "Când o scrisoare misterioasă vine de la mătușa ei arheolog",
    "making Orchid a career-promoting offer of a lifetime": "oferindu-i lui Orchid o oportunitate de carieră unică în viață",
    "she's ready to jump at the chance.": "e gata să profite de ocazie.",
    "There's just one catch": "E doar o problemă",
    "it may require her to compromise the one thing she values most: the truth.": "s-ar putea să fie nevoită să compromită singurul lucru pe care-l prețuiește cel mai mult: adevărul.",

    # Camellia Grace
    "Camellia Grace is set during the Gilded Age": "Camellia Grace se desfășoară în Epoca de Aur",

    # General product page text
    "Perfectly fits 24 letters from your story collection": "Se potrivește perfect pentru 24 de scrisori din colecția ta de povești",
    "Tins will be shipped within 1-3 business days": "Cutiile vor fi expediate în 1-3 zile lucrătoare",
    "If ordering a tin + story, the first letter will be included inside the tin.": "Dacă comanzi o cutie + poveste, prima scrisoare va fi inclusă în cutie.",
    "Visit our website, choose a story, and payment option.": "Vizitează site-ul nostru, alege o poveste și o opțiune de plată.",
    "You can also schedule when you'd like us to ship the first letter.": "Poți de asemenea programa când dorești să expediem prima scrisoare.",
    "If ordering for yourself, enter your own shipping address": "Dacă comanzi pentru tine, introdu propria adresă de livrare",
    "For multiple recipients at different addresses": "Pentru mai mulți destinatari la adrese diferite",
    "complete the order for the first recipient, then place a new order for each additional recipient.": "finalizează comanda pentru primul destinatar, apoi plasează o comandă nouă pentru fiecare destinatar suplimentar.",
    "After completing your purchase, check your email for the confirmation.": "După finalizarea achiziției, verifică email-ul pentru confirmare.",
    "If you'd like to send a printable or digital introduction to let your recipient know about their upcoming gift": "Dacă dorești să trimiți o introducere printabilă sau digitală pentru a anunța destinatarul despre cadoul viitor",
    "Visit our website and choose a story": "Vizitează site-ul nostru și alege o poveste",
    "and add it to your cart.": "și adaug-o în coș.",
    "Enter your recipient's shipping address so their letters will be sent directly to them.": "Introdu adresa de livrare a destinatarului pentru ca scrisorile să fie trimise direct către ei.",
    "A tracking number will be provided once the letter has been shipped.": "Un număr de urmărire va fi furnizat odată ce scrisoarea a fost expediată.",

    # How it works
    "Choose the story and start date": "Alege povestea și data de începere",
    "Choose the story and ship date": "Alege povestea și data de expediere",
    "With six stories to choose from, there is something for everyone.": "Cu șase povești din care să alegi, există ceva pentru fiecare.",
    "Choose your preferred ship date and set your gifting timeline.": "Alege data preferată de expediere și stabilește calendarul cadoului.",
    "Print at home to present in person": "Printează acasă pentru a prezenta personal",
    "or email it to a friend celebrating from afar.": "sau trimite-l prin email unui prieten care sărbătorește de departe.",
    "We give you choices — what's best for you is best for us.": "Îți oferim opțiuni — ce e mai bine pentru tine e mai bine și pentru noi.",
    "We'll take it from there and ship the first letter": "Noi ne ocupăm de rest și expediem prima scrisoare",
    "on the date selected, followed by two letters each month for the next year.": "la data selectată, urmată de două scrisori în fiecare lună pentru anul următor.",
    "Select your preferred story and ship date to begin your experience.": "Selectează povestea și data de expediere preferate pentru a începe experiența.",
    "Your first letter (or letter/tin) ships on your selected date and arrives within days.": "Prima ta scrisoare (sau scrisoare/cutie) se expediază la data selectată și ajunge în câteva zile.",
    "A beautiful beginning to your year of story.": "Un început frumos pentru anul tău de poveste.",
    "Settle in and savor these monthly moments.": "Instalează-te și savurează aceste momente lunare.",
    "Two letters arrive each month for the next year": "Două scrisori ajung în fiecare lună pentru anul următor",
    "bringing joy, enrichment, relief, and connection.": "aducând bucurie, îmbogățire, alinare și conexiune.",
    "Every piece is carefully crafted to immerse you in another time and place.": "Fiecare piesă este realizată cu grijă pentru a te transpune în alt timp și loc.",
    "We pack each envelope to make this a rich, immersive experience you'll look forward to every two weeks.": "Ambalăm fiecare plic pentru a face din aceasta o experiență bogată și captivantă pe care o vei aștepta la fiecare două săptămâni.",
    "What our customers are saying": "Ce spun clienții noștri",
    "as seen in": "după cum s-a văzut în",

    # Mission page
    "In 2020, we started Scrisorile cu Flori with the hope a few people would see what we're doing, get it, sign up, and have a wonderful experience.": "În 2020, am început Scrisorile cu Flori cu speranța că câțiva oameni vor vedea ce facem, vor înțelege, se vor înscrie și vor avea o experiență minunată.",
    "So this is the part where I could say…we launched and the rest is history!": "Aceasta este partea în care aș putea spune… am lansat și restul e istorie!",
    "As to say we accomplished what we set out to.": "Ca și cum am fi realizat ceea ce ne-am propus.",
    "To be honest, we didn't exactly do that.": "Ca să fiu sincer, nu am făcut exact asta.",
    "This is the first pillar of our mission.": "Acesta este primul pilon al misiunii noastre.",
    "Joy should be in everything we do": "Bucuria ar trebui să fie în tot ceea ce facem",
    "including our stories.": "inclusiv în poveștile noastre.",
    "Connection is a fundamental need we all have.": "Conexiunea este o nevoie fundamentală pe care o avem cu toții.",
    "In one way or another, we all need a friend.": "Într-un fel sau altul, cu toții avem nevoie de un prieten.",

    # Gift page
    "Already ordered? Download the matching gift card below to present on the day.": "Ai comandat deja? Descarcă cardul cadou potrivit mai jos pentru a-l prezenta în ziua specială.",
    "Choose your story and order with the recipient's shipping address": "Alege povestea și comandă cu adresa de livrare a destinatarului",
    "Download the matching gift card for that story below": "Descarcă cardul cadou potrivit pentru acea poveste mai jos",
    "Print and present it — or email the digital version — today": "Printează-l și prezintă-l — sau trimite versiunea digitală prin email — astăzi",
    "What gifters are saying": "Ce spun cei care oferă cadouri",
    "Best gift EVER!": "Cel mai bun cadou VREODATĂ!",

    # Reviews/testimonials
    "I bought this for my Mother In Love": "Am cumpărat asta pentru soacra mea",
    "as she loves to read as much as I do.": "deoarece îi place să citească la fel de mult ca și mie.",
    "I got the tin that goes with it and we enjoy them together.": "Am luat și cutia care merge cu ele și ne bucurăm de ele împreună.",
    "I can't begin to tell you just how much I love these beautiful boxes": "Nu pot începe să vă spun cât de mult iubesc aceste cutii frumoase",
    "I am anxiously awaiting more of their story!": "Aștept cu nerăbdare continuarea poveștii lor!",
    "My husband bought this for me for Christmas": "Soțul meu mi-a cumpărat asta de Crăciun",
    "and I truly cannot express how much I love it.": "și nu pot exprima cu adevărat cât de mult o iubesc.",
    "It is such a thoughtful, meaningful gift.": "Este un cadou atât de grijuliu și semnificativ.",
    "I ordered this story for my 91 year old mother": "Am comandat această poveste pentru mama mea de 91 de ani",
    "I really do love the letters!": "Chiar iubesc scrisorile!",
    "The recipient really liked this gift.": "Destinatarului i-a plăcut foarte mult acest cadou.",
    "For the person who has everything, it was perfect.": "Pentru persoana care are totul, a fost perfect.",
    "So awesome we gifted 2 more.": "Atât de grozav încât am mai oferit 2.",
    "I purchased this for my mother who is 88 and loves to read.": "Am cumpărat asta pentru mama mea de 88 de ani căreia îi place să citească.",
    "She loves it and looks forward to the letters coming.": "Îi place și abia așteaptă să vină scrisorile.",
    "Best Christmas gift.": "Cel mai bun cadou de Crăciun.",
    "Don't hesitate to gift for Mother's Day, Christmas, birthdays!": "Nu ezitați să oferiți cadou de Ziua Mamei, Crăciun, zile de naștere!",
    "I purchased this as a gift.": "Am cumpărat asta ca și cadou.",
    "I purchased when I noticed a friend call me in tears": "Am cumpărat când am observat că o prietena m-a sunat în lacrimi",
    "super happy tears": "lacrimi de fericire",
    "when the first letter arrived.": "când a ajuns prima scrisoare.",
    "It was the perfect gift.": "A fost cadoul perfect.",

    # Hannie Clark bio
    "Hannie Clark is the creator and storyteller behind": "Hannie Clark este creatoarea și povestitoarea din spatele",
    "an immersive letter experience that brings history and fiction to life through the beauty of the written word.": "o experiență captivantă de scrisori care aduce la viață istoria și ficțiunea prin frumusețea cuvântului scris.",
    "With a passion for history, storytelling, and the lost art of letter writing": "Cu o pasiune pentru istorie, povestire și arta pierdută a scrisorilor",
    "Since launching, Hannie has written and designed seven original series, with more than": "De la lansare, Hannie a scris și a proiectat șapte serii originale, cu peste",
    "What began as a passion project has blossomed into a global movement": "Ceea ce a început ca un proiect de pasiune a înflorit într-o mișcare globală",
    "rekindling the joy of letter writing and reminding people everywhere of the beauty of slowing down.": "reaprindând bucuria scrisorilor și amintind oamenilor de pretutindeni de frumusețea de a încetini.",
    "Today, Hannie continues to create each series alongside her husband and co-founder, Michael Clark.": "Astăzi, Hannie continuă să creeze fiecare serie alături de soțul și co-fondatorul ei, Michael Clark.",
    "The two have been married for over 20 years": "Cei doi sunt căsătoriți de peste 20 de ani",
    "At home, Hannie is a devoted mother to two wonderful children": "Acasă, Hannie este o mamă devotată a doi copii minunați",
    "and two spirited miniature dachshunds who are never far from her side.": "și doi teckeli miniaturali plini de viață care nu sunt niciodată departe de ea.",

    # Cart
    "We are proud to offer veterans, active military, and first responders $10 off online purchases.": "Suntem mândri să oferim veteranilor, militarilor activi și personalului de urgență o reducere de $10 la achizițiile online.",
    "One or more of the items in your cart is a deferred, subscription, or recurring purchase.": "Unul sau mai multe produse din coșul tău sunt achiziții cu plată amânată, abonament sau recurente.",
    "By continuing, I agree to the": "Continuând, sunt de acord cu",
    "and authorize you to charge my payment method at the prices, frequency and dates listed on this page until my order is fulfilled or I cancel": "și vă autorizez să taxați metoda mea de plată la prețurile, frecvența și datele listate pe această pagină până când comanda mea este îndeplinită sau anulez",

    # Homepage
    "We're Michael and Hannie Clark, the husband-and-wife team behind Scrisorile cu Flori.": "Suntem Michael și Hannie Clark, echipa soț-soție din spatele Scrisorilor cu Flori.",
    "What started as an idea at our kitchen table has grown into something we're incredibly proud of.": "Ceea ce a început ca o idee la masa din bucătărie a crescut într-un lucru de care suntem incredibil de mândri.",
    "Revive the magic of mail with 24 beautifully illustrated letters.": "Readă magia scrisorilor cu 24 de scrisori frumos ilustrate.",
    "One unfolding story.": "O poveste care se dezvăluie.",
    "A gift that keeps arriving — and keeps meaning something.": "Un cadou care continuă să sosească — și continuă să însemne ceva.",
    "Each letter leaves me wanting more.": "Fiecare scrisoare mă face să vreau mai mult.",
    "I have always loved getting letters.": "Întotdeauna mi-a plăcut să primesc scrisori.",
    "Email is just not the same as an envelope addressed to you in your mailbox every two weeks.": "Email-ul nu se compară cu un plic adresat ție, în cutia ta poștală, la fiecare două săptămâni.",
    "I am so glad I decided to do this for myself.": "Sunt atât de bucuroasă că am decis să fac asta pentru mine.",
    "We purchased Scrisorile cu Flori for our mom's birthday": "Am cumpărat Scrisorile cu Flori pentru ziua mamei noastre",
    "To say this was the PERFECT gift would be an understatement!": "Să spunem că a fost cadoul PERFECT ar fi puțin spus!",
    "She calls every 2 weeks with such joy and excitement": "Ne sună la fiecare 2 săptămâni cu atâta bucurie și entuziasm",
    "I love, love, love, the Audrey Rose letters.": "Ador, ador, ador scrisorile Audrey Rose.",
    "I listen to music from the era and read my letters.": "Ascult muzică din acea epocă și îmi citesc scrisorile.",
    "It's like being transformed to that time and place.": "E ca și cum ai fi transportat în acel timp și loc.",
    "A wonderful journey for sure.": "O călătorie minunată, cu siguranță.",
    "I bought the Audrey Rose story for my mother for Mother's Day": "Am cumpărat povestea Audrey Rose pentru mama mea de Ziua Mamei",
    "She said her favorite part is me reading them to her.": "A spus că partea ei preferată este când i le citesc eu.",
    "These letters have made both of us slow down, in a busy crazy world": "Aceste scrisori ne-au făcut pe amândouă să încetinim, într-o lume agitată și nebună",
    "and spend time together reading the wonderful story": "și să petrecem timp împreună citind povestea minunată",
    "Thank you so much for giving my mom and myself that joy of spending time together!": "Vă mulțumim foarte mult că ne-ați oferit mamei mele și mie bucuria de a petrece timp împreună!",
    "Oh my goodness…these letters make me feel the experience of living out WW2": "O, Doamne... aceste scrisori mă fac să simt experiența de a trăi în timpul celui de-al Doilea Război Mondial",
    "I get so excited when my letters arrive": "Mă entuziasmez atât de tare când îmi sosesc scrisorile",
    "and make a cup of coffee and enjoy time traveling with Audrey Rose & Charlie.": "îmi fac o cafea și mă bucur călătorind în timp cu Audrey Rose și Charlie.",
    "Love story set in 1944 with facts & fiction.": "Poveste de dragoste plasată în 1944, cu fapte reale și ficțiune.",
    "Keep 'em coming!": "Să tot vină!",
    "I purchased these for my 90 year old mother.": "Le-am cumpărat pentru mama mea de 90 de ani.",
    "The joy that this has brought her is unbelievable.": "Bucuria pe care i-a adus-o este de necrezut.",
    "Thank you for doing this": "Vă mulțumim că faceți asta",

    # Digital printables
    "You will receive 64 printable pages (8.5 x 11) in PDF format. Instant download.": "Vei primi 64 de pagini printabile (8.5 x 11) în format PDF. Descărcare instantanee.",
    "You will receive 16 printable pages (8.5 x 11) in PDF format. Instant download.": "Vei primi 16 pagini printabile (8.5 x 11) în format PDF. Descărcare instantanee.",
    "The file will be in .zip format.": "Fișierul va fi în format .zip.",
    "We suggest using a high-quality laser printer.": "Sugerăm utilizarea unei imprimante laser de calitate.",
    "If you do not have a printer available at home, check with your local printing company.": "Dacă nu aveți o imprimantă disponibilă acasă, verificați cu compania locală de imprimare.",

    # Manage subscription
    "Manage Your Subscription": "Gestionează-ți abonamentul",
    "Log in to your account to manage your subscription.": "Autentifică-te în contul tău pentru a gestiona abonamentul.",
}

def translate_node(text):
    stripped = text.strip()
    if not stripped or len(stripped) < 3:
        return text

    # Exact match
    if stripped in T:
        return text.replace(stripped, T[stripped])

    # Partial matches (longer phrases first)
    result = text
    for en, ro in sorted(T.items(), key=lambda x: -len(x[0])):
        if len(en) > 8 and en in result:
            result = result.replace(en, ro)

    return result


def process_file(filepath):
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

    for el in soup.find_all(string=True):
        if isinstance(el, Comment): continue
        skip = False
        for anc in el.parents:
            if anc.name in skip_tags:
                skip = True
                break
        if skip: continue

        orig = str(el)
        if not orig.strip() or len(orig.strip()) < 3: continue
        translated = translate_node(orig)
        if translated != orig:
            el.replace_with(NavigableString(translated))
            modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(str(soup))
    return modified


def main():
    files = glob.glob(os.path.join(BASE, '**', '*.html'), recursive=True)
    files = [f for f in files if 'en-ca' not in f]
    print(f"Procesez {len(files)} fișiere...")
    count = 0
    for f in sorted(files):
        if process_file(f):
            count += 1
            print(f"  ✓ {os.path.relpath(f, BASE)}")
    print(f"\nTraduse: {count}/{len(files)}")


if __name__ == '__main__':
    main()
