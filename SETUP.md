# VoucherTap — Setup Guide

## 1. Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **anon public key** from:
   - Dashboard → Settings → API

## 2. Environment Variables

```bash
cp .env.local .env
```

Edit `.env` and fill in:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Database Schema

Run the full SQL in **Supabase Dashboard → SQL Editor**:

```
supabase/migrations/001_initial_schema.sql
```

Paste the entire file contents and click **Run**.

## 4. Edge Function

### Install Supabase CLI
```bash
npm install -g supabase
```

### Login and link your project
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```
(Find your project ref in: Dashboard → Settings → General)

### Set the verification secret
```bash
supabase secrets set VERIFICATION_SECRET=your-secret-phrase-here
```

### Deploy the edge function
```bash
supabase functions deploy get_daily_verification
```

## 5. Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## 6. Create Your First Admin User

1. Sign up normally on `/login`
2. In Supabase Dashboard → SQL Editor, run:
```sql
update profiles set role = 'admin' where email = 'your@email.com';
```

## 7. Create a Merchant

1. Sign up with a new account
2. Set that user's role to `merchant` in SQL or via Admin panel
3. Go to `/merchant/profile` and create the merchant profile

## User Role Routing

| Role | Landing page |
|------|-------------|
| customer | `/` (My Vouchers) |
| merchant | `/merchant` (Dashboard) |
| admin | `/admin` (Admin panel) |

## Anti-fraud System

The **Redemption Screen** (`/voucher/:id/redeemed`) and **Verify Page** (`/merchant/verify`) both poll the edge function every second. Staff visually verify:

1. Color band matches today's color
2. Live clock matches within 5 seconds
3. Shimmer animation is moving (frozen = screenshot)
4. Customer's name is shown

## Deployment

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

For Vercel:
```bash
npx vercel --prod
```
