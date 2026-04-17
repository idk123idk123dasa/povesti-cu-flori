const HTML = `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Încarcă poze – Scrisori cu Povești</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{
  min-height:100vh;
  background-color:#7D1E2A;
  background-image:url('https://cdn.shopify.com/s/files/1/0419/4517/0084/files/Red-FloralBG-Square-2.jpg?v=1774999232');
  background-size:400px;
  font-family:'Georgia',serif;
  display:flex;align-items:center;justify-content:center;
  padding:24px 16px;
}
.card{
  background:#fff;
  border-radius:16px;
  box-shadow:0 16px 60px rgba(0,0,0,0.35);
  width:100%;max-width:480px;
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
  padding:40px 20px;
  text-align:center;
  cursor:pointer;
  transition:all 0.2s;
  background:#faf9f7;
  position:relative;
  margin-bottom:16px;
}
.drop-zone.over{border-color:#B8913A;background:#fdf8ef;}
.drop-zone input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}
.drop-icon{font-size:2.5rem;margin-bottom:10px;}
.drop-text{color:#666;font-size:0.95rem;line-height:1.6;}
.drop-text strong{color:#333;}
.drop-hint{font-size:0.78rem;color:#aaa;margin-top:4px;}

.preview{display:none;text-align:center;margin-bottom:16px;}
.preview img{max-width:100%;max-height:220px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);}
.preview-name{font-size:0.8rem;color:#888;margin-top:6px;}

.btn{
  display:block;width:100%;
  padding:13px;
  background:linear-gradient(135deg,#7D1E2A,#A0263A);
  color:#fff;font-family:'Georgia',serif;
  font-size:1rem;font-weight:600;
  border:none;border-radius:8px;cursor:pointer;
  transition:opacity 0.2s;
  margin-bottom:12px;
}
.btn:hover{opacity:0.88;}
.btn:disabled{opacity:0.5;cursor:default;}

.progress-wrap{display:none;margin-bottom:12px;}
.progress-bar{height:6px;background:#ece7df;border-radius:3px;overflow:hidden;}
.progress-fill{height:100%;background:linear-gradient(90deg,#B8913A,#D4B060);width:0%;transition:width 0.2s;}
.progress-label{font-size:0.78rem;color:#888;text-align:center;margin-top:5px;}

.result{
  display:none;
  background:#f0f9f0;
  border:1px solid #c3e6cb;
  border-radius:8px;
  padding:14px;
  margin-top:12px;
}
.result-label{font-size:0.72rem;color:#388e3c;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:6px;}
.result-url{
  font-size:0.88rem;
  color:#1a1a1a;
  word-break:break-all;
  background:#fff;
  border:1px solid #d8d0c8;
  border-radius:6px;
  padding:8px 10px;
  margin-bottom:8px;
  font-family:monospace;
}
.copy-btn{
  background:#388e3c;color:#fff;
  border:none;border-radius:5px;
  padding:6px 14px;font-size:0.82rem;
  cursor:pointer;transition:background 0.15s;
}
.copy-btn:hover{background:#2e7d32;}
.copy-btn.copied{background:#1b5e20;}

.err{
  display:none;background:#fff0f0;border:1px solid #ffcdd2;
  border-radius:8px;padding:12px;color:#c62828;
  font-size:0.88rem;margin-top:12px;
}
</style>
</head>
<body>
<div class="card">
  <div class="card-head">
    <h1>📷 Încarcă o poză</h1>
    <p>Poza va fi accesibilă printr-un link direct</p>
  </div>
  <div class="card-body">
    <div class="drop-zone" id="dropZone">
      <input type="file" id="fileInput" accept="image/*" onchange="handleFile(this.files[0])"/>
      <div class="drop-icon">🖼️</div>
      <div class="drop-text"><strong>Trage poza aici</strong><br>sau apasă să alegi un fișier</div>
      <div class="drop-hint">PNG, JPG, GIF, WebP · max 200 MB</div>
    </div>

    <div class="preview" id="preview">
      <img id="previewImg" src="" alt=""/>
      <div class="preview-name" id="previewName"></div>
    </div>

    <button class="btn" id="uploadBtn" onclick="upload()" disabled>Încarcă poza →</button>

    <div class="progress-wrap" id="progressWrap">
      <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
      <div class="progress-label" id="progressLabel">0%</div>
    </div>

    <div class="result" id="result">
      <div class="result-label">✓ Poza e online</div>
      <div class="result-url" id="resultUrl"></div>
      <button class="copy-btn" id="copyBtn" onclick="copyUrl()">Copiază linkul</button>
    </div>
    <div class="err" id="err"></div>
  </div>
</div>

<script>
var selectedFile = null;

var dz = document.getElementById('dropZone');
dz.addEventListener('dragover', function(e){ e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave', function(){ dz.classList.remove('over'); });
dz.addEventListener('drop', function(e){
  e.preventDefault(); dz.classList.remove('over');
  var f = e.dataTransfer.files[0];
  if(f) handleFile(f);
});

function handleFile(file){
  if(!file || !file.type.startsWith('image/')){ showErr('Te rugăm să alegi un fișier imagine.'); return; }
  if(file.size > 200*1024*1024){ showErr('Fișierul e prea mare (max 200 MB).'); return; }
  selectedFile = file;
  var reader = new FileReader();
  reader.onload = function(e){
    document.getElementById('previewImg').src = e.target.result;
    var mb = (file.size/1024/1024).toFixed(1);
    document.getElementById('previewName').textContent = file.name + ' (' + mb + ' MB)';
    document.getElementById('preview').style.display = 'block';
  };
  reader.readAsDataURL(file);
  document.getElementById('uploadBtn').disabled = false;
  document.getElementById('result').style.display = 'none';
  document.getElementById('err').style.display = 'none';
}

function upload(){
  if(!selectedFile) return;
  var btn = document.getElementById('uploadBtn');
  btn.disabled = true;
  document.getElementById('progressWrap').style.display = 'block';
  document.getElementById('result').style.display = 'none';
  document.getElementById('err').style.display = 'none';

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/upload');

  xhr.upload.onprogress = function(e){
    if(e.lengthComputable){
      var pct = Math.round(e.loaded/e.total*100);
      document.getElementById('progressFill').style.width = pct + '%';
      document.getElementById('progressLabel').textContent = pct + '%';
    }
  };

  xhr.onload = function(){
    document.getElementById('progressWrap').style.display = 'none';
    try {
      var d = JSON.parse(xhr.responseText);
      if(d.url){
        document.getElementById('resultUrl').textContent = d.url;
        document.getElementById('result').style.display = 'block';
      } else {
        showErr(d.error || 'Eroare la încărcare.');
        btn.disabled = false;
      }
    } catch(e){
      showErr('Eroare server.');
      btn.disabled = false;
    }
  };

  xhr.onerror = function(){
    document.getElementById('progressWrap').style.display = 'none';
    showErr('Eroare de rețea. Încearcă din nou.');
    btn.disabled = false;
  };

  var fd = new FormData();
  fd.append('file', selectedFile);
  xhr.send(fd);
}

function copyUrl(){
  var url = document.getElementById('resultUrl').textContent;
  navigator.clipboard.writeText(url).then(function(){
    var b = document.getElementById('copyBtn');
    b.textContent = 'Copiat ✓'; b.classList.add('copied');
    setTimeout(function(){ b.textContent='Copiază linkul'; b.classList.remove('copied'); }, 2000);
  });
}

function showErr(msg){
  var e = document.getElementById('err');
  e.textContent = msg; e.style.display = 'block';
}
</script>
</body>
</html>`;

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

        if (!file || !file.type.startsWith('image/')) {
          return Response.json({ error: 'Fișier invalid.' }, { status: 400 });
        }

        if (file.size > 200 * 1024 * 1024) {
          return Response.json({ error: 'Fișierul e prea mare (max 200 MB).' }, { status: 400 });
        }

        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const key = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

        // Chunked base64 to avoid stack overflow on large files
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunk = 8192;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const base64 = btoa(binary);

        await env.POZE.put(key, base64, {
          metadata: { contentType: file.type, name: file.name }
        });

        return Response.json({ url: 'https://' + url.hostname + '/' + key });

      } catch (e) {
        return Response.json({ error: 'Eroare server: ' + e.message }, { status: 500 });
      }
    }

    if (request.method === 'GET' && path.length > 1) {
      const key = path.slice(1);
      const { value, metadata } = await env.POZE.getWithMetadata(key);

      if (!value) return new Response('Nu a fost găsit.', { status: 404 });

      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      return new Response(bytes, {
        headers: {
          'Content-Type': metadata?.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000',
        }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
