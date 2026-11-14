-- ============================================================
-- Supabase Storage untuk media (video/foto > 10MB)
-- Jalankan di SQL Editor SETELAH buat bucket "media" (public)
-- ============================================================

-- Policy: semua bisa baca (public bucket)
drop policy if exists "Public read media" on storage.objects;
create policy "Public read media"
on storage.objects for select
using ( bucket_id = 'media' );

-- Policy: semua bisa upload (dev — ganti lebih ketat di production)
drop policy if exists "Public upload media" on storage.objects;
create policy "Public upload media"
on storage.objects for insert
with check ( bucket_id = 'media' );

drop policy if exists "Public update media" on storage.objects;
create policy "Public update media"
on storage.objects for update
using ( bucket_id = 'media' );

drop policy if exists "Public delete media" on storage.objects;
create policy "Public delete media"
on storage.objects for delete
using ( bucket_id = 'media' );
