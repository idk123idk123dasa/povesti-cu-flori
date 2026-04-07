#!/usr/bin/env php
<?php
/**
 * PHP Backend - Content extractor / JSON API generator
 * Parses the mirrored HTML files and generates structured JSON for the Vue 3 frontend.
 */

define('SOURCE_DIR', __DIR__ . '/../theflowerletters.com');
define('OUTPUT_DIR', __DIR__ . '/../frontend/public/api');
define('SITE_NAME', 'Scrisori cu Povești');

// Ensure output directories exist
$dirs = ['', '/products', '/pages', '/blogs', '/blogs/audrey-rose', '/blogs/adelaide-magnolia', '/blogs/orchid-mae', '/blogs/camellia-grace', '/collections', '/policies'];
foreach ($dirs as $d) {
    $path = OUTPUT_DIR . $d;
    if (!is_dir($path)) mkdir($path, 0755, true);
}

require_once __DIR__ . '/utils/HtmlParser.php';
require_once __DIR__ . '/extractors/HomepageExtractor.php';
require_once __DIR__ . '/extractors/ProductExtractor.php';
require_once __DIR__ . '/extractors/PageExtractor.php';
require_once __DIR__ . '/extractors/BlogExtractor.php';
require_once __DIR__ . '/extractors/PolicyExtractor.php';

echo "=== Scrisori cu Povești - PHP Content Builder ===\n\n";

// 1. Extract site-wide data (nav, footer)
echo "[1/6] Generating site.json...\n";
$siteData = extractSiteData();
writeJson('site.json', $siteData);

// 2. Extract homepage
echo "[2/6] Generating homepage.json...\n";
$homepage = HomepageExtractor::extract();
writeJson('homepage.json', $homepage);

// 3. Extract products
echo "[3/6] Generating product JSONs...\n";
$products = ProductExtractor::extractAll();
writeJson('products/index.json', array_map(fn($p) => [
    'slug' => $p['slug'],
    'title' => $p['title'],
    'subtitle' => $p['subtitle'],
    'price' => $p['price'],
    'image' => $p['image'],
], $products));
foreach ($products as $product) {
    writeJson("products/{$product['slug']}.json", $product);
    echo "  ✓ products/{$product['slug']}.json\n";
}

// 4. Extract pages
echo "[4/6] Generating page JSONs...\n";
$pages = PageExtractor::extractAll();
foreach ($pages as $page) {
    writeJson("pages/{$page['slug']}.json", $page);
    echo "  ✓ pages/{$page['slug']}.json\n";
}

// 5. Extract blogs
echo "[5/6] Generating blog JSONs...\n";
$blogs = BlogExtractor::extractAll();
$blogIndex = [];
foreach ($blogs as $category => $posts) {
    $blogIndex[$category] = array_map(fn($p) => [
        'slug' => $p['slug'],
        'title' => $p['title'],
        'category' => $category,
    ], $posts);
    foreach ($posts as $post) {
        writeJson("blogs/{$category}/{$post['slug']}.json", $post);
    }
    echo "  ✓ blogs/{$category}/ (" . count($posts) . " posts)\n";
}
writeJson('blogs/index.json', $blogIndex);

// 6. Extract policies
echo "[6/6] Generating policy JSONs...\n";
$policies = PolicyExtractor::extractAll();
foreach ($policies as $policy) {
    writeJson("policies/{$policy['slug']}.json", $policy);
    echo "  ✓ policies/{$policy['slug']}.json\n";
}

echo "\n✓ Build complete! JSON API generated in: " . realpath(OUTPUT_DIR) . "\n";

// --- Helper functions ---

function writeJson(string $path, array $data): void {
    $fullPath = OUTPUT_DIR . '/' . $path;
    file_put_contents($fullPath, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function extractSiteData(): array {
    return [
        'siteName' => SITE_NAME,
        'siteUrl' => 'https://scrisori.fitgo.ro',
        'language' => 'ro',
        'navigation' => [
            'main' => [
                ['label' => 'Povești', 'path' => '/povesti', 'children' => [
                    ['label' => 'Camellia Grace', 'path' => '/povesti/camellia-grace'],
                    ['label' => 'Adelaide Magnolia', 'path' => '/povesti/adelaide-magnolia'],
                    ['label' => 'Audrey Rose', 'path' => '/povesti/audrey-rose'],
                    ['label' => 'Orchid Mae', 'path' => '/povesti/orchid-mae'],
                    ['label' => 'Lily Clara', 'path' => '/povesti/lily-clara'],
                    ['label' => 'Norah Aven', 'path' => '/povesti/norah-aven'],
                ]],
                ['label' => 'Cum funcționează', 'path' => '/pagini/cum-functioneaza'],
                ['label' => 'Recenzii', 'path' => '/pagini/recenzii'],
                ['label' => 'Cadouri', 'path' => '/pagini/cadouri'],
                ['label' => 'Despre Autor', 'path' => '/pagini/despre-autor'],
                ['label' => 'Contact', 'path' => '/pagini/contact'],
            ],
            'footer' => [
                ['label' => 'Politica de confidențialitate', 'path' => '/politici/confidentialitate'],
                ['label' => 'Politica de returnare', 'path' => '/politici/returnare'],
                ['label' => 'Politica de expediere', 'path' => '/politici/expediere'],
                ['label' => 'Termeni și condiții', 'path' => '/politici/termeni'],
                ['label' => 'Întrebări frecvente', 'path' => '/pagini/faq'],
                ['label' => 'Contact', 'path' => '/pagini/contact'],
            ],
        ],
        'trustBadges' => [
            ['icon' => 'shield', 'title' => 'Livrare protejată'],
            ['icon' => 'refresh', 'title' => 'Garanție de returnare în 30 de zile'],
            ['icon' => 'mail', 'title' => 'Peste 3 milioane de scrisori expediate'],
            ['icon' => 'check', 'title' => 'Fără risc, anulează oricând'],
        ],
    ];
}
