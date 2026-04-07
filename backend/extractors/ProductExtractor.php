<?php
class ProductExtractor
{
    private static array $productMap = [
        'camellia-grace' => [
            'file' => 'products/an-immersive-story-experience-told-through-letters.html',
            'title' => 'Camellia Grace',
            'subtitle' => 'Romantic din Epoca de Aur',
            'era' => 'Epoca de Aur',
            'description' => 'O poveste captivantă plasată în strălucirea și opulența Epocii de Aur americane. Urmărește călătoria lui Camellia Grace prin salonurile luxoase și secretele ascunse ale înaltei societăți.',
            'price' => '$12/lună',
            'priceNote' => 'Abonament lunar, 24 de scrisori livrate pe parcursul a 12 luni',
        ],
        'audrey-rose' => [
            'file' => 'products/the-audrey-rose-collection-monthly.html',
            'title' => 'Audrey Rose',
            'subtitle' => 'Romantic din Al Doilea Război Mondial',
            'era' => 'Al Doilea Război Mondial',
            'description' => 'Colecția noastră de debut are loc în timpul celui de-al Doilea Război Mondial și se concentrează pe una dintre cele mai importante zile din istorie: 6 iunie 1944... Ziua Z. Audrey Rose Drollinger îl întâlnește pe Caporalul Charlie Henderson Burke la un dans al Rangilor Armatei în Tullahoma, Tennessee.',
            'price' => '$13/lună',
            'priceNote' => 'Abonament lunar, anulează oricând',
        ],
        'audrey-rose-prepaid' => [
            'file' => 'products/the-audrey-rose-letters-prepaid.html',
            'title' => 'Audrey Rose - Preplătit',
            'subtitle' => 'Romantic din Al Doilea Război Mondial',
            'era' => 'Al Doilea Război Mondial',
            'description' => 'Întreaga colecție Audrey Rose preplătită. Primești toate cele 24 de scrisori livrate pe parcursul a 12 luni.',
            'price' => '$120',
            'priceNote' => 'Plată unică, toate cele 24 de scrisori incluse',
        ],
        'adelaide-magnolia' => [
            'file' => 'products/the-adelaide-magnolia-collection-annual.html',
            'title' => 'Adelaide Magnolia',
            'subtitle' => 'Romantic din epoca Regenței',
            'era' => 'Epoca Regenței',
            'description' => 'O poveste romantică plasată în Anglia din epoca Regenției. Adelaide Magnolia navighează prin regulile stricte ale societății, descoperind în același timp dragostea și aventura.',
            'price' => '$120/an',
            'priceNote' => 'Abonament anual, 24 de scrisori',
        ],
        'orchid-mae' => [
            'file' => 'products/the-orchid-mae-letters.html',
            'title' => 'Orchid Mae',
            'subtitle' => 'Aventură arheologică',
            'era' => 'Arheologie',
            'description' => 'O aventură captivantă care combină misterul arheologiei cu o poveste de dragoste. Orchid Mae pornește într-o călătorie extraordinară de descoperire.',
            'price' => '$120/an',
            'priceNote' => 'Abonament anual, 24 de scrisori',
        ],
        'lily-clara' => [
            'file' => 'products/the-lily-clara-collection-annual.html',
            'title' => 'Lily Clara',
            'subtitle' => 'Aventură western',
            'era' => 'Vestul Sălbatic',
            'description' => 'O aventură western plină de curaj și determinare. Lily Clara înfruntă provocările Vestului Sălbatic cu spirit neînfricat.',
            'price' => '$120/an',
            'priceNote' => 'Abonament anual, 24 de scrisori',
        ],
        'norah-aven' => [
            'file' => 'products/the-norah-aven-chronicles.html',
            'title' => 'Norah Aven - Partea 1',
            'subtitle' => 'Aventură fantasy',
            'era' => 'Fantasy',
            'description' => 'Cronicile Norah Aven te transportă într-o lume fantasy fascinantă. Prima parte a unei serii epice pline de magie, aventură și mister.',
            'price' => '$120/an',
            'priceNote' => 'Abonament anual, 24 de scrisori',
        ],
        'norah-aven-2' => [
            'file' => 'products/the-norah-aven-chronicles-pt2.html',
            'title' => 'Norah Aven - Partea 2',
            'subtitle' => 'Aventură fantasy',
            'era' => 'Fantasy',
            'description' => 'Continuarea cronicilor Norah Aven. A doua parte a seriei fantasy cu și mai multă acțiune și mister.',
            'price' => '$120/an',
            'priceNote' => 'Abonament anual, 24 de scrisori',
        ],
        'norah-aven-3' => [
            'file' => 'products/norah-aven-part-3-prepaid.html',
            'title' => 'Norah Aven - Partea 3',
            'subtitle' => 'Aventură fantasy',
            'era' => 'Fantasy',
            'description' => 'Finalul epic al cronicilor Norah Aven. Toate misterele își găsesc răspunsul în această ultimă parte.',
            'price' => '$120',
            'priceNote' => 'Preplătit, 24 de scrisori',
        ],
        'norah-aven-complete' => [
            'file' => 'products/the-norah-aven-chronicles-complete-sets.html',
            'title' => 'Norah Aven - Seturi Complete',
            'subtitle' => 'Aventură fantasy',
            'era' => 'Fantasy',
            'description' => 'Toate cele trei părți ale cronicilor Norah Aven într-un singur set complet. Experiența completă a seriei fantasy.',
            'price' => '$300',
            'priceNote' => 'Set complet, toate cele 3 părți',
        ],
    ];

    public static function extractAll(): array
    {
        $products = [];
        foreach (self::$productMap as $slug => $info) {
            $product = self::extractOne($slug, $info);
            if ($product) $products[] = $product;
        }
        return $products;
    }

    private static function extractOne(string $slug, array $info): ?array
    {
        $filePath = SOURCE_DIR . '/' . $info['file'];
        $doc = HtmlParser::load($filePath);

        $images = [];
        $contentHtml = '';

        if ($doc) {
            $images = HtmlParser::getImages($doc);
            $contentHtml = HtmlParser::getMainContent($doc);
        }

        // Filter to product images only (from cdn.shopify)
        $productImages = array_values(array_filter($images, function($url) {
            return str_contains($url, 'cdn/shop/products') || str_contains($url, 'ucarecdn.com');
        }));

        return [
            'slug' => $slug,
            'title' => $info['title'],
            'subtitle' => $info['subtitle'],
            'era' => $info['era'],
            'description' => $info['description'],
            'price' => $info['price'],
            'priceNote' => $info['priceNote'],
            'image' => $productImages[0] ?? '',
            'gallery' => array_slice($productImages, 0, 6),
            'features' => [
                '24 de scrisori ilustrate manual',
                'Livrate de două ori pe lună',
                'Cărți poștale incluse',
                'Surprize pe parcurs',
            ],
            'seo' => [
                'title' => "{$info['title']} - {$info['subtitle']} | Scrisori cu Povești",
                'description' => $info['description'],
            ],
        ];
    }
}
