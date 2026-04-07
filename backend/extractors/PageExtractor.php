<?php
class PageExtractor
{
    private static array $pageMap = [
        'cum-functioneaza' => ['file' => 'pages/how-it-works.html', 'title' => 'Cum funcționează'],
        'faq' => ['file' => 'pages/faq.html', 'title' => 'Întrebări frecvente'],
        'recenzii' => ['file' => 'pages/the-flower-letters-reviews.html', 'title' => 'Recenzii'],
        'contact' => ['file' => 'pages/contact-us.html', 'title' => 'Contactează-ne'],
        'misiune' => ['file' => 'pages/mission.html', 'title' => 'Misiunea noastră'],
        'despre-autor' => ['file' => 'pages/hannie-clark-bio.html', 'title' => 'Despre Autor'],
        'cadouri' => ['file' => 'pages/gift-story-letters.html', 'title' => 'Scrisori cu Povești Cadou'],
        'incepe' => ['file' => 'pages/get-started.html', 'title' => 'Începe acum'],
        'podcast' => ['file' => 'pages/podcast.html', 'title' => 'Podcast'],
        'materiale-printabile' => ['file' => 'pages/digital-printables.html', 'title' => 'Materiale digitale printabile'],
        'cadou-printabil' => ['file' => 'pages/gift-printout-downloads.html', 'title' => 'Cadouri printabile'],
        'imagini-fundal' => ['file' => 'pages/wallpaper-downloads.html', 'title' => 'Descarcă imagini de fundal'],
        'declinare' => ['file' => 'pages/disclaimer.html', 'title' => 'Declinarea responsabilității'],
        'afla-mai-mult' => ['file' => 'pages/learn-more.html', 'title' => 'Află mai mult'],
    ];

    public static function extractAll(): array
    {
        $pages = [];
        foreach (self::$pageMap as $slug => $info) {
            $page = self::extractOne($slug, $info);
            if ($page) $pages[] = $page;
        }
        return $pages;
    }

    private static function extractOne(string $slug, array $info): ?array
    {
        $filePath = SOURCE_DIR . '/' . $info['file'];
        $doc = HtmlParser::load($filePath);

        $contentHtml = '';
        $images = [];

        if ($doc) {
            $contentHtml = HtmlParser::getMainContent($doc);
            $images = HtmlParser::getImages($doc);
        }

        return [
            'slug' => $slug,
            'title' => $info['title'],
            'content' => $contentHtml,
            'images' => array_slice($images, 0, 10),
            'seo' => [
                'title' => "{$info['title']} | Scrisori cu Povești",
                'description' => '',
            ],
        ];
    }
}
