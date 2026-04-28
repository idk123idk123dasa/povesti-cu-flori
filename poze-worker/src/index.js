const HTML = `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Încarcă fișiere – Scrisori cu Povești</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{
  min-height:100vh;
  background-color:#7D1E2A;
  background-image:url('https://cdn.shopify.com/s/files/1/0419/4517/0084/files/Red-FloralBG-Square-2.jpg?v=1774999232');
  background-size:400px;
  font-family:'Georgia',serif;
  display:flex;align-items:flex-start;justify-content:center;
  padding:32px 16px;
}
.card{
  background:#fff;
  border-radius:16px;
  box-shadow:0 16px 60px rgba(0,0,0,0.35);
  width:100%;max-width:620px;
  overflow:hidden;
}
.card-head{
  background:linear-gradient(135deg,#7D1E2A,#9E2535);
  padding:28px 28px 24px;
  text-align:center;
}
.card-head::after{
  content:'';display:block;
  height:18px;background:#fff;
  border-radius:50% 50% 0 0/18px 18px 0 0;
  margin:-1px -28px -1px;
}
.card-head h1{color:#fff;font-size:1.5rem;font-weight:600;margin-bottom:4px;}
.card-head p{color:rgba(255,255,255,0.7);font-size:0.88rem;}
.card-body{padding:28px;}

.drop-zone{
  border:2px dashed #d8d0c8;
  border-radius:12px;
  padding:48px 20px;
  text-align:center;
  cursor:pointer;
  transition:all 0.2s;
  background:#faf9f7;
  position:relative;
  margin-bottom:20px;
}
.drop-zone.over{border-color:#B8913A;background:#fdf8ef;}
.drop-zone input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}
.drop-icon{font-size:2.8rem;margin-bottom:10px;}
.drop-text{color:#666;font-size:0.95rem;line-height:1.6;}
.drop-text strong{color:#333;}
.drop-hint{font-size:0.78rem;color:#aaa;margin-top:4px;}

.preview-grid{
  display:none;
  grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
  gap:10px;
  margin-bottom:20px;
}
.preview-grid:empty{display:none;}
.preview-item{
  position:relative;
  border-radius:8px;
  overflow:hidden;
  background:repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0/16px 16px;
  aspect-ratio:1;
}
.preview-item img,.preview-item video{width:100%;height:100%;object-fit:cover;display:block;}
.preview-item .remove-btn{
  position:absolute;top:4px;right:4px;
  background:rgba(0,0,0,0.55);color:#fff;
  border:none;border-radius:50%;
  width:22px;height:22px;font-size:14px;line-height:22px;text-align:center;
  cursor:pointer;padding:0;
}
.preview-item .item-name{
  position:absolute;bottom:0;left:0;right:0;
  background:rgba(0,0,0,0.5);color:#fff;
  font-size:0.65rem;padding:3px 5px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.preview-item .item-overlay{
  position:absolute;inset:0;
  background:rgba(0,0,0,0.45);
  display:none;
  align-items:center;justify-content:center;
  flex-direction:column;gap:4px;
}
.preview-item.uploading .item-overlay{display:flex;}
.preview-item.done .item-overlay{display:flex;background:rgba(40,120,40,0.55);}
.preview-item.error .item-overlay{display:flex;background:rgba(180,30,30,0.55);}
.item-status{font-size:1.5rem;}
.item-pct{color:#fff;font-size:0.72rem;}
.video-badge{
  position:absolute;top:4px;left:4px;
  background:rgba(0,0,0,0.6);color:#fff;
  font-size:0.6rem;padding:2px 5px;border-radius:4px;
  pointer-events:none;
}

.btn{
  display:block;width:100%;
  padding:13px;
  background:linear-gradient(135deg,#7D1E2A,#A0263A);
  color:#fff;font-family:'Georgia',serif;
  font-size:1rem;font-weight:600;
  border:none;border-radius:8px;cursor:pointer;
  transition:opacity 0.2s;
  margin-bottom:16px;
}
.btn:hover{opacity:0.88;}
.btn:disabled{opacity:0.4;cursor:default;}

.gallery-result{
  display:none;
  background:#fdf8ef;
  border:2px solid #B8913A;
  border-radius:10px;
  padding:16px;
  margin-bottom:16px;
  text-align:center;
}
.gallery-result .gl-label{
  font-size:0.78rem;color:#B8913A;text-transform:uppercase;
  letter-spacing:0.1em;font-weight:700;margin-bottom:8px;
}
.gallery-result .gl-url{
  font-size:0.85rem;color:#1a1a1a;word-break:break-all;
  background:#fff;border:1px solid #d8d0c8;border-radius:6px;
  padding:8px 10px;margin-bottom:10px;font-family:monospace;
}
.gl-copy-btn{
  background:#B8913A;color:#fff;
  border:none;border-radius:6px;
  padding:8px 20px;font-size:0.9rem;font-weight:600;
  cursor:pointer;transition:background 0.15s;
}
.gl-copy-btn:hover{background:#9a7a30;}
.gl-copy-btn.copied{background:#5a7a30;}

.results{margin-top:4px;}
.result-item{
  background:#f0f9f0;
  border:1px solid #c3e6cb;
  border-radius:8px;
  padding:12px 14px;
  margin-bottom:10px;
}
.result-label{font-size:0.72rem;color:#388e3c;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:6px;}
.result-url{
  font-size:0.82rem;color:#1a1a1a;word-break:break-all;
  background:#fff;border:1px solid #d8d0c8;border-radius:6px;
  padding:7px 10px;margin-bottom:8px;font-family:monospace;
}
.copy-btn{
  background:#388e3c;color:#fff;
  border:none;border-radius:5px;
  padding:5px 12px;font-size:0.8rem;
  cursor:pointer;transition:background 0.15s;
}
.copy-btn:hover{background:#2e7d32;}
.copy-btn.copied{background:#1b5e20;}

.err-global{
  display:none;background:#fff0f0;border:1px solid #ffcdd2;
  border-radius:8px;padding:12px;color:#c62828;
  font-size:0.88rem;margin-bottom:12px;
}
</style>
</head>
<body>
<div class="card">
  <div class="card-head">
    <h1>📁 Încarcă fișiere</h1>
    <p>Poze și videoclipuri simultan</p>
  </div>
  <div class="card-body">
    <div class="drop-zone" id="dropZone">
      <input type="file" id="fileInput" accept="image/*,video/*" multiple onchange="addFiles(this.files)"/>
      <div class="drop-icon">🖼️🎬</div>
      <div class="drop-text"><strong>Trage fișierele aici</strong><br>sau apasă să alegi · sau Ctrl+V</div>
      <div class="drop-hint">Poze: PNG, JPG, GIF, WebP · Video: MP4, MOV, AVI, WebM · max 200 MB</div>
    </div>

    <div class="preview-grid" id="previewGrid"></div>

    <div class="err-global" id="errGlobal"></div>

    <button class="btn" id="uploadBtn" onclick="uploadAll()" disabled>Încarcă →</button>

    <div class="gallery-result" id="galleryResult">
      <div class="gl-label">🔗 Link unic pentru toate fișierele</div>
      <div class="gl-url" id="galleryUrl"></div>
      <button class="gl-copy-btn" id="glCopyBtn" onclick="copyGallery()">Copiază linkul</button>
    </div>

    <div class="results" id="results"></div>
  </div>
</div>

<script>
var files = [];
var uploadedItems = []; // {url, contentType}

var dz = document.getElementById('dropZone');
dz.addEventListener('dragover', function(e){ e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave', function(){ dz.classList.remove('over'); });
dz.addEventListener('drop', function(e){
  e.preventDefault(); dz.classList.remove('over');
  addFiles(e.dataTransfer.files);
});
window.addEventListener('paste', function(e){
  var items = (e.clipboardData || window.clipboardData) && e.clipboardData.items;
  if (!items) return;
  var pasted = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.kind === 'file') {
      var f = it.getAsFile();
      if (f) pasted.push(f);
    }
  }
  if (pasted.length) { e.preventDefault(); addFiles(pasted); }
});

function isAccepted(f) {
  return f.type.startsWith('image/') || f.type.startsWith('video/');
}

function addFiles(fileList) {
  for (var i = 0; i < fileList.length; i++) {
    var f = fileList[i];
    if (!isAccepted(f)) { showErr('„' + f.name + '" nu e o poză sau video.'); continue; }
    if (f.size > 200*1024*1024) { showErr('„' + f.name + '" e prea mare (max 200 MB).'); continue; }
    var dup = files.some(function(x){ return x && x.name===f.name && x.size===f.size; });
    if (!dup) { files.push(f); renderPreview(f, files.length-1); }
  }
  if (files.filter(Boolean).length > 0) document.getElementById('uploadBtn').disabled = false;
  document.getElementById('errGlobal').style.display = 'none';
}

function renderPreview(file, idx) {
  var grid = document.getElementById('previewGrid');
  grid.style.display = 'grid';
  var item = document.createElement('div');
  item.className = 'preview-item';
  item.id = 'item-' + idx;

  var isVideo = file.type.startsWith('video/');
  var media;
  var url = URL.createObjectURL(file);

  if (isVideo) {
    media = document.createElement('video');
    media.src = url;
    media.muted = true;
    media.loop = true;
    media.autoplay = true;
    media.playsInline = true;
    var badge = document.createElement('div');
    badge.className = 'video-badge';
    badge.textContent = '▶ video';
    item.appendChild(badge);
  } else {
    media = document.createElement('img');
    var reader = new FileReader();
    reader.onload = function(e){ media.src = e.target.result; };
    reader.readAsDataURL(file);
  }

  var rm = document.createElement('button');
  rm.className = 'remove-btn';
  rm.textContent = '×';
  rm.title = 'Elimină';
  (function(i){ rm.onclick = function(e){ e.stopPropagation(); removeFile(i); }; })(idx);

  var name = document.createElement('div');
  name.className = 'item-name';
  name.textContent = file.name;

  var overlay = document.createElement('div');
  overlay.className = 'item-overlay';
  overlay.innerHTML = '<span class="item-status">⏳</span><span class="item-pct" id="pct-'+idx+'">0%</span>';

  item.appendChild(media);
  item.appendChild(rm);
  item.appendChild(name);
  item.appendChild(overlay);
  grid.appendChild(item);
}

function removeFile(idx) {
  files[idx] = null;
  var el = document.getElementById('item-' + idx);
  if (el) el.remove();
  var remaining = files.filter(function(f){ return f !== null; });
  if (remaining.length === 0) {
    document.getElementById('uploadBtn').disabled = true;
    document.getElementById('previewGrid').style.display = 'none';
  }
}

function uploadAll() {
  var btn = document.getElementById('uploadBtn');
  btn.disabled = true;
  document.getElementById('errGlobal').style.display = 'none';
  document.getElementById('galleryResult').style.display = 'none';
  uploadedItems = [];

  var toUpload = files.map(function(f,i){ return {file:f,idx:i}; }).filter(function(x){ return x.file !== null; });
  if (!toUpload.length) return;

  var done = 0;
  toUpload.forEach(function(entry){
    uploadOne(entry.file, entry.idx, function(item){
      if (item) uploadedItems.push(item);
      done++;
      if (done === toUpload.length) {
        btn.disabled = false;
        if (uploadedItems.length > 0) createGallery(uploadedItems);
      }
    });
  });
}

function uploadOne(file, idx, onDone) {
  var item = document.getElementById('item-' + idx);
  if (item) item.classList.add('uploading');

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/upload');

  xhr.upload.onprogress = function(e){
    if (e.lengthComputable) {
      var pct = Math.round(e.loaded/e.total*100);
      var pctEl = document.getElementById('pct-' + idx);
      if (pctEl) pctEl.textContent = pct + '%';
    }
  };

  xhr.onload = function(){
    if (item) item.classList.remove('uploading');
    try {
      var d = JSON.parse(xhr.responseText);
      if (d.url) {
        if (item) { item.classList.add('done'); item.querySelector('.item-status').textContent = '✓'; }
        addResult(file.name, d.url, d.contentType);
        onDone({ url: d.url, contentType: d.contentType });
      } else {
        if (item) { item.classList.add('error'); item.querySelector('.item-status').textContent = '✗'; }
        onDone(null);
      }
    } catch(e) {
      if (item) { item.classList.add('error'); item.querySelector('.item-status').textContent = '✗'; }
      onDone(null);
    }
  };

  xhr.onerror = function(){
    if (item) { item.classList.remove('uploading'); item.classList.add('error'); item.querySelector('.item-status').textContent = '✗'; }
    onDone(null);
  };

  var fd = new FormData();
  fd.append('file', file);
  xhr.send(fd);
}

function createGallery(items) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/gallery');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function(){
    try {
      var d = JSON.parse(xhr.responseText);
      if (d.url) showGallery(d.url);
    } catch(e){}
  };
  xhr.send(JSON.stringify({ items: items }));
}

function showGallery(url) {
  var box = document.getElementById('galleryResult');
  document.getElementById('galleryUrl').textContent = url;
  box.style.display = 'block';
}

function copyGallery() {
  var url = document.getElementById('galleryUrl').textContent;
  var btn = document.getElementById('glCopyBtn');
  navigator.clipboard.writeText(url).then(function(){
    btn.textContent = 'Copiat ✓'; btn.classList.add('copied');
    setTimeout(function(){ btn.textContent='Copiează linkul'; btn.classList.remove('copied'); }, 2000);
  });
}

function addResult(name, url, contentType) {
  var results = document.getElementById('results');
  var div = document.createElement('div');
  div.className = 'result-item';

  var label = document.createElement('div');
  label.className = 'result-label';
  label.textContent = '✓ ' + name;

  var urlDiv = document.createElement('div');
  urlDiv.className = 'result-url';
  urlDiv.textContent = url;

  var copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = 'Copiază linkul';
  copyBtn.onclick = function(){
    navigator.clipboard.writeText(url).then(function(){
      copyBtn.textContent = 'Copiat ✓'; copyBtn.classList.add('copied');
      setTimeout(function(){ copyBtn.textContent='Copiează linkul'; copyBtn.classList.remove('copied'); }, 2000);
    });
  };

  div.appendChild(label);
  div.appendChild(urlDiv);
  div.appendChild(copyBtn);
  results.appendChild(div);
}

function showErr(msg){
  var e = document.getElementById('errGlobal');
  e.textContent = msg; e.style.display = 'block';
}
</script>
</body>
</html>`;

function galleryHTML(items) {
  const mediaItems = items.map((item, i) => {
    const u = typeof item === 'string' ? item : item.url;
    const ct = typeof item === 'string' ? 'image/jpeg' : (item.contentType || 'image/jpeg');
    const isVideo = ct.startsWith('video/');
    const mediaEl = isVideo
      ? `<video src="${u}" controls playsinline style="width:100%;display:block;max-height:200px;background:#000;"></video>`
      : `<img src="${u}" alt="Fișier ${i+1}" loading="lazy"/>`;
    return `
    <div class="media-item">
      <div class="media-wrap">${mediaEl}</div>
      <div class="media-url">${u}</div>
      <button class="copy-btn" onclick="copyUrl(this,'${u}')">Copiază linkul</button>
    </div>`;
  }).join('');

  const count = items.length;
  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Galerie – Scrisori cu Povești</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background-color:#7D1E2A;background-image:url('https://cdn.shopify.com/s/files/1/0419/4517/0084/files/Red-FloralBG-Square-2.jpg?v=1774999232');background-size:400px;font-family:'Georgia',serif;display:flex;align-items:flex-start;justify-content:center;padding:32px 16px;}
.card{background:#fff;border-radius:16px;box-shadow:0 16px 60px rgba(0,0,0,0.35);width:100%;max-width:700px;overflow:hidden;}
.card-head{background:linear-gradient(135deg,#7D1E2A,#9E2535);padding:28px 28px 24px;text-align:center;}
.card-head::after{content:'';display:block;height:18px;background:#fff;border-radius:50% 50% 0 0/18px 18px 0 0;margin:-1px -28px -1px;}
.card-head h1{color:#fff;font-size:1.4rem;font-weight:600;margin-bottom:4px;}
.card-head p{color:rgba(255,255,255,0.7);font-size:0.88rem;}
.card-body{padding:28px;}
.media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;}
.media-item{background:#faf9f7;border:1px solid #e0d5c8;border-radius:10px;overflow:hidden;padding:10px;}
.media-wrap{background:repeating-conic-gradient(#ccc 0% 25%,#fff 0% 50%) 0 0/16px 16px;border-radius:6px;overflow:hidden;margin-bottom:8px;}
.media-wrap img{width:100%;display:block;object-fit:contain;max-height:160px;}
.media-url{font-size:0.68rem;color:#888;font-family:monospace;word-break:break-all;margin-bottom:8px;line-height:1.4;}
.copy-btn{width:100%;background:#388e3c;color:#fff;border:none;border-radius:5px;padding:6px;font-size:0.8rem;cursor:pointer;}
.copy-btn:hover{background:#2e7d32;}
.copy-btn.copied{background:#1b5e20;}
</style>
</head>
<body>
<div class="card">
  <div class="card-head">
    <h1>📁 ${count} ${count === 1 ? 'fișier' : 'fișiere'}</h1>
    <p>Apasă pe „Copiază linkul" pentru fiecare fișier</p>
  </div>
  <div class="card-body">
    <div class="media-grid">${mediaItems}</div>
  </div>
</div>
<script>
function copyUrl(btn, url){
  navigator.clipboard.writeText(url).then(function(){
    btn.textContent='Copiat ✓';btn.classList.add('copied');
    setTimeout(function(){btn.textContent='Copiează linkul';btn.classList.remove('copied');},2000);
  });
}
</script>
</body>
</html>`;
}

export default {

  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET' && path === '/') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    if (request.method === 'POST' && path === '/upload') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) {
          return Response.json({ error: 'Fișier invalid. Sunt acceptate poze și videoclipuri.' }, { status: 400 });
        }

        if (file.size > 200 * 1024 * 1024) {
          return Response.json({ error: 'Fișierul e prea mare (max 200 MB).' }, { status: 400 });
        }

        const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
        const key = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

        const buffer = await file.arrayBuffer();

        await env.POZE.put(key, buffer, {
          metadata: { contentType: file.type, name: file.name }
        });

        return Response.json({
          url: 'https://' + url.hostname + '/' + key,
          contentType: file.type
        });

      } catch (e) {
        return Response.json({ error: 'Eroare server: ' + e.message }, { status: 500 });
      }
    }

    if (request.method === 'POST' && path === '/gallery') {
      try {
        const body = await request.json();
        // Support both old format (urls array) and new format (items array)
        const items = body.items || (body.urls ? body.urls.map(u => ({ url: u, contentType: 'image/jpeg' })) : null);
        if (!Array.isArray(items) || items.length === 0) {
          return Response.json({ error: 'Lista de fișiere e goală.' }, { status: 400 });
        }

        const galleryId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        const galleryKey = 'gallery-' + galleryId;

        await env.POZE.put(galleryKey, JSON.stringify(items), {
          metadata: { type: 'gallery' }
        });

        return Response.json({ url: 'https://' + url.hostname + '/g/' + galleryId });

      } catch (e) {
        return Response.json({ error: 'Eroare server: ' + e.message }, { status: 500 });
      }
    }

    if (request.method === 'GET' && path.startsWith('/g/')) {
      const galleryId = path.slice(3);
      const galleryKey = 'gallery-' + galleryId;
      const value = await env.POZE.get(galleryKey);

      if (!value) return new Response('Galerie negăsită.', { status: 404 });

      const items = JSON.parse(value);
      return new Response(galleryHTML(items), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    if (request.method === 'GET' && path.length > 1) {
      const key = path.slice(1);
      const { value, metadata } = await env.POZE.getWithMetadata(key, { type: 'arrayBuffer' });

      if (!value) return new Response('Nu a fost găsit.', { status: 404 });

      const ct = metadata?.contentType || 'application/octet-stream';
      return new Response(value, {
        headers: {
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=31536000, no-transform',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
