# WhyA · Full Supabase (tanpa Firebase)

## 1. Isi API key (wajib)

Edit **`js/config.js`**:

```js
window.WHYA_SUPABASE = {
  url: "https://wjmxiedyklmmoxcxjlw.supabase.co",
  anonKey: "PASTE_ANON_PUBLIC_KEY_DI_SINI"
};
```

Ambil key: Supabase → **Project Settings → API → `anon` `public`**

## 2. Jalankan SQL (berurutan)

SQL Editor:

1. `supabase/schema.sql`
2. `supabase/rls-dev.sql`
3. `supabase/rtdb-mirror.sql`  ← data chat/path
4. Storage → bucket **`media`** (public) → `supabase/storage.sql`

## 3. Auth Google

Authentication → Providers → **Google** ON  
Client ID + Secret dari Google Cloud  
URL config:

- Site URL: `https://whyachtt.vercel.app`
- Redirect: `https://whyachtt.vercel.app/login.html`

Callback Google Cloud:
`https://wjmxiedyklmmoxcxjlw.supabase.co/auth/v1/callback`

## 4. Deploy

Deploy seluruh isi zip ke Vercel. Hard refresh.

## 5. Akun

- **Daftar baru** → user tersimpan di tabel `users` Supabase  
- **Login Google** → Supabase OAuth  
- **Login email** → `WhyaDB.login` (password hash di `users`)

Data Firebase lama **tidak** otomatis pindah. Import ke `rt_nodes` jika perlu (lihat `MIGRASI-SUPABASE.md`).

## 6. File penting

| File | Fungsi |
|------|--------|
| `js/config.js` | URL + anon key |
| `js/supabase-client.js` | WhyaDB |
| `js/rtdb-supabase-shim.js` | `db.ref()` → `rt_nodes` |
| `login.html` / `dashboard.html` | tanpa Firebase SDK |
