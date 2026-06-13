// POST /api/contact — primeste {name, email, subject, message} de pe formularul de contact
// si posteaza pe Discord (acelasi webhook unde ajung si comenzile).

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  let payload;
  try { payload = await request.json(); }
  catch { return json({ ok: false, error: 'bad json' }, 400); }

  const name    = String(payload.name    || '').trim().slice(0, 200);
  const fromEm  = String(payload.email   || '').trim().slice(0, 200);
  const subject = String(payload.subject || 'Mesaj de pe site').trim().slice(0, 200);
  const message = String(payload.message || '').trim().slice(0, 5000);

  if (!name || !fromEm || !message) {
    return json({ ok: false, error: 'campuri lipsa' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEm)) {
    return json({ ok: false, error: 'email invalid' }, 400);
  }

  if (!env.DISCORD_WEBHOOK) {
    return json({ ok: false, error: 'discord webhook not configured' }, 500);
  }

  const content =
    `**📩 Mesaj nou de contact**\n` +
    `**Nume:** ${name}\n` +
    `**Email:** ${fromEm}\n` +
    `**Subiect:** ${subject}\n\n` +
    message;

  try {
    const r = await fetch(env.DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (!r.ok) {
      return json({ ok: false, error: `discord ${r.status}` }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 502);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
