-- ============================================================
-- VoucherTap — Complete Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- PROFILES (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer','merchant','admin')),
  created_at timestamptz default now()
);

-- MERCHANTS
create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  description text,
  logo_url text,
  cover_image_url text,
  address text,
  city text,
  category text,
  owner_user_id uuid references profiles(id) on delete cascade,
  is_verified boolean default false,
  created_at timestamptz default now()
);

-- VOUCHER CAMPAIGNS
create table if not exists voucher_campaigns (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  title text not null,
  description text,
  terms text,
  image_url text,
  value_amount numeric not null,
  value_type text not null check (value_type in ('discount','free_item','percentage')),
  category text,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  total_issued int default 0,
  max_total int,
  max_per_user int default 1,
  is_active boolean default true,
  is_featured boolean default false,
  created_at timestamptz default now()
);

-- VOUCHERS (issued instances)
create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references voucher_campaigns(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  voucher_code text unique not null,
  status text not null default 'active' check (status in ('active','redeemed','expired','revoked')),
  issued_at timestamptz default now(),
  redeemed_at timestamptz,
  redeemed_by_merchant_id uuid references merchants(id),
  expires_at timestamptz not null
);

-- REDEMPTION LOGS
create table if not exists redemption_logs (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid references vouchers(id) on delete cascade,
  redeemed_at timestamptz default now(),
  merchant_user_id uuid references profiles(id),
  ip_address text,
  device_info text
);

-- FAVORITES
create table if not exists favorites (
  user_id uuid references profiles(id) on delete cascade,
  campaign_id uuid references voucher_campaigns(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, campaign_id)
);

-- INDEXES
create index if not exists idx_vouchers_user on vouchers(user_id, status);
create index if not exists idx_vouchers_campaign on vouchers(campaign_id);
create index if not exists idx_campaigns_merchant on voucher_campaigns(merchant_id);
create index if not exists idx_campaigns_active on voucher_campaigns(is_active, valid_until);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
drop policy if exists "users_own_profile" on profiles;
create policy "users_own_profile" on profiles for all using (auth.uid() = id);

alter table vouchers enable row level security;
drop policy if exists "customers_own_vouchers" on vouchers;
create policy "customers_own_vouchers" on vouchers for select using (auth.uid() = user_id);
drop policy if exists "merchants_campaign_vouchers" on vouchers;
create policy "merchants_campaign_vouchers" on vouchers for select using (
  exists (
    select 1 from voucher_campaigns vc
    join merchants m on m.id = vc.merchant_id
    where vc.id = vouchers.campaign_id and m.owner_user_id = auth.uid()
  )
);

alter table voucher_campaigns enable row level security;
drop policy if exists "public_read_active" on voucher_campaigns;
create policy "public_read_active" on voucher_campaigns for select using (is_active = true);
drop policy if exists "merchants_manage_own" on voucher_campaigns;
create policy "merchants_manage_own" on voucher_campaigns for all using (
  exists (select 1 from merchants where id = voucher_campaigns.merchant_id and owner_user_id = auth.uid())
);

alter table merchants enable row level security;
drop policy if exists "public_read_merchants" on merchants;
create policy "public_read_merchants" on merchants for select using (true);
drop policy if exists "merchants_update_own" on merchants;
create policy "merchants_update_own" on merchants for update using (owner_user_id = auth.uid());
drop policy if exists "merchants_insert_own" on merchants;
create policy "merchants_insert_own" on merchants for insert with check (owner_user_id = auth.uid());

alter table redemption_logs enable row level security;
drop policy if exists "merchants_read_own_logs" on redemption_logs;
create policy "merchants_read_own_logs" on redemption_logs for select using (
  merchant_user_id = auth.uid() or
  exists (
    select 1 from vouchers v
    join voucher_campaigns vc on vc.id = v.campaign_id
    join merchants m on m.id = vc.merchant_id
    where v.id = redemption_logs.voucher_id and m.owner_user_id = auth.uid()
  )
);

alter table favorites enable row level security;
drop policy if exists "users_own_favorites" on favorites;
create policy "users_own_favorites" on favorites for all using (auth.uid() = user_id);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Atomic voucher redemption
create or replace function redeem_voucher(p_voucher_id uuid)
returns json language plpgsql security definer as $$
declare
  v_voucher vouchers%rowtype;
begin
  select * into v_voucher from vouchers where id = p_voucher_id and user_id = auth.uid() for update;
  if not found then
    return json_build_object('success', false, 'error', 'Voucher not found');
  end if;
  if v_voucher.status != 'active' then
    return json_build_object('success', false, 'error', 'Already redeemed or expired');
  end if;
  if v_voucher.expires_at < now() then
    return json_build_object('success', false, 'error', 'Voucher expired');
  end if;

  update vouchers set status = 'redeemed', redeemed_at = now() where id = p_voucher_id;
  insert into redemption_logs (voucher_id) values (p_voucher_id);
  return json_build_object('success', true, 'redeemed_at', now());
end;
$$;

-- Claim voucher from campaign
create or replace function claim_voucher(p_campaign_id uuid)
returns json language plpgsql security definer as $$
declare
  v_campaign voucher_campaigns%rowtype;
  v_count int;
  v_code text;
begin
  select * into v_campaign from voucher_campaigns where id = p_campaign_id and is_active = true;
  if not found then
    return json_build_object('success', false, 'error', 'Campaign not available');
  end if;
  if v_campaign.valid_until < now() then
    return json_build_object('success', false, 'error', 'Campaign expired');
  end if;
  if v_campaign.max_total is not null and v_campaign.total_issued >= v_campaign.max_total then
    return json_build_object('success', false, 'error', 'Campaign sold out');
  end if;

  select count(*) into v_count from vouchers where campaign_id = p_campaign_id and user_id = auth.uid();
  if v_count >= v_campaign.max_per_user then
    return json_build_object('success', false, 'error', 'Limit reached');
  end if;

  v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  insert into vouchers (campaign_id, user_id, voucher_code, expires_at)
    values (p_campaign_id, auth.uid(), v_code, v_campaign.valid_until);
  update voucher_campaigns set total_issued = total_issued + 1 where id = p_campaign_id;
  return json_build_object('success', true, 'code', v_code);
end;
$$;

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name')
    on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
