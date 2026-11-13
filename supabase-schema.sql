-- Run this in Supabase SQL Editor before connecting the app.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null check (plan in ('starter','professional','business')),
  billing_cycle text not null check (billing_cycle in ('monthly','annually')),
  status text not null default 'inactive' check (status in ('active','past_due','cancelled','inactive')),
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz not null,
  paystack_customer_code text,
  paystack_subscription_code text,
  last_payment_reference text,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
-- Users may read only their own subscription. Only server-side service-role code writes.
drop policy if exists "Users can read their own Pneuma subscription" on public.subscriptions;
create policy "Users can read their own Pneuma subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);
revoke insert, update, delete on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
