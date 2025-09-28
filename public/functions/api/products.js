export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return json({ ok:false, error:"Missing code" }, 400);

  // 1) lokalna baza (ako postoji)
  try {
    const local = await fetch(new URL("/api/products.json", url.origin))
      .then(r => r.ok ? r.json() : null).catch(()=>null);
    if (local && local[code]) {
      return json({ ok:true, source:"local", product: { code, ...local[code] }});
    }
  } catch {}

  // 2) OpenFoodFacts
  try {
    const off = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
    if (off.ok) {
      const j = await off.json();
      if (j && j.product) {
        const name = j.product.product_name || j.product.generic_name || null;
        return json({ ok:true, source:"off", product:{ code, name: name || null, brand: j.product.brands || null }});
      }
    }
  } catch {}

  // 3) fallback naziv
  return json({ ok:true, source:"fallback", product:{ code, name: `Item ${code.slice(-4)} (temp)` }});
};

function json(obj, status=200){
  return new Response(JSON.stringify(obj), { status, headers: { "content-type":"application/json" }});
}
