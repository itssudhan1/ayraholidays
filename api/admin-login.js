// POST /api/admin-login
// Checks the submitted password against ADMIN_PASSWORD env var.
// The client stores the password itself (in sessionStorage) after a successful
// check, and re-sends it as the x-admin-key header on every subsequent admin
// API call, where it is re-validated. Simple, no session store needed.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Admin password not configured on server' });
  }

  const { password } = req.body || {};
  if (password && password === ADMIN_PASSWORD) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: 'Incorrect password' });
}
