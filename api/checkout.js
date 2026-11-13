import { json, getUser, planEnvKey } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const user = await getUser(req);
  if (!user?.id || !user.email) return json(res, 401, { error: 'Please sign in before subscribing.' });
  const { tier, cycle } = req.body || {};
  if (!['starter', 'professional', 'business'].includes(tier) || !['monthly', 'annually'].includes(cycle)) {
    return json(res, 400, { error: 'Select a valid plan and billing period.' });
  }
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const planCode = process.env[planEnvKey(tier, cycle)];
  const siteUrl = process.env.SITE_URL;
  if (!secret || !planCode || !siteUrl) {
    return json(res, 503, { error: 'Paystack is not configured yet. Complete the Paystack plan codes and SITE_URL in the deployment settings.' });
  }
  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        plan: planCode,
        currency: 'GHS',
        callback_url: `${siteUrl.replace(/\/$/, '')}/payment-success.html`,
        channels: ['card'],
        metadata: JSON.stringify({
          product: 'Pneuma Reskill AI', user_id: user.id, email: user.email,
          tier, cycle, displayed_price_usd: ({starter:{monthly:'9.99',annually:'99'},professional:{monthly:'19.99',annually:'199'},business:{monthly:'39.99',annually:'399'}})[tier][cycle]
        })
      })
    });
    const data = await response.json();
    if (!response.ok || !data.status) return json(res, 502, { error: data.message || 'Paystack could not start checkout.' });
    return json(res, 200, { authorization_url: data.data.authorization_url, reference: data.data.reference });
  } catch (error) {
    return json(res, 500, { error: 'Could not connect to Paystack. Please try again.' });
  }
}
