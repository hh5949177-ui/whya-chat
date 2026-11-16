# Migrasi Firebase RTDB → Supabase (tanpa Firebase)

Firebase Realtime Database kamu ~14GB sudah tidak ideal (biaya + lambat).  
whya sekarang bisa jalan lewat **Supabase** memakai tabel `rt_nodes` (mirror path mirip RTDB).

## A. Siapkan Supabase

1. Buat project di https://supabase.com (region **Singapore** disarankan)
2. **SQL Editor** → jalankan berurutan:
   1. `supabase/schema.sql`
   2. `supabase/rls-dev.sql`
   3. `supabase/storage.sql` (setelah buat bucket)
   4. `supabase/rtdb-mirror.sql`  ← **wajib untuk ganti RTDB**
3. **Storage** → New bucket → nama `media` → **Public**
4. **Project Settings → API** → salin:
   - Project URL
   - `anon` `public` key

## B. Isi key di app

Edit `dashboard.html` (blok `window.WHYA_SUPABASE`) **atau** `js/supabase-client.js`:

```js
window.WHYA_SUPABASE = {
  url: "https://xxxxxxxx.supabase.co",
  anonKey: "eyJhbGciOi..."
};
```

## C. Deploy

Deploy zip terbaru. Hard refresh.

File penting:
- `js/rtdb-supabase-shim.js` — mengganti `db.ref(...)` Firebase
- `js/supabase-client.js` — client + WhyaDB
- Firebase RTDB **tidak dipakai** lagi untuk data path

## D. Migrasi data 14GB (opsional tapi disarankan)

Firebase tidak bisa di-export sekaligus kalau sangat besar. Lakukan bertahap:

### 1) Export per cabang di Firebase Console
Realtime Database → data → export JSON per node besar:
- `users`
- `userChats`
- `chats` (per room / batch)
- `botAccounts`
- dll.

### 2) Import ke `rt_nodes`

Ide struktur:
- path `users/<uid>` → satu row `rt_nodes`
- path `chats/<roomId>/<msgId>` → satu row per pesan

Script Node contoh (jalankan di komputer / server, bukan di browser):

```js
// import-rt.js — contoh
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function walk(obj, base, rows) {
  if (obj === null || typeof obj !== "object") {
    rows.push({ path: base, parent: base.split("/").slice(0,-1).join("/"), data: obj, is_leaf: true });
    return;
  }
  // simpan object utuh di path ini + opsional pecah anak
  rows.push({ path: base, parent: base.includes("/") ? base.split("/").slice(0,-1).join("/") : "", data: obj, is_leaf: true });
}

async function upsertBatch(rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await sb.from("rt_nodes").upsert(chunk);
    if (error) console.error(error);
    else console.log("ok", i, chunk.length);
  }
}

const data = JSON.parse(fs.readFileSync("users.json", "utf8"));
const rows = [];
Object.keys(data || {}).forEach((uid) => walk(data[uid], "users/" + uid, rows));
upsertBatch(rows);
```

Pakai **service role key** hanya di mesin lokal/server (jangan di frontend).

### 3) Prioritas migrasi
1. `users` — supaya login/profil jalan  
2. `userChats` — daftar chat  
3. `chats/*` — isi pesan (batch per bulan / per room)  
4. `botAccounts`, status, notifikasi  

Pesan lama yang tidak diimpor tidak muncul (wajar).

## E. Auth Google tanpa Firebase

- Aktifkan **Supabase Auth → Google** di dashboard Supabase  
- Atau tetap pakai login email/OTP (`login-supabase.html` / alur Gmail OTP)  
- Jangan mengandalkan `firebase.auth()` lagi (sudah di-stub)

## F. Biaya & performa
| | Firebase RTDB 14GB | Supabase |
|--|--------------------|----------|
| Model | Seluruh tree sering ke-download | Query path / SQL index |
| File besar | Tidak cocok | Storage bucket `media` |
| Realtime | Native | `rt_nodes` + poll/realtime |

## G. Troubleshooting
| Gejala | Cek |
|--------|-----|
| Data kosong | Key Supabase belum diisi / SQL `rtdb-mirror.sql` belum dijalankan |
| Error RLS | Jalankan policy di `rtdb-mirror.sql` |
| Loader terus | Hard refresh + pastikan `wg_user` ada (login ulang) |
| Upload gagal | Bucket `media` public + `storage.sql` |

## H. Setelah stabil
- Nonaktifkan billing RTDB Firebase (hati-hati: backup dulu)
- Hapus SDK Firebase dari project bila sudah tidak terpakai
