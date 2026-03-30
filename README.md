# Specter Key System — Full Setup Guide

## Folder Structure

```
specter-key-system/
├── index.html
├── vercel.json
├── api/
│   ├── validate.js     POST /api/validate  — key auth + HWID/IP lock
│   ├── session.js      POST /api/session   — DLL session verify
│   └── status.js       GET  /api/status    — heartbeat
├── dll/
│   └── SpecterAuth.h   — drop into your DLL project
└── supabase/
    └── schema.sql      — run once in Supabase SQL editor
```

---

## Step 1 — Supabase

1. supabase.com → New Project
2. SQL Editor → paste + run supabase/schema.sql
3. Project Settings → API → copy:
   - Project URL        → SUPABASE_URL
   - service_role key   → SUPABASE_SERVICE_KEY

---

## Step 2 — Vercel Deploy

1. New GitHub repo → upload index.html, vercel.json, api/ folder
2. vercel.com → Import repo
3. Add Environment Variables:
   - SUPABASE_URL
   - SUPABASE_SERVICE_KEY
4. Deploy

---

## Step 3 — Adding Keys

Supabase → Table Editor → keys → Insert Row
Keys auto-lock HWID + IP on first use.
To reset: set hwid and ip columns to null.
To revoke: set active to false.

---

## Step 4 — DLL

#include "SpecterAuth.h"   // link winhttp.lib

Specter::Auth auth("your-project.vercel.app");
if (!auth.Validate(key))   { /* block */ }
if (!auth.VerifySession()) { /* kick  */ }

See SpecterAuth.h for full example.

---

## Auth Flow

User types key
  → POST /api/validate
  → Supabase lookup (active? expired? HWID/IP match?)
  → Returns { valid, token }

DLL injects
  → POST /api/session with token + X-HWID header
  → Verifies token not expired, HWID matches
  → Returns { valid: true } → menu unlocks
