# Full Supabase untuk whya (opsi 2)

Tujuan: auth, data, dan **media > 10MB** lewat Supabase (bukan batas 10MB Firebase RTDB).

## 1. Buat project

1. https://supabase.com → New project  
2. Region dekat (Singapore)  
3. Simpan password database  

## 2. Jalankan SQL

**SQL Editor** → Run berurutan:

1. `supabase/schema.sql` — tabel users, messages, groups, OTP, dll.  
2. `supabase/rls-dev.sql` — policy development  
3. (setelah bucket) `supabase/storage.sql`  

## 3. Buat Storage bucket

1. Menu **Storage** → **New bucket**  
2. Nama: `media`  
3. Centang **Public bucket**  
4. Create  
5. Run `supabase/storage.sql`  

## 4. Isi API key

**Project Settings → API** → salin URL + `anon` key.

Edit `js/supabase-client.js`:

```js
var SUPABASE_URL = "https://xxxx.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

Atau di HTML sebelum client:

```html
<script>
  window.WHYA_SUPABASE = {
    url: "https://xxxx.supabase.co",
    anonKey: "eyJhbGciOi..."
  };
</script>
```

## 5. Media besar (status / chat video)

`dashboard.html` sudah memakai:

1. **Supabase Storage** dulu (jika dikonfigurasi)  
2. Firebase Storage sebagai cadangan  
3. DataURL hanya untuk file kecil  

Setelah langkah 3–4, video puluhan MB bisa diunggah tanpa error `10485760 utf8 bytes`.

## 6. Auth & data (full)

| Fitur | File / cara |
|-------|-------------|
| Daftar + OTP + login | `login-supabase.html` + `WhyaDB` |
| Kirim/baca pesan | `WhyaDB.sendMessage` / `getMessages` / `subscribeMessages` |
| Upload video | `WhyaDB.uploadMedia(file, folder)` |
| Schema lengkap | `supabase/schema.sql` |

`dashboard.html` utama masih banyak memakai Firebase untuk chat list/grup. Media besar sudah bisa full Supabase Storage. Migrasi sisa fitur ke `WhyaDB` bisa bertahap.

## 7. Tes cepat

1. Isi URL + anon key  
2. Buat bucket `media` (public) + policy  
3. Deploy / refresh app  
4. Kirim status/video > 15MB  
5. Harus muncul "Mengunggah ke Supabase..." lalu berhasil  

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `Bucket not found` | Buat bucket nama tepat `media` |
| `new row violates row-level security` | Jalankan `storage.sql` / longgarkan policy |
| Tetap ke Firebase | `WhyaDB.isConfigured()` false → cek URL/key |
| Video tidak putar | Pastikan bucket **public** agar `getPublicUrl` bisa diakses |

## Production

Ganti policy dev (`allow all`) agar hanya user login yang boleh upload, misalnya:

```sql
create policy "auth upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'media');
```


## Storage media (wajib untuk video > ~6MB)

App **hanya memakai Supabase Storage** (bukan Firebase Storage).

1. Storage → New bucket → nama **`media`** → centang **Public**
2. Run `supabase/storage.sql`
3. Isi di `js/supabase-client.js`:

```js
var SUPABASE_URL = "https://xxxx.supabase.co";
var SUPABASE_ANON_KEY = "eyJ...";
```

Tanpa ini, video besar tidak bisa diunggah ke Supabase (ada host sementara darurat saja).
