# Deployment Guide

This project is prepared for deployment on Vercel with Supabase as backend.

## Goal

Make the app accessible in a browser so the team can test:
- authentication
- onboarding
- invoicing
- transactions
- declarations
- accounting screens

## Recommended deployment path

Use:
- GitHub for source control
- Vercel for the frontend
- Supabase for database, auth, storage, and edge functions

Repository:

`https://github.com/PlamediBokanga/compta.git`

## 1. Prepare Supabase

Before opening the app to testers, confirm that the correct Supabase project is ready:

1. Apply the SQL migrations from `supabase/migrations/`
2. Confirm the required tables, policies, and storage buckets exist
3. Deploy the edge function in `supabase/functions/send-email`

## 2. Configure frontend environment variables in Vercel

Add these variables in the Vercel project settings:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

These are the only frontend variables currently required by the app.

## 3. Configure Supabase auth URLs

In Supabase Auth settings:

- set the Site URL to the deployed Vercel URL
- add the Vercel production URL to redirect URLs
- add the preview URL pattern too if preview deployments are used

Important:

The password reset flow uses:

`/reset-password`

So the deployed domain must be allowed in Supabase redirect URLs.

## 4. Configure send-email function secrets in Supabase

The `send-email` edge function expects these server-side secrets:

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
APP_URL=https://your-app-domain.vercel.app
ALLOWED_ORIGINS=https://your-app-domain.vercel.app
RESEND_API_KEY=optional
```

Notes:

- `RESEND_API_KEY` is optional
- without `RESEND_API_KEY`, the function can still queue emails but will not send them through Resend
- `ALLOWED_ORIGINS` should include the deployed frontend URL

## 5. Deploy on Vercel

Recommended path:

1. Open Vercel dashboard
2. Import the GitHub repository `PlamediBokanga/compta`
3. Keep the detected Vite settings
4. Add the required environment variables
5. Deploy

The included `vercel.json` already prepares SPA routing for the custom frontend router.

## 6. Test checklist after first deployment

After the first browser deployment, test:

1. Home page loads
2. Sign in works
3. Sign up works
4. Onboarding redirects correctly
5. Dashboard loads after authentication
6. Invoice preview loads
7. Refreshing a deep URL works
8. Password reset works from the deployed URL

## 7. Team testing setup

For team testing, the easiest flow is:

1. Deploy one shared test environment on Vercel
2. Share the deployment URL with the team
3. Create tester accounts in Supabase Auth
4. Use one stable Supabase project for testing

## 8. Recommended next step

After the first successful test deployment:

- add a custom domain if needed
- define staging vs production environments
- automate database deployment and function deployment
