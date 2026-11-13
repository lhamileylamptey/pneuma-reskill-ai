import crypto from 'node:crypto';
import { json, saveSubscription, getSubscription, periodEnd } from './_shared.js';

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return json(res, 503, { error: 'Webhook is not configured.' });
  try {
    const body = await rawBody(req);
    const signature = req.headers['x-paystack-signature'];
    const expected = crypto.createHmac('sha512', secret).update(body).digest('hex');
    if (!signature || Buffer.byteLength(signature) !== Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return json(res, 401, { error: 'Invalid webhook signature.' });
    const event = JSON.parse(body.toString('utf8'));
    const data = event.data || {};
    const metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : (data.metadata || {});
    if (event.event === 'charge.success') {
      let existing = null;
      if (metadata.user_id) existing = await getSubscription(metadata.user_id);
      if (!existing && data.customer?.email) {
        const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const q = await fetch(`${url}/rest/v1/subscriptions?email=eq.${encodeURIComponent(data.customer.email)}&select=*`, {headers:{apikey:key,Authorization:`Bearer ${key}`}});
        const rows = q.ok ? await q.json() : []; existing = rows[0] || null;
      }
      const cycle = metadata.cycle || existing?.billing_cycle || 'monthly';
      const tier = metadata.tier || existing?.plan;
      const userId = metadata.user_id || existing?.user_id;
      if (userId && tier && ['starter','professional','business'].includes(tier)) {
        await saveSubscription({
          ...(existing || {}), user_id: userId, email: metadata.email || data.customer?.email || existing?.email,
          plan: tier, billing_cycle: cycle, status: 'active', cancel_at_period_end: false, current_period_end: periodEnd(cycle),
          paystack_customer_code: data.customer?.customer_code || existing?.paystack_customer_code || null,
          paystack_subscription_code: data.subscription?.subscription_code || existing?.paystack_subscription_code || null,
          last_payment_reference: data.reference || existing?.last_payment_reference || null,
          updated_at: new Date().toISOString()
        });
      }
    }
    if (event.event === 'invoice.payment_failed' || event.event === 'subscription.disable') {
      const email = data.customer?.email || data.customer?.customer_email;
      if (email) {
        const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const q = await fetch(`${url}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}&select=*`, {headers:{apikey:key,Authorization:`Bearer ${key}`}});
        const rows = q.ok ? await q.json() : [];
        if (rows[0]) await saveSubscription({...rows[0], status:event.event === 'invoice.payment_failed'?'past_due':'active', cancel_at_period_end:event.event === 'subscription.disable' ? true : (rows[0].cancel_at_period_end || false), updated_at:new Date().toISOString()});
      }
    }
    return json(res, 200, { received: true });
  } catch (error) {
    return json(res, 400, { error: 'Webhook processing failed.' });
  }
}
