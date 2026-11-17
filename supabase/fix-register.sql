-- Jalankan ini di Supabase SQL Editor jika daftar gagal
-- Fix register / OTP / users untuk anon key

create table if not exists public.users (
  id text primary key,
  public_id text unique,
  name text not null,
  email text unique not null,
  password_hash text,
  password_plain text,
  avatar text,
  photo_url text,
  banner_url text,
  about text,
  role text default 'user',
  role_style text default 'plain',
  verified boolean default false,
  badge_color text default 'blue',
  banned boolean default false,
  can_open_season_links boolean default false,
  auth_provider text default 'email',
  email_verified boolean default false,
  created_at timestamptz default now(),
  last_login timestamptz
);

create table if not exists public.registration_otp (
  email_key text primary key,
  email text not null,
  otp text not null,
  name text,
  password_hash text,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  attempts int default 0
);

alter table public.users enable row level security;
alter table public.registration_otp enable row level security;

drop policy if exists "dev_all_users" on public.users;
create policy "dev_all_users" on public.users for all using (true) with check (true);

drop policy if exists "dev_all_registration_otp" on public.registration_otp;
create policy "dev_all_registration_otp" on public.registration_otp for all using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
