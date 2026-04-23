#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE_DIR = Path('/home/claude/site')

NEW_FOOTER = """<style>html,body{margin:0!important;padding:0!important;}footer{display:block;width:100%;}</style>
<footer style="margin:0;padding:0;position:relative;line-height:0;overflow:hidden;">
<video class="footer-video" data-src="https://poze.scrisoricupovesti.ro/1776963074544-0msl1j.mp4" muted loop playsinline style="width:100%;display:block;min-height:120px;object-fit:cover;"></video>
<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;">
  <div style="line-height:0;background:rgba(0,0,0,0.38);padding:28px 40px;border-radius:12px;backdrop-filter:blur(2px);">
    <p style="color:#fff;font-family:'EB Garamond',Georgia,serif;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.22em;margin:0 0 16px;line-height:1;text-shadow:0 2px 8px rgba(0,0,0,.8);">Mai multe informații</p>
    <a href="/pagini/terms-and-conditions" style="display:block;color:#fff;font-family:'EB Garamond',Georgia,serif;font-size:17px;font-weight:700;text-decoration:none;margin-bottom:10px;line-height:1.3;text-shadow:0 2px 8px rgba(0,0,0,.8);">Termeni și condiții</a>
    <a href="/pagini/privacy-policy" style="display:block;color:#fff;font-family:'EB Garamond',Georgia,serif;font-size:17px;font-weight:700;text-decoration:none;margin-bottom:10px;line-height:1.3;text-shadow:0 2px 8px rgba(0,0,0,.8);">Politica de confidențialitate</a>
    <a href="/pagini/refund-policy" style="display:block;color:#fff;font-family:'EB Garamond',Georgia,serif;font-size:17px;font-weight:700;text-decoration:none;margin-bottom:10px;line-height:1.3;text-shadow:0 2px 8px rgba(0,0,0,.8);">Returnări și rambursări</a>
    <a href="/politici/politica-livrare" style="display:block;color:#fff;font-family:'EB Garamond',Georgia,serif;font-size:17px;font-weight:700;text-decoration:none;line-height:1.3;text-shadow:0 2px 8px rgba(0,0,0,.8);">Politica de expediere</a>
  </div>
</div>
<script>
(function(){
  var v=document.querySelector('.footer-video');
  if(!v)return;
  if('IntersectionObserver' in window){
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          if(!v.src){v.src=v.getAttribute('data-src');v.load();}
          v.play();
        } else {
          v.pause();
        }
      });
    },{threshold:0.1});
    obs.observe(v);
  } else {
    v.src=v.getAttribute('data-src');
    v.load();v.play();
  }
})();
</script>
</footer>"""

updated = 0
skipped = 0

for html_file in sorted(SITE_DIR.rglob('*.html')):
    if html_file.name == 'index.html' and html_file.parent == SITE_DIR:
        continue

    content = html_file.read_text(encoding='utf-8', errors='replace')

    # Skip if already has new video footer
    if 'footer-video' in content:
        skipped += 1
        continue

    original = content

    # Remove old static image footer (pagini/ type)
    # Pattern: <footer style="...font-family:'EB Garamond'...">...</footer>
    content = re.sub(
        r'<footer\s+style="[^"]*font-family:[^"]*EB Garamond[^"]*"[^>]*>.*?</footer>',
        '',
        content,
        flags=re.DOTALL
    )

    # Remove old GemPage footer overlay CSS+script block (pages/ type)
    # Pattern: <style id="footer-overlay-css">...</style>\n<script>...injectOverlay...</script>
    content = re.sub(
        r'<style\s+id="footer-overlay-css">.*?</style>\s*<script>\s*\(function\(\)\{[^}]*function injectOverlay.*?</script>',
        '',
        content,
        flags=re.DOTALL
    )

    # Insert new footer just before </body>
    # The </body> appears inline: <style>body,body *{...}</style></body> or just </body>
    if '</body>' in content:
        # Insert before the LAST </body>
        last_body = content.rfind('</body>')
        content = content[:last_body] + '\n' + NEW_FOOTER + '\n' + content[last_body:]
    else:
        # Fallback: append before </html>
        last_html = content.rfind('</html>')
        if last_html != -1:
            content = content[:last_html] + '\n' + NEW_FOOTER + '\n' + content[last_html:]
        else:
            content += '\n' + NEW_FOOTER

    if content != original:
        html_file.write_text(content, encoding='utf-8')
        print(f'Updated: {html_file.relative_to(SITE_DIR)}')
        updated += 1
    else:
        print(f'No change: {html_file.relative_to(SITE_DIR)}')

print(f'\nDone: {updated} updated, {skipped} skipped (already correct)')
