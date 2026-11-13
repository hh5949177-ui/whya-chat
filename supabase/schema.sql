-- ============================================================
-- whya · Supabase schema
-- Tempel di: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Users
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

create index if not exists users_email_idx on public.users (email);
create index if not exists users_public_id_idx on public.users (public_id);

-- OTP pendaftaran
create table if not exists public.registration_otp (
  email_key text primary key,
  email text not null,
  otp text not null,
  name text,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  attempts int default 0
);

-- Mapping public id (opsional, sudah ada unique di users.public_id)
create table if not exists public.public_ids (
  public_id text primary key,
  user_id text not null references public.users(id) on delete cascade
);

-- Daftar chat per user
create table if not exists public.user_chats (
  user_id text not null references public.users(id) on delete cascade,
  room_id text not null,
  chat_type text default 'private',
  name text,
  avatar text,
  photo_url text,
  peer_id text,
  last_message text,
  last_message_time timestamptz,
  unread_count int default 0,
  archived boolean default false,
  primary key (user_id, room_id)
);

create index if not exists user_chats_user_idx on public.user_chats (user_id, last_message_time desc);

-- Grup
create table if not exists public.groups (
  id text primary key,
  name text not null,
  description text,
  owner_id text references public.users(id),
  avatar text,
  photo_url text,
  invite_code text unique,
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  group_id text not null references public.groups(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  name text,
  avatar text,
  photo_url text,
  role text default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Saluran
create table if not exists public.channels (
  id text primary key,
  name text not null,
  description text,
  owner_id text references public.users(id),
  avatar text,
  photo_url text,
  banner_url text,
  followers int default 0,
  created_at timestamptz default now()
);

create table if not exists public.channel_followers (
  channel_id text not null references public.channels(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (channel_id, user_id)
);

-- Pesan
create table if not exists public.messages (
  id bigserial primary key,
  room_id text not null,
  sender_id text,
  sender_name text,
  avatar text,
  photo_url text,
  msg_type text default 'text',
  body text,
  payload jsonb default '{}'::jsonb,
  verified boolean default false,
  badge_color text,
  role text,
  role_style text,
  created_at timestamptz default now()
);

create index if not exists messages_room_idx on public.messages (room_id, created_at);

-- Tautan season
create table if not exists public.season_links (
  code text primary key,
  link_type text not null check (link_type in ('pribadi','grup')),
  room_id text not null,
  created_by text,
  name text,
  avatar text,
  photo_url text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Settings
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

insert into public.settings (key, value)
values ('seasonLinks', '{"enabled":true,"requireAllow":false}'::jsonb)
on conflict (key) do nothing;

-- Web entries
create table if not exists public.webs (
  id text primary key,
  name text,
  url text,
  photo_url text,
  owner_id text,
  verified boolean default false,
  badge_color text,
  suspended boolean default false,
  suspend_until timestamptz,
  created_at timestamptz default now()
);

-- Enable Realtime (pesan live)
alter publication supabase_realtime add table public.messages;
