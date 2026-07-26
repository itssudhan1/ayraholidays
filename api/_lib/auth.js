export function requireAdmin(req, res) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const provided = req.headers['x-admin-key'];
  if (!ADMIN_PASSWORD || !provided || provided !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
