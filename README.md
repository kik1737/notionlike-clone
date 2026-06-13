# Notion-like Clone

Next.js Notion clone with Supabase (Postgres + Auth) and Google OAuth.

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Fill in `.env` with your Supabase project values from the [Supabase Dashboard](https://supabase.com/dashboard).

3. Enable Google OAuth in Supabase (Authentication → Providers) and set redirect URL:

```
http://localhost:3000/auth/callback
```

4. Install dependencies and run:

```bash
npm install
npm run dev
```

## Stack

- Next.js 16 (App Router)
- Supabase (Postgres, RLS, Auth)
- Google OAuth via `@supabase/ssr`

## Database

SQL migrations live in `supabase/migrations/`. Apply them to your Supabase project via the Supabase CLI or Dashboard SQL editor.
