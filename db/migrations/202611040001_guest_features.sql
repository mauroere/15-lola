create schema if not exists lola15;
revoke all on schema lola15 from public;
create table if not exists lola15.rsvps (
  id uuid primary key,
  contact_name text not null check(length(contact_name) between 2 and 100),
  phone text not null check(length(phone) between 8 and 18),
  attending boolean not null,
  members jsonb not null check(jsonb_typeof(members)='array' and jsonb_array_length(members)<=12),
  status text not null default 'pending' check(status in ('pending','approved','rejected','superseded')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create table if not exists lola15.songs (
  id uuid primary key,
  name text not null check(length(name) between 2 and 100),
  song text not null check(length(song) between 2 and 160),
  created_at timestamptz not null default now()
);
create table if not exists lola15.rate_limits (
  key text not null,
  bucket timestamptz not null,
  count integer not null check(count>0),
  primary key(key,bucket)
);
create table if not exists lola15.sessions (
  token_hash text primary key,
  password_version text not null,
  expires_at timestamptz not null
);
alter table lola15.rsvps enable row level security;
alter table lola15.songs enable row level security;
alter table lola15.rate_limits enable row level security;
alter table lola15.sessions enable row level security;
revoke all on all tables in schema lola15 from public;
create index if not exists lola15_rsvp_created on lola15.rsvps(created_at desc);
create index if not exists lola15_songs_created on lola15.songs(created_at desc);

create unique index if not exists lola15_one_approved_response on lola15.rsvps(phone,lower(btrim(contact_name))) where status='approved';
