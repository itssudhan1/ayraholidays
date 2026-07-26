import { requireAdmin } from './_lib/auth.js';

function supaHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  if (!SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  try {
    if (req.method === 'GET') {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/enquiries?select=*&order=created_at.desc&limit=200`,
        { headers: supaHeaders() }
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Supabase fetch failed (${resp.status}): ${text}`);
      }
      const rows = await resp.json();
      return res.status(200).json({ rows });
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body || {};
      if (!id || !status) {
        return res.status(400).json({ error: 'Expected { id, status }' });
      }
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/enquiries?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...supaHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify({ status })
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Supabase update failed (${resp.status}): ${text}`);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
