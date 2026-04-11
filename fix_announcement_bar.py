#!/usr/bin/env python3
"""
Translatează bara de anunț și fixează link-ul să meargă pe site-ul nostru.
Bara este injectată dinamic de theme.js, deci folosim MutationObserver
să o interceptăm imediat ce apare și să modificăm textul + link-ul.
"""
import glob, os

BASE = '/var/develop/scrisoricupovesti/theflowerletters-original/theflowerletters.com/site'

SCRIPT = """<script>
(function(){
  var _fix = function(){
    var link = document.querySelector('.announcement-bar__link');
    if(!link) return false;
    link.href = '/pages/get-started';
    link.setAttribute('target','_self');
    var msg = link.querySelector('.announcement-bar__message');
    if(msg) msg.textContent = 'Comandați până pe 1 mai pentru livrarea de Ziua Mamei \u273f Programați un cadou';
    return true;
  };
  if(!_fix()){
    var obs = new MutationObserver(function(m,o){ if(_fix()) o.disconnect(); });
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
</script>
</body>"""

files = (
    glob.glob(f'{BASE}/products/*.html') +
    glob.glob(f'{BASE}/pages/*.html')
)
files = [f for f in files if '@' not in os.path.basename(f)]

total = 0
for fp in sorted(files):
    content = open(fp, encoding='utf-8', errors='ignore').read()
    if SCRIPT in content:
        continue  # deja aplicat
    if '</body>' not in content:
        continue
    # Remove old script if exists (re-run safety)
    c = content.replace(SCRIPT, '</body>')
    # Insert script before </body>
    c = c.replace('</body>', SCRIPT, 1)
    if c != content:
        open(fp, 'w', encoding='utf-8').write(c)
        print(f'  ✓ {os.path.relpath(fp, BASE)}')
        total += 1

print(f'\nGata! {total} fișiere modificate.')
