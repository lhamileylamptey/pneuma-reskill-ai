import { json, getUser, saveSubscription, periodEnd, planEnvKey } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const user = await getUser(req);
  if (!user?.id) return json(res, 401, { error: 'Sign in again to verify your payment.' });
  const { reference } = req.body || {};
  if (!reference || !/^[a-zA-Z0-9.=\-_]+$/.test(reference)) return json(res, 400, { error: 'A valid payment reference is required.' });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return json(res, 503, { error: 'Paystack has not been configured.' });
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }
    });
    const result = await response.json();
    if (!response.ok || !result.status || result.data?.status !== 'success') return json(res, 402, { error: 'Payment has not been confirmed as successful.' });
    const tx = result.data;
    const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : (tx.metadata || {});
    if (meta.user_id !== user.id) return json(res, 403, { error: 'This payment reference does not belong to the signed-in account.' });
    if (!['starter','professional','business'].includes(meta.tier) || !['monthly','annually'].includes(meta.cycle)) return json(res, 400, { error: 'Payment plan details could not be verified.' });
    const expectedPlanCode = process.env[planEnvKey(meta.tier, meta.cycle)];
    if (tx.currency !== 'GHS' || (tx.plan_object?.plan_code && expectedPlanCode && tx.plan_object.plan_code !== expectedPlanCode)) {
      return json(res, 403, { error: 'The verified payment does not match the selected Pneuma plan.' });
    }
    const record = await saveSubscription({
      user_id: user.id, email: user.email, plan: meta.tier, billing_cycle: meta.cycle,
      status: 'active', cancel_at_period_end: false, current_period_end: periodEnd(meta.cycle),
      paystack_customer_code: tx.customer?.customer_code || null,
      paystack_subscription_code: tx.subscription?.subscription_code || null,
      last_payment_reference: reference, updated_at: new Date().toISOString()
    });
    return json(res, 200, { verified: true, subscription: record });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Payment verification failed.' });
  }
}
