export const onRequestGet = async ({ env }) => {
  const status = { ok: true, checks: {} };
  try {
    const r = await fetch("https://world.openfoodfacts.org");
    status.checks.off = r.ok;
  } catch { status.checks.off = false; status.ok = false; }

  try {
    if (!env.ELVORA_SCANS) throw new Error("KV missing");
    await env.ELVORA_SCANS.put("health:ping", String(Date.now()), { expirationTtl: 60 });
    status.checks.kv = true;
  } catch { status.checks.kv = false; status.ok = false; }

  return new Response(JSON.stringify(status), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
};
