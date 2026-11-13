import { json, getUser, getSubscription } from './_shared.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(res, 503, { error: 'AI is not connected yet. Add ANTHROPIC_API_KEY in your hosting environment to activate coaching.' });
  try {
    const { system, prompt, premium = false, requiredPlan = 'starter' } = req.body || {};
    if (!system || !prompt) return json(res, 400, { error: 'Missing coaching instructions.' });
    if (premium) {
      const user = await getUser(req);
      if (!user?.id) return json(res, 401, { error: 'Sign in to use premium coaching.' });
      const subscription = await getSubscription(user.id);
      const active = !!subscription && subscription.status === 'active' && new Date(subscription.current_period_end).getTime() > Date.now();
      if (!active) return json(res, 403, { error: 'An active paid plan is required for this feature. Choose a plan to continue.' });
      if (requiredPlan === 'professional' && !['professional','business'].includes(subscription.plan)) {
        return json(res, 403, { error: 'Weekly AI coaching check-ins are included with Professional and Business plans. Upgrade to continue.' });
      }
    }
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest', max_tokens: 4500, system, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await upstream.json();
    if (!upstream.ok) return json(res, upstream.status, { error: data.error?.message || 'AI provider request failed.' });
    const text = (data.content || []).filter(item => item.type === 'text').map(item => item.text).join('\n');
    return json(res, 200, { text });
  } catch (error) {
    return json(res, 500, { error: 'The AI service encountered an error. Please try again.' });
  }
}
