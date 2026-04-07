<?php
class HomepageExtractor
{
    public static function extract(): array
    {
        $doc = HtmlParser::load(SOURCE_DIR . '/index.html');
        if (!$doc) return [];

        $images = HtmlParser::getImages($doc);
        $texts = HtmlParser::getTextContent($doc);

        return [
            'seo' => [
                'title' => 'Scrisori cu Povești - Povești spuse prin scrisori',
                'description' => 'Descoperă magia poveștilor spuse prin scrisori. Livrate de două ori pe lună, tot anul.',
            ],
            'hero' => [
                'title' => 'Ceva frumos vine prin poștă',
                'subtitle' => 'Descoperă magia poveștilor spuse prin scrisori. Livrate de două ori pe lună, tot anul.',
                'cta' => ['label' => 'Explorează poveștile', 'path' => '/povesti'],
                'image' => $images[0] ?? '',
            ],
            'secondaryHero' => [
                'title' => 'Bucurie livrată câte o scrisoare pe rând',
                'description' => 'Readă magia scrisorilor cu 24 de scrisori frumos ilustrate. O poveste care se dezvăluie treptat. Un cadou care continuă să sosească — și continuă să însemne ceva.',
                'cta' => ['label' => 'Explorează poveștile', 'path' => '/povesti'],
            ],
            'stories' => [
                ['slug' => 'camellia-grace', 'title' => 'Camellia Grace', 'subtitle' => 'Romantic din Epoca de Aur'],
                ['slug' => 'orchid-mae', 'title' => 'Orchid Mae', 'subtitle' => 'Aventură arheologică'],
                ['slug' => 'audrey-rose', 'title' => 'Audrey Rose', 'subtitle' => 'Romantic din Al Doilea Război Mondial'],
                ['slug' => 'lily-clara', 'title' => 'Lily Clara', 'subtitle' => 'Aventură western'],
                ['slug' => 'adelaide-magnolia', 'title' => 'Adelaide Magnolia', 'subtitle' => 'Romantic din epoca Regenței'],
                ['slug' => 'norah-aven', 'title' => 'Norah Aven', 'subtitle' => 'Aventură fantasy'],
            ],
            'testimonials' => [
                [
                    'text' => 'Fiecare scrisoare mă face să vreau mai mult. Întotdeauna mi-a plăcut să primesc scrisori. Email-ul nu se compară cu un plic adresat ție, în cutia ta poștală, la fiecare două săptămâni. Sunt atât de bucuroasă că am decis să fac asta pentru mine.',
                    'author' => 'Shari L.',
                    'badge' => 'Client verificat',
                ],
                [
                    'text' => 'Am cumpărat Scrisorile cu Flori pentru ziua mamei noastre... Să spunem că a fost cadoul PERFECT ar fi puțin spus! Ne sună la fiecare 2 săptămâni cu atâta bucurie și entuziasm...',
                    'author' => 'Cecil M.',
                    'badge' => 'Client verificat',
                ],
                [
                    'text' => 'Ador, ador, ador scrisorile Audrey Rose. Ascult muzică din acea epocă și îmi citesc scrisorile. E ca și cum ai fi transportat în acel timp și loc. O călătorie minunată, cu siguranță.',
                    'author' => 'Stephanie S.',
                    'badge' => 'Client verificat',
                ],
                [
                    'text' => 'Am cumpărat povestea Audrey Rose pentru mama mea de Ziua Mamei... A spus că partea ei preferată este când i le citesc eu. Aceste scrisori ne-au făcut pe amândouă să încetinim, într-o lume agitată și nebună, și să petrecem timp împreună citind povestea minunată...',
                    'author' => 'Holly Bloom',
                    'badge' => 'Client verificat',
                ],
                [
                    'text' => 'O, Doamne... aceste scrisori mă fac să simt experiența de a trăi în timpul celui de-al Doilea Război Mondial... Mă entuziasmez atât de tare când îmi sosesc scrisorile, îmi fac o cafea și mă bucur călătorind în timp cu Audrey Rose și Charlie.',
                    'author' => 'Ann Cooper',
                    'badge' => 'Client verificat',
                ],
                [
                    'text' => 'Le-am cumpărat pentru mama mea de 90 de ani. Bucuria pe care i-a adus-o este de necrezut. Vă mulțumim că faceți asta.',
                    'author' => 'Elise Kretz',
                    'badge' => 'Client verificat',
                ],
            ],
            'trustBadges' => [
                ['icon' => 'shield-check', 'text' => 'Livrare protejată'],
                ['icon' => 'refresh-cw', 'text' => 'Garanție de returnare în 30 de zile'],
                ['icon' => 'mail', 'text' => 'Peste 3 milioane de scrisori expediate'],
                ['icon' => 'check-circle', 'text' => 'Fără risc, anulează oricând'],
            ],
        ];
    }
}
