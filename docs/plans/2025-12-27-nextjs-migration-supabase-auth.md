# Next.js Migration + Supabase Auth

**Date:** 2025-12-27
**Status:** Approved

## Overview

Migrate the games.zitti platform from Vite to Next.js and implement optional Supabase authentication with the self-hosted instance at supabase.zitti.ro.

## Goals

1. Convert Vite SPA to Next.js App Router
2. Add optional Supabase email/password authentication
3. Preserve guest play (localStorage) for unauthenticated users
4. Sync game stats across devices for logged-in users
5. Prepare folder structure for Secret Hitler game

## Architecture

### Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with Providers
│   ├── page.tsx            # GameHub (home)
│   ├── games/
│   │   ├── hot-take/
│   │   │   └── page.tsx
│   │   ├── like-minded/
│   │   │   └── page.tsx
│   │   └── secret-hitler/
│   │       └── page.tsx    # Placeholder "Coming Soon"
│   └── globals.css
├── components/
│   ├── GameHub.tsx
│   ├── Profile.tsx         # Expanded with auth
│   └── AuthForm.tsx        # Email/password sign-in form
├── contexts/
│   └── UserContext.tsx     # Auth state + guest fallback
├── lib/
│   └── supabase/
│       ├── client.ts       # Browser client
│       ├── server.ts       # Server client (cookies)
│       └── middleware.ts   # Session refresh helper
├── games/
│   ├── hot-take/           # Existing game components
│   ├── like-minded/        # Existing game components
│   └── secret-hitler/      # Empty, ready for later
└── middleware.ts           # Route-level session refresh
```

### Authentication

**Provider:** Supabase (self-hosted at supabase.zitti.ro)
**Method:** Email/Password only (invite-only, no self-registration)
**Packages:** `@supabase/ssr`, `@supabase/supabase-js`

**Cookie config for cross-subdomain auth:**
```typescript
{
  domain: '.zitti.ro',
  sameSite: 'lax',
  secure: true
}
```

### User Context

```typescript
interface UserContextType {
  user: User | null;           // Supabase user (null if guest)
  isAuthenticated: boolean;
  isLoading: boolean;

  signIn: (email, password) => Promise<Result>
  signOut: () => Promise<void>

  profile: {
    id: string;              // Supabase user ID or localStorage playerId
    name: string;
    gamesPlayed: number;
    gamesHosted: number;
  }
  updateName: (name: string) => void
}
```

**Dual storage strategy:**
- Guest: localStorage (current behavior preserved)
- Logged in: Supabase `game_stats` table + localStorage as cache
- On sign in: Merge localStorage stats into Supabase (additive)
- On sign out: Keep localStorage data for continued guest play

### Database

User accounts managed by Supabase Auth. Only custom table needed:

```sql
create table game_stats (
  user_id uuid references auth.users primary key,
  games_played int default 0,
  games_hosted int default 0,
  updated_at timestamptz default now()
);
```

### Profile Modal

Guest view:
- Name display with edit
- Stats display
- Sign-in form (email/password)
- "Don't have an account? Contact me at zitti.ro" link

Logged-in view:
- Name display with edit
- Stats display
- Email display
- Sign out button

## Implementation Steps

1. Initialize Next.js project structure
2. Migrate styles (`index.css` → `globals.css`)
3. Set up Supabase auth files (client, server, middleware)
4. Create UserContext with guest/auth hybrid
5. Migrate components to new structure
6. Update Profile modal with auth UI
7. Wire up games as routes
8. Create Secret Hitler placeholder
9. Clean up Vite files
10. Test full flow

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://supabase.zitti.ro
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```
