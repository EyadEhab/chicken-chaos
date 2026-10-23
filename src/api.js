const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
const trim = (s) => (s || "").trim().replace(/\/+$/, "");
const EP = trim(env.VITE_APPWRITE_ENDPOINT);
const PROJ = (env.VITE_APPWRITE_PROJECT || "").trim();
const DBID = (env.VITE_APPWRITE_DATABASE || "").trim();
const COLID = (env.VITE_APPWRITE_COLLECTION || "").trim();

export const live = Boolean(EP && PROJ && DBID && COLID);

const base = () => `${EP}/databases/${DBID}/collections/${COLID}/documents`;

const headers = () => ({
  "content-type": "application/json",
  "X-Appwrite-Project": PROJ,
});

// document ids may only contain a-zA-Z0-9_- and max 36 chars
export const docIdFor = (name) =>
  [...String(name)]
    .map((c) => (/[a-zA-Z0-9_-]/.test(c) ? c : "_" + c.charCodeAt(0).toString(16) + "_"))
    .join("")
    .slice(0, 36);

async function call(url, opts) {
  const r = await fetch(url, { ...opts, headers: headers() });
  if (r.ok) return r.json();
  let msg = "HTTP " + r.status;
  try {
    const e = await r.json();
    if (e && e.message) msg = e.message;
  } catch {}
  throw new Error(msg);
}

// this Appwrite build wants query objects as JSON, not the `limit(6)` string syntax
const query = (obj) => "queries%5B%5D=" + encodeURIComponent(JSON.stringify(obj));

export async function fetchTop(limit = 60) {
  if (!live) return [];
  const qs = [
    query({ method: "orderDesc", attribute: "score" }),
    query({ method: "limit", values: [Math.min(100, Math.max(1, limit))] }),
  ].join("&");
  const data = await call(`${base()}?${qs}`);
  return (data.documents || []).map((d) => ({ n: d.name, best: Number(d.score) || 0 }));
}

export async function submitScore(name, score) {
  if (!live) return false;
  const id = docIdFor(name);
  const data = { name: String(name).slice(0, 24), score: Math.round(score) };
  const url = `${base()}/${id}`;

  let doc = null;
  try {
    doc = await call(url, { method: "GET" });
  } catch {
    doc = null;
  }

  if (doc) {
    if ((Number(doc.score) || 0) >= data.score) return false; // remote is already better
    try {
      await call(url, { method: "PATCH", body: JSON.stringify({ data }) });
      return true;
    } catch {
      return false;
    }
  }

  try {
    await call(base(), { method: "POST", body: JSON.stringify({ documentId: id, data }) });
    return true;
  } catch {
    return false;
  }
}

export function mergeBoards(local, remote) {
  const m = new Map();
  for (const [n, v] of Object.entries(local || {})) m.set(n, Number(v.best) || 0);
  for (const r of remote || []) m.set(r.n, Math.max(m.get(r.n) || 0, r.best || 0));
  return [...m].map(([n, best]) => ({ n, best })).sort((a, b) => b.best - a.best);
}
