<?php
class PolicyExtractor
{
    private static array $policyMap = [
        'confidentialitate' => ['file' => 'pages/privacy-policy.html', 'title' => 'Politica de confidențialitate'],
        'returnare' => ['file' => 'pages/refund-policy.html', 'title' => 'Politica de returnare'],
        'expediere' => ['file' => 'pages/shipping.html', 'title' => 'Politica de expediere'],
        'termeni' => ['file' => 'pages/terms-and-conditions.html', 'title' => 'Termeni și condiții'],
    ];

    public static function extractAll(): array
    {
        $policies = [];
        foreach (self::$policyMap as $slug => $info) {
            $filePath = SOURCE_DIR . '/' . $info['file'];
            $doc = HtmlParser::load($filePath);

            $content = '';
            if ($doc) {
                $content = HtmlParser::getMainContent($doc);
            }

            $policies[] = [
                'slug' => $slug,
                'title' => $info['title'],
                'content' => $content,
                'seo' => [
                    'title' => "{$info['title']} | Scrisori cu Povești",
                    'description' => '',
                ],
            ];
        }
        return $policies;
    }
}
