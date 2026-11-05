# whya

Chat, telepon & video call (Firebase Realtime Database).

## File

| File | Keterangan |
|------|------------|
| `index.html` | Entry — redirect login/dashboard |
| `login.html` | Masuk & daftar |
| `dashboard.html` | App utama (wajib login) |
| `admin.html` | Panel admin |
| `sw.js` | Service worker (notifikasi + cache) |
| `manifest.webmanifest` | PWA manifest |
| `vercel.json` | Config Vercel |

## Firebase (project aktif)

```
apiKey: AIzaSyC1I2WinNF1_KrS8ijNmQr07dqGN4-EWhE
authDomain: chat2-b2a96.firebaseapp.com
databaseURL: https://chat2-b2a96-default-rtdb.firebaseio.com
projectId: chat2-b2a96
storageBucket: chat2-b2a96.firebasestorage.app
```

Jika RTDB region Asia Southeast, ganti `databaseURL` menjadi:
`https://chat2-b2a96-default-rtdb.asia-southeast1.firebasedatabase.app`

Rules uji coba:
```json
{ "rules": { ".read": true, ".write": true } }
```

## Deploy / redeploy ke Vercel

1. Upload/commit semua file ini ke GitHub (branch `main`)
2. Vercel auto-deploy, atau klik **Redeploy** di tab Deployments
3. Hard refresh / clear site data (service worker cache)

```bash
git add .
git commit -m "Update whya full package"
git push origin main
```

## Lokal

```bash
npx serve .
# atau
python3 -m http.server 8080
```

## Catatan

- Dashboard tidak bisa dibuka tanpa login (redirect ke `login.html`)
- Notifikasi teman/grup memakai `sw.js` (bukan General)
- Video profil/banner: akun verified atau role moderator/staff/admin/owner
