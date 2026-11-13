# Setup Supabase untuk whya

Panduan singkat menghubungkan database **Supabase** ke project ini.

## File yang sudah disediakan

| File | Isi |
|------|-----|
| `supabase/schema.sql` | Tabel: users, OTP, messages, groups, channels, season_links, dll. |
| `supabase/rls-dev.sql` | Policy RLS development (akses terbuka) |
| `js/supabase-client.js` | Client + helper: login, OTP, register, kirim pesan |
| `login-supabase.html` | Halaman demo login/daftar OTP pakai Supabase |

> Catatan: `dashboard.html` / `login.html` utama masih memakai **Firebase**.  
> Demo Supabase ada di `login-supabase.html`. Migrasi penuh dashboard bisa bertahap memakai `WhyaDB`.

---

## Langkah 1 — Buat project Supabase

1. Buka https://supabase.com → login  
2. **New project**  
3. Nama project, password database, region (disarankan **Singapore**)  
4. Tunggu project siap  

---

## Langkah 2 — Jalankan SQL

1. Menu **SQL Editor** → New query  
2. Copy seluruh isi `supabase/schema.sql` → **Run**  
3. Query baru → copy isi `supabase/rls-dev.sql` → **Run**  

Cek **Table Editor**: harus ada tabel `users`, `messages`, `registration_otp`, dll.

---

## Langkah 3 — Ambil API keys

**Project Settings → API**:

- **Project URL** → contoh `https://abcdxyz.supabase.co`  
- **anon public** key → string panjang `eyJhbGciOi...`

---

## Langkah 4 — Isi config di kode

Buka `js/supabase-client.js`, ganti:

```js
var SUPABASE_URL = "https://abcdxyz.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

Simpan file.

---

## Langkah 5 — Tes halaman demo

1. Deploy / jalankan site (Vercel atau lokal)  
2. Buka: `https://domain-kamu/login-supabase`  
   atau lokal: `login-supabase.html`  
3. **Daftar** → isi Gmail → OTP 4 digit ke email → verifikasi  
4. **Masuk** dengan email & password yang sama  

OTP dikirim lewat FormSubmit (sama seperti alur Firebase).  
Pertama kali, kadang perlu aktivasi link dari FormSubmit di inbox.

---

## Langkah 6 — Realtime (chat live)

Di SQL sudah ada:

```sql
alter publication supabase_realtime add table public.messages;
```

Di kode:

```js
WhyaDB.subscribeMessages("room123", function (msg) {
  console.log("pesan baru", msg);
});
```

---

## Contoh pakai di halaman lain

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/js/supabase-client.js"></script>
<script>
  // Login
  const user = await WhyaDB.login("email@gmail.com", "password");

  // Kirim pesan
  await WhyaDB.sendMessage("general", {
    senderId: user.id,
    sender: user.name,
    text: "Halo!"
  });

  // Ambil pesan
  const list = await WhyaDB.getMessages("general");
</script>
```

---

## Mapping singkat Firebase → Supabase

| Firebase (lama) | Supabase (baru) |
|-----------------|-----------------|
| `users/{id}` | tabel `users` |
| `chats/{room}/{msgId}` | tabel `messages` (`room_id`) |
| `groups/{id}` | tabel `groups` + `group_members` |
| `registrationOtp/{key}` | tabel `registration_otp` |
| `seasonLinks/{code}` | tabel `season_links` |
| `on('child_added')` | `subscribeMessages` / Realtime |

---

## Production (penting)

Policy di `rls-dev.sql` **sangat longgar** (semua orang bisa baca/tulis).  
Sebelum go-public, ganti RLS agar hanya user yang berhak mengakses datanya, dan jangan expose `password_plain`.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `Invalid API key` | Cek URL + anon key |
| `relation does not exist` | Jalankan `schema.sql` |
| `row level security` / permission denied | Jalankan `rls-dev.sql` |
| OTP tidak masuk email | Cek Spam + aktivasi FormSubmit |
| Realtime tidak jalan | Pastikan tabel `messages` di publication realtime |

---

## Lanjut migrasi penuh?

Kalau kamu ingin `dashboard.html` utama juga full Supabase (bukan Firebase), bilang saja — bisa dikerjakan bertahap (auth dulu, lalu chat, grup, saluran).
