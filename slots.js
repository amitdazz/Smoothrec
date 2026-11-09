// Cloudflare Pages Function: GET /api/slots -> {"claimed": N}; POST (Bearer ADMIN_TOKEN) sets it.
// Needs a KV binding named SLOTS and a secret named ADMIN_TOKEN (see README.md).
const TOTAL = 100;
const KEY = "claimed";
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

function safeEqual(a, b) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function onRequestGet({ env }) {
  const raw = env.SLOTS ? await env.SLOTS.get(KEY) : null;
  const n = Math.max(0, Math.min(TOTAL, Math.round(Number(raw)) || 0));
  return json({ claimed: n });
}

export async function onRequestPost({ request, env }) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!env.ADMIN_TOKEN || !token || !safeEqual(token, env.ADMIN_TOKEN)) return json({ error: "unauthorized" }, 401);
  if (!env.SLOTS) return json({ error: "KV binding SLOTS is missing" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ error: "invalid json" }, 400); }
  const n = Math.round(Number(body && body.claimed));
  if (!Number.isFinite(n)) return json({ error: "claimed must be a number" }, 400);
  const clamped = Math.max(0, Math.min(TOTAL, n));
  await env.SLOTS.put(KEY, String(clamped));
  return json({ claimed: clamped });
}

export const onRequest = () => json({ error: "method not allowed" }, 405);
