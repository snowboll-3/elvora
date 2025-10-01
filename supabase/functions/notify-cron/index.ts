import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL")!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false }});

async function sendResend(to_email: string, to_name: string | null, subject: string, html: string | null, text: string | null) {
  const body: any = { from: FROM_EMAIL, to: [to_name ? `${to_name} <${to_email}>` : to_email], subject: subject || "(no subject)" };
  if (html) body.html = html;
  if (text) body.text = text;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return await res.json();
}

Deno.serve(async () => {
  const diag: any = {
    env: {
      has_SUPABASE_URL: !!SUPABASE_URL,
      has_SERVICE_ROLE_KEY: !!SERVICE_KEY,
      has_RESEND_API_KEY: !!RESEND_API_KEY,
      has_FROM_EMAIL: !!FROM_EMAIL,
    },
    pending_count: 0,
    processed: 0,
    errors: [] as string[],
    ids: [] as string[],
  };

  try {
    const { data: rows, error } = await sb
      .from("outbox")
      .select("id,to_email,to_name,subject,html,text")
      .in("status", ["pending","PENDING","Pending"])
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) throw error;
    diag.pending_count = rows?.length || 0;

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, ...diag }), { headers: { "Content-Type": "application/json" }});
    }

    for (const r of rows) {
      diag.ids.push(r.id);
      try {
        if (!r.to_email) throw new Error("to_email missing");
        await sendResend(r.to_email, r.to_name ?? null, r.subject ?? "(no subject)", r.html ?? null, r.text ?? null);

        const { error: updErr } = await sb
          .from("outbox")
          .update({ status: "sent", sent_at: new Date().toISOString(), error_msg: null })
          .eq("id", r.id);

        if (updErr) throw updErr;
        diag.processed++;
      } catch (e) {
        diag.errors.push(`${r.id}: ${String(e)}`);
        await sb
          .from("outbox")
          .update({ status: "error", error_msg: String(e) })
          .eq("id", r.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...diag }), { headers: { "Content-Type": "application/json" }});
  } catch (e) {
    diag.errors.push(String(e));
    return new Response(JSON.stringify({ ok: false, ...diag }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
