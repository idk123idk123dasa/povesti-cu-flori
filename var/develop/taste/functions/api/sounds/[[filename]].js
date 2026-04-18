export async function onRequestGet(context) {
  const { params, env } = context;
  const filename = Array.isArray(params.filename) ? params.filename.join('/') : params.filename;
  // filename like "1234567890.mp3" → id is the part before dot
  const id = filename.split('.')[0];

  const { value: buf, metadata } = await env.SOUNDS.getWithMetadata(`sound:${id}`, { type: 'arrayBuffer' });
  if (!buf) return new Response('Not found', { status: 404 });

  return new Response(buf, {
    headers: {
      'Content-Type': metadata?.contentType || 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${metadata?.filename || filename}"`,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
