<?php
class BlogExtractor
{
    private static array $blogDirs = [
        'audrey-rose' => 'blogs/audrey-rose',
        'adelaide-magnolia' => 'blogs/the-adelaide-magnolia-collection-extended-learning',
        'orchid-mae' => 'blogs/the-orchid-mae-collection-extended-learning',
    ];

    public static function extractAll(): array
    {
        $allBlogs = [];

        foreach (self::$blogDirs as $category => $dir) {
            $fullDir = SOURCE_DIR . '/' . $dir;
            if (!is_dir($fullDir)) continue;

            $posts = [];
            $files = glob($fullDir . '/*.html');
            foreach ($files as $file) {
                $basename = basename($file, '.html');
                // Skip query-string files and index pages
                if (str_contains($basename, '@')) continue;
                if ($basename === $category) continue;

                $post = self::extractPost($file, $category, $basename);
                if ($post) $posts[] = $post;
            }

            if (!empty($posts)) {
                $allBlogs[$category] = $posts;
            }
        }

        return $allBlogs;
    }

    private static function extractPost(string $filePath, string $category, string $slug): ?array
    {
        $doc = HtmlParser::load($filePath);
        if (!$doc) return null;

        $title = HtmlParser::getTitle($doc);
        $content = HtmlParser::getMainContent($doc);
        $images = HtmlParser::getImages($doc);

        if (empty($title) && empty($content)) return null;

        return [
            'slug' => $slug,
            'title' => $title ?: ucwords(str_replace('-', ' ', $slug)),
            'category' => $category,
            'content' => $content,
            'images' => array_slice($images, 0, 5),
            'seo' => [
                'title' => ($title ?: $slug) . ' | Scrisori cu Povești',
                'description' => '',
            ],
        ];
    }
}
