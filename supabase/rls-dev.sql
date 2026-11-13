-- ============================================================
-- RLS policies (development — longgar)
-- Production: ganti agar hanya user terkait yang akses
-- ============================================================

alter table public.users enable row level security;
alter table public.registration_otp enable row level security;
alter table public.public_ids enable row level security;
alter table public.user_chats enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.channels enable row level security;
alter table public.channel_followers enable row level security;
alter table public.messages enable row level security;
alter table public.season_links enable row level security;
alter table public.settings enable row level security;
alter table public.webs enable row level security;

-- Dev: izinkan semua (mirip Firebase rules true)
do $$
declare t text;
begin
  foreach t in array array[
    'users','registration_otp','public_ids','user_chats','groups','group_members',
    'channels','channel_followers','messages','season_links','settings','webs'
  ]
  loop
    execute format('drop policy if exists "dev_all_%s" on public.%I', t, t);
    execute format(
      'create policy "dev_all_%s" on public.%I for all using (true) with check (true)',
      t, t
    );
  end loop;
end $$;
