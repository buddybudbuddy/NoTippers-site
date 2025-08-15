// /api/verify-turnstile.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get token from JSON body (Vercel parses req.body for application/json)
    let token = req.body?.token;

    // Fallback: if body came in as a raw string, try to parse it
    if (!token && typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        token = parsed.token;
      } catch {}
    }

    if (!token) {
      return res.status(400).json({ success: false, error: 'Missing token' });
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return res.status(500).json({ success: false, error: 'Missing TURNSTILE_SECRET_KEY' });
    }

    // Prepare verification request to Cloudflare
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);

    // Optional: pass user IP if available
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      undefined;
    if (ip) formData.append('remoteip', ip);

    const cfRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    const data = await cfRes.json();

    if (!data.success) {
      // Cloudflare returns error-codes array; surface it for debugging
      return res.status(400).json({
        success: false,
        error: 'Turnstile verification failed',
        codes: data['error-codes'] || []
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}