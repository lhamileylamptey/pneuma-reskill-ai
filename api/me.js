import { json, getUser, getSubscription } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await getUser(req);
  if (!user?.id) return json(res, 401, { error: 'Please sign in.' });
  try {
    const subscription = await getSubscription(user.id);
    const premium = !!subscription && subscription.status === 'active' && new Date(subscription.current_period_end).getTime() > Date.now();
    return json(res, 200, { user: { id: user.id, email: user.email }, premium, subscription: premium ? subscription : null });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Could not load account status.' });
  }
}
