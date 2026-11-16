
-- ============================================================
-- whya · Supabase RTDB mirror (ganti Firebase Realtime Database)
-- Jalankan SETELAH schema.sql
-- ============================================================

-- Penyimpanan path mirip Firebase RTDB
create table if not exists public.rt_nodes (
  path text primary key,
  parent text,
  data jsonb,
  is_leaf boolean default true,
  updated_at timestamptz default now()
);

create index if not exists rt_nodes_parent_idx on public.rt_nodes (parent);
create index if not exists rt_nodes_updated_idx on public.rt_nodes (updated_at desc);

-- Bot accounts
create table if not exists public.bot_accounts (
  user_id text primary key references public.users(id) on delete cascade,
  account_id text,
  name text,
  enabled boolean default false,
  meta jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Status / stories
create table if not exists public.statuses (
  id text primary key,
  user_id text references public.users(id) on delete cascade,
  name text,
  caption text,
  media_url text,
  media_type text default 'image',
  created_at timestamptz default now(),
  expires_at timestamptz
);

create index if not exists statuses_user_idx on public.statuses (user_id, created_at desc);

-- Notifikasi global app
create table if not exists public.app_notifications (
  id text primary key,
  text text,
  image_url text,
  active boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- Realtime untuk mirror
alter publication supabase_realtime add table public.rt_nodes;

-- RLS longgar (dev) — kunci di production
alter table public.rt_nodes enable row level security;
drop policy if exists "rt_nodes_all" on public.rt_nodes;
create policy "rt_nodes_all" on public.rt_nodes for all using (true) with check (true);

alter table public.bot_accounts enable row level security;
drop policy if exists "bot_accounts_all" on public.bot_accounts;
create policy "bot_accounts_all" on public.bot_accounts for all using (true) with check (true);

alter table public.statuses enable row level security;
drop policy if exists "statuses_all" on public.statuses;
create policy "statuses_all" on public.statuses for all using (true) with check (true);

alter table public.app_notifications enable row level security;
drop policy if exists "app_notifications_all" on public.app_notifications;
create policy "app_notifications_all" on public.app_notifications for all using (true) with check (true);
