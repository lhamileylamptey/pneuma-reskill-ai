import { json, PRICE_USD } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  return json(res, 200, {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    prices: PRICE_USD,
    currencyDisplay: 'USD',
    checkoutCurrency: 'GHS'
  });
}
