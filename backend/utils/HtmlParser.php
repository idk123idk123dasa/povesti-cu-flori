<?php
/**
 * HTML Parser utility - extracts content from mirrored Shopify HTML files.
 */
class HtmlParser
{
    /**
     * Load and parse an HTML file, returning a DOMDocument.
     */
    public static function load(string $path): ?DOMDocument
    {
        if (!file_exists($path)) {
            return null;
        }

        $html = file_get_contents($path);
        if (empty($html)) return null;

        $doc = new DOMDocument();
        libxml_use_internal_errors(true);
        $doc->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'), LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();

        return $doc;
    }

    /**
     * Extract the main content area from a page (strip nav, footer, scripts).
     */
    public static function getMainContent(DOMDocument $doc): string
    {
        $xpath = new DOMXPath($doc);

        // Try to find main content
        $mainNodes = $xpath->query('//main') ?: $xpath->query('//*[@id="MainContent"]');

        if ($mainNodes && $mainNodes->length > 0) {
            $main = $mainNodes->item(0);
        } else {
            $main = $xpath->query('//body')->item(0);
            if (!$main) return '';
        }

        // Remove scripts, styles, noscript
        foreach (['script', 'style', 'noscript', 'svg'] as $tag) {
            $nodes = $xpath->query(".//{$tag}", $main);
            if ($nodes) {
                foreach ($nodes as $node) {
                    $node->parentNode->removeChild($node);
                }
            }
        }

        // Remove header/footer/nav inside main
        foreach (['header', 'footer'] as $tag) {
            $nodes = $xpath->query(".//{$tag}", $main);
            if ($nodes) {
                foreach ($nodes as $node) {
                    $node->parentNode->removeChild($node);
                }
            }
        }

        return self::innerHTML($main);
    }

    /**
     * Extract visible text from a node.
     */
    public static function getTextContent(DOMDocument $doc): array
    {
        $xpath = new DOMXPath($doc);

        // Remove scripts/styles first
        foreach (['script', 'style', 'noscript'] as $tag) {
            $nodes = $xpath->query("//{$tag}");
            if ($nodes) {
                foreach ($nodes as $node) {
                    $node->parentNode->removeChild($node);
                }
            }
        }

        $main = $xpath->query('//main')->item(0) ?: $xpath->query('//body')->item(0);
        if (!$main) return [];

        $texts = [];
        self::extractTexts($main, $texts);
        return array_filter($texts, fn($t) => strlen(trim($t)) > 1);
    }

    /**
     * Extract all image URLs from a node.
     */
    public static function getImages(DOMDocument $doc): array
    {
        $xpath = new DOMXPath($doc);
        $imgs = $xpath->query('//img');
        $urls = [];

        if ($imgs) {
            foreach ($imgs as $img) {
                $src = $img->getAttribute('src') ?: $img->getAttribute('data-src');
                if ($src) {
                    // Normalize URL
                    if (str_starts_with($src, '//')) {
                        $src = 'https:' . $src;
                    }
                    $urls[] = $src;
                }
            }
        }

        return $urls;
    }

    /**
     * Get the page title.
     */
    public static function getTitle(DOMDocument $doc): string
    {
        $xpath = new DOMXPath($doc);
        $title = $xpath->query('//title');
        if ($title && $title->length > 0) {
            $text = $title->item(0)->textContent;
            // Remove site suffix
            $text = preg_replace('/\s*[–\-|]\s*Scrisorile cu Flori\s*$/', '', $text);
            $text = preg_replace('/\s*[–\-|]\s*The Flower Letters\s*$/', '', $text);
            return trim($text);
        }
        return '';
    }

    /**
     * Get meta description.
     */
    public static function getMetaDescription(DOMDocument $doc): string
    {
        $xpath = new DOMXPath($doc);
        $meta = $xpath->query('//meta[@name="description"]');
        if ($meta && $meta->length > 0) {
            return $meta->item(0)->getAttribute('content') ?: '';
        }
        return '';
    }

    /**
     * Get innerHTML of a DOMNode.
     */
    public static function innerHTML(DOMNode $node): string
    {
        $html = '';
        foreach ($node->childNodes as $child) {
            $html .= $node->ownerDocument->saveHTML($child);
        }
        return trim($html);
    }

    private static function extractTexts(DOMNode $node, array &$texts): void
    {
        if ($node->nodeType === XML_TEXT_NODE) {
            $text = trim($node->textContent);
            if ($text !== '') $texts[] = $text;
            return;
        }

        if ($node->hasChildNodes()) {
            foreach ($node->childNodes as $child) {
                self::extractTexts($child, $texts);
            }
        }
    }

    /**
     * Create a URL-friendly slug from a string.
     */
    public static function slugify(string $text): string
    {
        $text = mb_strtolower($text);
        $text = preg_replace('/[^\w\s-]/', '', $text);
        $text = preg_replace('/[\s_]+/', '-', $text);
        $text = preg_replace('/-+/', '-', $text);
        return trim($text, '-');
    }
}
