-- Run this in your Supabase SQL editor
-- Table: keys

create table keys (
  id uuid default gen_random_uuid() primary key,
  key text not null unique,
  hwid text default null,          -- locked HWID after first use
  ip text default null,            -- locked IP after first use
  expires_at timestamptz default null,
  created_at timestamptz default now(),
  last_used timestamptz default null,
  use_count integer default 0,
  active boolean default true,
  note text default null           -- optional label e.g. "nog's key"
);

-- Insert some starter keys (customize these)
insert into keys (key, note) values
  ('ABCD-EFGH-IJKL', 'Test key 1'),
  ('SPEC-TRES-GOAT', 'Test key 2'),
  ('NOG-TEST-1234',  'Dev key - nog');

-- Optional: sessions table so the DLL can verify its token every call
create table sessions (
  id uuid default gen_random_uuid() primary key,
  key_id uuid references keys(id) on delete cascade,
  token text not null unique,
  hwid text,
  ip text,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);
