// Room logic - WebRTC screen sharing via PeerJS public broker
// Each room supports up to MAX_SLOTS participants. Each peer claims a slot ID
// like fitgo-share-room-<N>-slot-<i>, then calls every other slot.

const ROOM_ID = window.ROOM_ID;
const MAX_SLOTS = 8;
const SLOT_PREFIX = `fitgo-share-room-${ROOM_ID}-slot-`;

const statusEl = document.getElementById('status');
const grid = document.getElementById('grid');
const startBtn = document.getElementById('startBtn');

let peer = null;
let mySlot = null;
let localStream = null;
const activeCalls = new Map(); // peerId -> call
const videoTiles = new Map();  // peerId -> tile element

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = 'status ' + (kind || '');
}

function makeTile(label, isSelf) {
  const tile = document.createElement('div');
  tile.className = 'tile' + (isSelf ? ' self' : '');
  const v = document.createElement('video');
  v.autoplay = true;
  v.playsInline = true;
  if (isSelf) v.muted = true;
  const lbl = document.createElement('div');
  lbl.className = 'label';
  lbl.textContent = label;
  tile.appendChild(v);
  tile.appendChild(lbl);
  grid.appendChild(tile);
  return { tile, video: v };
}

function removeTile(peerId) {
  const t = videoTiles.get(peerId);
  if (t) {
    t.tile.remove();
    videoTiles.delete(peerId);
  }
  if (videoTiles.size === 0) showWaiting();
}

function showWaiting() {
  if (document.getElementById('waiting')) return;
  const div = document.createElement('div');
  div.id = 'waiting';
  div.className = 'waiting';
  div.innerHTML = '<div class="big">Partajezi ecranul</div>' +
    '<div class="sub">Trimite linkul <b>' + location.href + '</b> celui cu care vrei sa partajezi.</div>' +
    '<div class="sub">Cand intra el si apasa "Partajeaza ecranul", o sa ii vezi ecranul aici.</div>';
  grid.appendChild(div);
}

function hideWaiting() {
  const w = document.getElementById('waiting');
  if (w) w.remove();
}

async function captureScreen() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 30, max: 60 } },
    audio: true
  });
  // when user stops sharing via browser UI, end session
  stream.getVideoTracks()[0].addEventListener('ended', () => {
    location.reload();
  });
  return stream;
}

function tryClaimSlot(slotIndex) {
  return new Promise((resolve) => {
    const id = SLOT_PREFIX + slotIndex;
    const p = new Peer(id, { debug: 0 });
    let settled = false;
    p.on('open', () => {
      if (settled) return;
      settled = true;
      resolve({ ok: true, peer: p, slotIndex });
    });
    p.on('error', (err) => {
      if (settled) return;
      settled = true;
      try { p.destroy(); } catch (e) {}
      // 'unavailable-id' means slot taken - try next
      resolve({ ok: false, err });
    });
  });
}

async function claimAnySlot() {
  for (let i = 1; i <= MAX_SLOTS; i++) {
    setStatus(`Caut un slot liber... (${i}/${MAX_SLOTS})`);
    const res = await tryClaimSlot(i);
    if (res.ok) return res;
  }
  return null;
}

function attachCall(call, isOutgoing) {
  const remoteId = call.peer;
  if (activeCalls.has(remoteId)) {
    // already connected - close duplicate
    try { call.close(); } catch (e) {}
    return;
  }
  activeCalls.set(remoteId, call);

  hideWaiting();
  const slotNum = remoteId.replace(SLOT_PREFIX, '');
  const tile = makeTile(`Slot ${slotNum}`, false);
  videoTiles.set(remoteId, tile);

  call.on('stream', (remoteStream) => {
    tile.video.srcObject = remoteStream;
  });
  call.on('close', () => {
    activeCalls.delete(remoteId);
    removeTile(remoteId);
  });
  call.on('error', () => {
    activeCalls.delete(remoteId);
    removeTile(remoteId);
  });
}

function callOthers() {
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (i === mySlot) continue;
    const otherId = SLOT_PREFIX + i;
    if (activeCalls.has(otherId)) continue;
    const call = peer.call(otherId, localStream);
    if (call) {
      // give it a beat - if no answer, peer probably doesn't exist; cleanup
      let gotStream = false;
      call.on('stream', () => { gotStream = true; attachCall(call, true); });
      setTimeout(() => {
        if (!gotStream) {
          try { call.close(); } catch (e) {}
        }
      }, 4000);
    }
  }
}

async function start() {
  startBtn.disabled = true;
  setStatus('Cer permisiune pentru ecran...');
  try {
    localStream = await captureScreen();
  } catch (e) {
    setStatus('Permisiune refuzata. Reincarca pagina si apasa din nou.', 'err');
    startBtn.disabled = false;
    return;
  }

  // empty placeholder shown while waiting for others
  showWaiting();
  setStatus('Conectare la server...');
  const claim = await claimAnySlot();
  if (!claim) {
    setStatus('Camera este plina (max ' + MAX_SLOTS + ' persoane).', 'err');
    return;
  }
  peer = claim.peer;
  mySlot = claim.slotIndex;
  setStatus(`Conectat. Esti slot ${mySlot}. Partajeaza linkul cu cine vrei sa vada.`, 'ok');

  startBtn.style.display = 'none';

  peer.on('call', (call) => {
    call.answer(localStream);
    attachCall(call, false);
  });

  peer.on('disconnected', () => {
    setStatus('Deconectat de la server. Incerc reconectarea...', 'warn');
    try { peer.reconnect(); } catch (e) {}
  });

  peer.on('error', (err) => {
    if (err.type === 'peer-unavailable') {
      // expected when calling empty slots
      return;
    }
    console.warn('peer error', err);
  });

  // call existing peers
  callOthers();
  // periodically retry calling others (so new joiners see us via their own call)
  setInterval(callOthers, 5000);
}

startBtn.addEventListener('click', start);

// auto-prompt on load (browser requires gesture though; click is needed)
window.addEventListener('load', () => {
  setStatus('Apasa butonul pentru a partaja ecranul.');
});
