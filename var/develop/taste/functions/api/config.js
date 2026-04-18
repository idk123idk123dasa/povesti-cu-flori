export async function onRequestGet(context) {
  const { env } = context;
  const kmStr = await env.SOUNDS.get('keymap');
  const keyMap = kmStr ? JSON.parse(kmStr) : {};
  return new Response(JSON.stringify({ keyMap }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Upload-Key, Content-Type' };
}
