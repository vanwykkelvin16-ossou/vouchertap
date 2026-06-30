## Root cause

Login fails with "Invalid login credentials" because the app is pointed at the **wrong backend**.

- Your actual Lovable Cloud project ref is `vddblapsfulrihibuswz` (where all your users, vouchers, members, etc. live).
- But `.env` currently points the app to a different/old project: `etjtvnghsfgerqecztxl`.

So when anyone tries to sign in, the request goes to an empty/unrelated backend where their account doesn't exist → Supabase returns "Invalid login credentials". No user can log in, including admin.

This almost certainly got introduced when `.env` was edited in an earlier turn (that file is supposed to be auto-managed by Lovable Cloud and never hand-edited).

## Fix

Restore `.env` to point back at the real Lovable Cloud project:

```
VITE_SUPABASE_PROJECT_ID="vddblapsfulrihibuswz"
VITE_SUPABASE_URL="https://vddblapsfulrihibuswz.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_eN2OXd4iFe6yRapPCBq0QQ_2Ja5WHi5"
SUPABASE_URL="https://vddblapsfulrihibuswz.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_eN2OXd4iFe6yRapPCBq0QQ_2Ja5WHi5"
```

Keep the existing `VAPID_*` values (push notifications) untouched.

Then restart the dev server so Vite picks up the new env values, and try logging in again with an existing member account.

## What I will NOT change

- No code changes to login/signup/auth flow — the code is correct, only the env was wrong.
- No database changes — your users are already in the right project, untouched.

## After the fix

Existing accounts will log in normally. If you've forgotten an admin password I can trigger a reset from the backend separately.
