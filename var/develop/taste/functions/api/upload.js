export async function onRequestPost(context) {
  const { request, env } = context;

  const auth = request.headers.get('X-Upload-Key');
  if (auth !== env.UPLOAD_KEY) return json({ error: 'Unauthorized' }, 401);

  let form;
  try { form = await request.formData(); } catch { return json({ error: 'Invalid form data' }, 400); }

  const file = form.get('file');
  const key = (form.get('key') || '').trim().toLowerCase();

  if (!file) return json({ error: 'Lipsește fișierul' }, 400);
  if (!key) return json({ error: 'Lipsește cheia' }, 400);

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return json({ error: 'Format nesuportat. Folosiți mp3, wav, ogg sau m4a.' }, 400);
  }

  const buf = await file.arrayBuffer();
  if (buf.byteLength > 20 * 1024 * 1024) return json({ error: 'Max 20MB per fișier' }, 400);

  const filename = `${key}.${ext}`;
  const kvKey = `sound:${key}`;

  await env.SOUNDS.put(kvKey, buf, {
    metadata: { filename, contentType: file.type || `audio/${ext}`, label: key.toUpperCase() }
  });

  const kmStr = await env.SOUNDS.get('keymap');
  const keyMap = kmStr ? JSON.parse(kmStr) : {};
  keyMap[key] = { key, filename, label: key.toUpperCase(), sound: `/api/sounds/${filename}` };
  await env.SOUNDS.put('keymap', JSON.stringify(keyMap));

  return json({ ok: true, key, filename });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const auth = request.headers.get('X-Upload-Key');
  if (auth !== env.UPLOAD_KEY) return json({ error: 'Unauthorized' }, 401);

  const { key } = await request.json();
  if (!key) return json({ error: 'Missing key' }, 400);

  await env.SOUNDS.delete(`sound:${key}`);

  const kmStr = await env.SOUNDS.get('keymap');
  const keyMap = kmStr ? JSON.parse(kmStr) : {};
  delete keyMap[key];
  await env.SOUNDS.put('keymap', JSON.stringify(keyMap));

  return json({ ok: true });
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}
function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Upload-Key, Content-Type' };
}
