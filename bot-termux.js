/**
 * whya Bot — jalankan di Termux
 *
 * 1) pkg install nodejs
 * 2) npm install firebase-admin  (atau pakai REST tanpa admin)
 * 3) Isi BOT_USER_ID dan BOT_ACCOUNT_ID di bawah (dari pengaturan "Jadi bot" di app)
 * 4) node bot-termux.js
 *
 * User chat pribadi ke akun bot, ketik /menu → daftar fitur.
 */

const https = require("https");
const http = require("http");

// ====== ISI DARI PENGATURAN "JADI BOT" DI APP ======
const BOT_USER_ID = "ISI_USER_ID_BOT";       // id internal akun (Firebase key users/...)
const BOT_ACCOUNT_ID = "ISI_PUBLIC_ID_BOT";  // public id akun
const DATABASE_URL = "https://chat2-b2a96-default-rtdb.asia-southeast1.firebasedatabase.app";
// ==================================================

const MENU = [
  "1. /ping — cek bot aktif",
  "2. /info — info akun bot",
  "3. /waktu — waktu server",
  "4. /help — bantuan singkat",
  "5. /quote — kutipan random",
  "6. /fakta — fakta singkat",
  "7. /tebak — tebak angka 1-10",
  "8. /echo <teks> — ulangi pesan",
  "9. /caps <teks> — huruf besar",
  "10. /reverse <teks> — balik teks",
  "11. /hitung <a+b> — kalkulator sederhana",
  "12. /doa — doa singkat",
  "13. /motivasi — motivasi harian",
  "14. /cuaca — tips cuaca umum",
  "15. /translate <teks> — tips terjemah",
  "16. /kode — contoh kode hello",
  "17. /html — snippet HTML",
  "18. /js — snippet JavaScript",
  "19. /python — snippet Python",
  "20. /json — contoh JSON",
  "21. /password — generate password",
  "22. /uuid — id acak",
  "23. /base64 <teks> — encode base64",
  "24. /waktuindo — zona WIB",
  "25. /owner — kontak owner",
  "26. /rules — aturan bot",
  "27. /fitur — daftar fitur pendek",
  "28. /status — status bot online",
  "29. /versi — versi bot",
  "30. /random — angka acak",
  "31. /koin — lempar koin",
  "32. /dadu — lempar dadu",
  "33. /warna — warna random",
  "34. /nama — ide nama random",
  "35. /menu — tampilkan menu ini",
  "36. /clear — (info) hapus chat di sisi user",
  "37. /link — link app",
  "38. /ai — arahkan ke asisten AI di app",
  "39. /broadcast — (owner only di server)",
  "40. /stop — info nonaktifkan bot di app"
];

function dbGet(path) {
  return new Promise((resolve, reject) => {
    const url = DATABASE_URL + "/" + path.replace(/^\//, "") + ".json";
    https.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve(null); }
      });
    }).on("error", reject);
  });
}

function dbPost(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(DATABASE_URL + "/" + path.replace(/^\//, "") + ".json");
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(d));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function replyText(roomId, text) {
  return dbPost("chats/" + roomId, {
    type: "text",
    text: text,
    senderId: BOT_USER_ID,
    senderName: "whya-bot",
    timestamp: Date.now(),
    isBot: true
  });
}

function handleCommand(text) {
  const t = (text || "").trim();
  const low = t.toLowerCase();
  const arg = t.split(/\s+/).slice(1).join(" ");
  if (low === "/menu" || low === "menu") return "🤖 *Menu Bot whya*\n\n" + MENU.join("\n");
  if (low === "/ping") return "pong ✅ Bot aktif";
  if (low === "/info") return "Bot ID: " + BOT_USER_ID + "\nAccount: " + BOT_ACCOUNT_ID;
  if (low === "/waktu" || low === "/waktuindo") return "Waktu: " + new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  if (low === "/help") return "Ketik /menu untuk semua fitur.";
  if (low === "/quote") return ["Tetap semangat.", "Kode hari ini, bug besok.", "Konsisten > sempurna."][Math.floor(Math.random() * 3)];
  if (low === "/fakta") return "Node.js bisa dijalankan di Termux untuk bot sederhana.";
  if (low.startsWith("/echo ")) return arg;
  if (low.startsWith("/caps ")) return arg.toUpperCase();
  if (low.startsWith("/reverse ")) return arg.split("").reverse().join("");
  if (low.startsWith("/hitung ")) {
    try {
      const expr = arg.replace(/[^0-9+\-*/().\s]/g, "");
      // eslint-disable-next-line no-new-func
      const v = Function('"use strict"; return (' + expr + ")")();
      return "Hasil: " + v;
    } catch (e) { return "Format: /hitung 1+2*3"; }
  }
  if (low === "/password") return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2, 8);
  if (low === "/uuid") return Date.now().toString(36) + Math.random().toString(36).slice(2);
  if (low.startsWith("/base64 ")) return Buffer.from(arg).toString("base64");
  if (low === "/koin") return Math.random() > 0.5 ? "🪙 Angka" : "🪙 Gambar";
  if (low === "/dadu") return "🎲 " + (1 + Math.floor(Math.random() * 6));
  if (low === "/random") return String(Math.floor(Math.random() * 1000));
  if (low === "/status" || low === "/versi") return "whya-bot v1.0 · online";
  if (low === "/kode" || low === "/js") return "```js\nconsole.log('hello whya');\n```";
  if (low === "/html") return "```html\n<h1>Hello whya</h1>\n```";
  if (low === "/python") return "```python\nprint('hello whya')\n```";
  if (low === "/ai") return "Buka asisten AI di app: /aiwhya";
  if (low === "/link") return "https://whyachtt.vercel.app/dashboard";
  if (low === "/rules") return "Jangan spam. Hormati pengguna lain.";
  if (low.startsWith("/")) return "Perintah tidak dikenal. Ketik /menu";
  return null;
}

const seen = new Set();
async function poll() {
  try {
    const chats = await dbGet("userChats/" + BOT_USER_ID);
    if (!chats) return;
    for (const roomId of Object.keys(chats)) {
      const msgs = await dbGet("chats/" + roomId + "?orderBy=\"timestamp\"&limitToLast=5");
      if (!msgs) continue;
      for (const mid of Object.keys(msgs)) {
        const m = msgs[mid];
        if (!m || seen.has(mid)) continue;
        seen.add(mid);
        if (m.senderId === BOT_USER_ID) continue;
        if (m.isBot) continue;
        const ans = handleCommand(m.text || "");
        if (ans) await replyText(roomId, ans);
      }
    }
    if (seen.size > 5000) seen.clear();
  } catch (e) {
    console.error("poll error", e.message || e);
  }
}

console.log("whya bot running for", BOT_USER_ID, BOT_ACCOUNT_ID);
setInterval(poll, 2500);
poll();
