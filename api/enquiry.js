// POST /api/enquiry
// Public endpoint used by the booking modal and the enquiry form on the main site.
// Saves the submission to Supabase. Never exposes the service key to the browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase env vars');
    // Fail soft: the customer-facing flow (WhatsApp) still works even if this fails.
    return res.status(200).json({ ok: false, saved: false });
  }

  const body = req.body || {};
  const {
    type,            // 'booking' or 'enquiry'
    name,
    phone,
    email,
    package_name,
    travelers,
    preferred_month,
    message
  } = body;

  if (!name || !phone || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/enquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        type,
        name,
        phone,
        email: email || null,
        package_name: package_name || null,
        travelers: travelers ? Number(travelers) : null,
        preferred_month: preferred_month || null,
        message: message || null
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Supabase insert failed', resp.status, text);
      return res.status(200).json({ ok: false, saved: false });
    }

    return res.status(200).json({ ok: true, saved: true });
  } catch (err) {
    console.error('Enquiry save error', err);
    // Fail soft — never block the WhatsApp flow for the customer.
    return res.status(200).json({ ok: false, saved: false });
  }
}
