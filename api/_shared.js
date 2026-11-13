export function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(body);
}

export async function getUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return null;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return null;
  return response.json();
}

export async function getSubscription(userId) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server configuration is incomplete.');
  const endpoint = `${url}/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=*`;
  const response = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!response.ok) throw new Error('Could not read subscription status.');
  const rows = await response.json();
  return rows[0] || null;
}

export async function saveSubscription(record) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server configuration is incomplete.');
  const response = await fetch(`${url}/rest/v1/subscriptions?on_conflict=user_id`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(record)
  });
  if (!response.ok) throw new Error(`Could not save subscription (${response.status}).`);
  const rows = await response.json();
  return rows[0] || record;
}

export function periodEnd(cycle, from = new Date()) {
  const date = new Date(from);
  if (cycle === 'annually') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

export const PRICE_USD = {
  starter: { monthly: 9.99, annually: 99 },
  professional: { monthly: 19.99, annually: 199 },
  business: { monthly: 39.99, annually: 399 }
};

export function planEnvKey(tier, cycle) {
  return `PAYSTACK_PLAN_${tier.toUpperCase()}_${cycle.toUpperCase()}`;
}
