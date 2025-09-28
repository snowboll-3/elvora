export const onRequestPost = async ({ request, env }) => {
  try {
    const payload = await request.json();
    const id = `scan:${Date.now()}:${crypto.randomUUID()}`;
    if (!env.ELVORA_SCANS) {
      return new Response(JSON.stringify({ ok:false, error:"KV binding ELVORA_SCANS missing" }), {
        status:500, headers:{ "content-type":"application/json" }
      });
    }
    await env.ELVORA_SCANS.put(id, JSON.stringify(payload));
    return new Response(JSON.stringify({ ok:true }), { headers:{ "content-type":"application/json" }});
  } catch {
    return new Response(JSON.stringify({ ok:false, error:"Bad payload" }), { status:400, headers:{ "content-type":"application/json" }});
  }
};
