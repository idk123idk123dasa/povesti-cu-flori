export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  const webhook = env.DISCORD_WEBHOOK;
  if (!webhook) {
    return new Response('not configured', { status: 500 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }
  const r = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return new Response(null, { status: r.status });
}
