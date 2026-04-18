const ROWS = [
  ['1','2','3','4','5','6','7','8','9','0','-','='],
  ['q','w','e','r','t','y','u','i','o','p','[',']'],
  ['a','s','d','f','g','h','j','k','l',';',"'"],
  ['z','x','c','v','b','n','m',',','.','/',]
];

let keyMap = {};     // key → {key, sound, label, filename}
const audioCache = {};

async function loadConfig() {
  try {
    const r = await fetch('/api/config');
    if (r.ok) {
      const data = await r.json();
      keyMap = data.keyMap || {};
    }
  } catch { keyMap = {}; }
}

function buildKeyboard() {
  const container = document.getElementById('keyboard-container');
  container.innerHTML = '';
  ROWS.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'key-row';
    row.forEach(k => {
      const el = document.createElement('div');
      el.className = 'key' + (keyMap[k] ? ' has-sound' : ' no-sound');
      el.dataset.key = k;

      const label = document.createElement('span');
      label.className = 'key-label';
      label.textContent = k;

      el.appendChild(label);
      el.addEventListener('mousedown', () => playKey(k));
      rowEl.appendChild(el);
    });
    container.appendChild(rowEl);
  });
}

function playKey(key) {
  const entry = keyMap[key];
  if (!entry) return;

  if (!audioCache[key]) audioCache[key] = new Audio(entry.sound);
  const audio = audioCache[key];
  audio.currentTime = 0;
  audio.play().catch(() => {});

  const keyEl = document.querySelector(`.key[data-key="${key}"]`);
  if (keyEl) {
    keyEl.classList.add('active');
    audio.onended = () => keyEl.classList.remove('active');
  }

  const np = document.getElementById('now-playing');
  const npl = document.getElementById('now-playing-label');
  npl.textContent = `\u266a ${entry.label}`;
  np.classList.remove('hidden');
  clearTimeout(np._hide);
  np._hide = setTimeout(() => np.classList.add('hidden'), 2000);
}

document.addEventListener('keydown', e => {
  if (e.repeat || e.target.tagName === 'INPUT') return;
  playKey(e.key.toLowerCase());
});

document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  const el = document.querySelector(`.key[data-key="${k}"]`);
  if (el) {
    const audio = audioCache[k];
    if (!audio || audio.ended || audio.paused) el.classList.remove('active');
  }
});

function makeStars() {
  const container = document.getElementById('stars');
  const rnd = (a, b) => (Math.random() * (b - a) + a).toFixed(1);
  const rndpx = (max) => `${(Math.random() > 0.5 ? 1 : -1) * (Math.random() * max + 5).toFixed(0)}px`;
  for (let i = 0; i < 150; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.5 + 0.4;
    s.style.cssText = [
      `width:${size}px`, `height:${size}px`,
      `left:${rnd(0,100)}%`, `top:${rnd(0,100)}%`,
      `--dur:${rnd(2,5)}s`, `--delay:-${rnd(0,6)}s`,
      `--drift-dur:${rnd(25,70)}s`, `--drift-delay:-${rnd(0,40)}s`,
      `--dx1:${rndpx(30)}`, `--dy1:${rndpx(20)}`,
      `--dx2:${rndpx(25)}`, `--dy2:${rndpx(30)}`,
      `--dx3:${rndpx(20)}`, `--dy3:${rndpx(15)}`,
    ].join(';');
    container.appendChild(s);
  }
}

(async () => {
  makeStars();
  await loadConfig();
  buildKeyboard();
})();
