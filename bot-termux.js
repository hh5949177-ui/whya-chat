/**
 * ============================================================
 *  whya Bot — untuk Termux (tanpa npm package)
 * ============================================================
 *
 * CARA JALANKAN:
 *   1) pkg update && pkg install nodejs
 *   2) Buka app whya → Pengaturan → Jadi Bot → aktifkan
 *   3) Salin "ID akun (internal)" dan "ID akun (public)"
 *   4) Edit bagian ISI DI BAWAH
 *   5) node bot-termux.js
 *
 * Biarkan Termux tetap terbuka agar bot online.
 * User chat pribadi ke akun bot, ketik: /menu
 * ============================================================
 */

const https = require("https");

// ============== ISI DI BAWAH (dari app Jadi Bot) ==============
const BOT_USER_ID = "ISI_USER_ID_BOT";      // ID internal (users/...)
const BOT_ACCOUNT_ID = "ISI_PUBLIC_ID_BOT"; // Public ID
const BOT_NAME = "whya-bot";
const DATABASE_URL =
  "https://chat2-b2a96-default-rtdb.asia-southeast1.firebasedatabase.app";
const POLL_MS = 2500;
// ==============================================================

const MENU_LINES = [
  "1. /ping — cek bot aktif",
  "2. /info — info akun bot",
  "3. /waktu — waktu sekarang (WIB)",
  "4. /help — bantuan singkat",
  "5. /quote — kutipan random",
  "6. /fakta — fakta singkat",
  "7. /tebak — tebak angka 1-10",
  "8. /echo <teks> — ulangi pesan",
  "9. /caps <teks> — huruf besar",
  "10. /reverse <teks> — balik teks",
  "11. /hitung <a+b> — kalkulator",
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
  "25. /owner — info owner",
  "26. /rules — aturan bot",
  "27. /fitur — daftar fitur pendek",
  "28. /status — status bot online",
  "29. /versi — versi bot",
  "30. /random — angka acak 0-999",
  "31. /koin — lempar koin",
  "32. /dadu — lempar dadu 1-6",
  "33. /warna — warna random",
  "34. /nama — ide nama random",
  "35. /menu — tampilkan menu ini",
  "36. /clear — info hapus chat",
  "37. /link — link app whya",
  "38. /ai — arahkan ke asisten AI",
  "39. /broadcast — info broadcast",
  "40. /stop — cara matikan bot di app"
];

const QUOTES = [
  "Konsisten lebih penting daripada sempurna.",
  "Bug hari ini, pelajaran besok.",
  "Sedikit kemajuan setiap hari tetap kemajuan.",
  "Kode yang rapi menyelamatkan waktu nanti."
];
const FAKTA = [
  "Termux bisa menjalankan Node.js di Android.",
  "Firebase Realtime Database memakai HTTP REST.",
  "Base64 menambah ukuran data sekitar 33%."
];
const NAMA = ["Alya", "Raka", "Sinta", "Dimas", "Naufal", "Putri", "Bima", "Kirana"];
const WARNA = ["Merah", "Biru", "Hijau", "Kuning", "Ungu", "Hitam", "Putih", "Orange"];

function dbRequest(method, path, body) {
  return new Promise(function (resolve, reject) {
    var clean = String(path || "").replace(/^\//, "");
    var url = new URL(DATABASE_URL.replace(/\/$/, "") + "/" + clean + ".json");
    var data = body != null ? JSON.stringify(body) : null;
    var opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: { "Content-Type": "application/json" }
    };
    if (data) opts.headers["Content-Length"] = Buffer.byteLength(data);
    var req = https.request(opts, function (res) {
      var raw = "";
      res.on("data", function (c) { raw += c; });
      res.on("end", function () {
        if (res.statusCode >= 400) {
          return reject(new Error("HTTP " + res.statusCode + " " + raw.slice(0, 200)));
        }
        if (!raw || raw === "null") return resolve(null);
        try { resolve(JSON.parse(raw)); } catch (e) { resolve(raw); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function dbGet(path) { return dbRequest("GET", path, null); }
function dbPost(path, body) { return dbRequest("POST", path, body); }
function dbPatch(path, body) { return dbRequest("PATCH", path, body); }

async function sendText(roomId, text) {
  var payload = {
    type: "text",
    text: String(text),
    senderId: BOT_USER_ID,
    senderName: BOT_NAME,
    timestamp: Date.now(),
    isBot: true
  };
  await dbPost("chats/" + roomId, payload);
  try {
    await dbPatch("userChats/" + BOT_USER_ID + "/" + roomId, {
      lastMessage: String(text).slice(0, 80),
      lastTime: Date.now()
    });
  } catch (e) {}
}

function handleCommand(text) {
  var t = String(text || "").trim();
  if (!t) return null;
  var low = t.toLowerCase();
  var arg = t.split(/\s+/).slice(1).join(" ").trim();

  if (low === "/menu" || low === "menu") {
    return "🤖 *Menu Bot whya*\n\n" + MENU_LINES.join("\n") + "\n\nContoh: /ping atau /hitung 2+3";
  }
  if (low === "/ping") return "pong ✅ Bot aktif";
  if (low === "/info") {
    return "Bot: " + BOT_NAME + "\nUser ID: " + BOT_USER_ID + "\nAccount ID: " + BOT_ACCOUNT_ID;
  }
  if (low === "/waktu" || low === "/waktuindo") {
    return "🕒 " + new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
  }
  if (low === "/help") return "Ketik /menu untuk semua fitur. Contoh: /ping";
  if (low === "/quote") return "💬 " + QUOTES[Math.floor(Math.random() * QUOTES.length)];
  if (low === "/fakta") return "📌 " + FAKTA[Math.floor(Math.random() * FAKTA.length)];
  if (low === "/tebak") return "Tebak angka 1-10: saya bilang " + (1 + Math.floor(Math.random() * 10));
  if (low.indexOf("/echo ") === 0) return arg || "(kosong)";
  if (low.indexOf("/caps ") === 0) return (arg || "").toUpperCase();
  if (low.indexOf("/reverse ") === 0) return (arg || "").split("").reverse().join("");
  if (low.indexOf("/hitung ") === 0) {
    try {
      var expr = arg.replace(/[^0-9+\-*/().\s]/g, "");
      if (!expr) return "Format: /hitung 1+2*3";
      var v = Function('"use strict"; return (' + expr + ")")();
      return "Hasil: " + v;
    } catch (e) {
      return "Format: /hitung 1+2*3";
    }
  }
  if (low === "/doa") return "Semoga diberikan kemudahan dan kelancaran. Aamiin.";
  if (low === "/motivasi") return "💪 " + QUOTES[Math.floor(Math.random() * QUOTES.length)];
  if (low === "/cuaca") return "Cek cuaca lokal. Bawa payung jika mendung.";
  if (low.indexOf("/translate ") === 0) return "Tips terjemah via AI app (/ai). Teks: " + arg;
  if (low === "/kode" || low === "/js") return "```js\nconsole.log('hello whya');\n```";
  if (low === "/html") return "```html\n<h1>Hello whya</h1>\n```";
  if (low === "/python") return "```python\nprint('hello whya')\n```";
  if (low === "/json") return '{"ok":true,"app":"whya"}';
  if (low === "/password") {
    return "🔑 " + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2, 8);
  }
  if (low === "/uuid") return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  if (low.indexOf("/base64 ") === 0) return Buffer.from(arg, "utf8").toString("base64");
  if (low === "/owner") return "Hubungi owner aplikasi melalui kanal resmi.";
  if (low === "/rules") return "Aturan: jangan spam, hormati privasi.";
  if (low === "/fitur") return "Utama: /menu /ping /hitung /password /kode /status";
  if (low === "/status") return "✅ Bot online (Termux)";
  if (low === "/versi") return "whya-bot Termux v1.1";
  if (low === "/random") return String(Math.floor(Math.random() * 1000));
  if (low === "/koin") return Math.random() > 0.5 ? "🪙 Angka" : "🪙 Gambar";
  if (low === "/dadu") return "🎲 " + (1 + Math.floor(Math.random() * 6));
  if (low === "/warna") return "🎨 " + WARNA[Math.floor(Math.random() * WARNA.length)];
  if (low === "/nama") return "👤 " + NAMA[Math.floor(Math.random() * NAMA.length)];
  if (low === "/clear") return "Hapus chat dari sisi aplikasi.";
  if (low === "/link") return "https://whyachtt.vercel.app/dashboard";
  if (low === "/ai") return "Buka asisten AI di app: /aiwhya";
  if (low === "/broadcast") return "Broadcast hanya dari panel admin.";
  if (low === "/stop") return "Matikan: Pengaturan → Jadi Bot → nonaktif. Stop Termux: Ctrl+C.";
  if (low.indexOf("/iqc ") === 0 || low === "/iqc") return { canvas: "/api/canvas/iqc?text=" + encodeURIComponent(arg || "whya"), label: "IQC" };
  if (low.indexOf("/brat ") === 0 || low === "/brat") return { canvas: "/api/canvas/brat?text=" + encodeURIComponent(arg || "whya"), label: "Brat" };
  if (low.indexOf("/nokia ") === 0 || low === "/nokia") return { canvas: "/api/canvas/nokia?text=" + encodeURIComponent(arg || "whya"), label: "Nokia" };
  if (low.indexOf("/quoteimg ") === 0) return { canvas: "/api/canvas/quote?text=" + encodeURIComponent(arg || "whya"), label: "Quote" };
  if (low.indexOf("/ytcomment ") === 0) return { canvas: "/api/canvas/ytcomment?text=" + encodeURIComponent(arg || "whya"), label: "YT" };
  if (low.indexOf("/tweet ") === 0) return { canvas: "/api/canvas/tweet?text=" + encodeURIComponent(arg || "whya"), label: "Tweet" };
  if (low.indexOf("/fakeff ") === 0 || low === "/fakeff" || low.indexOf("/ff ") === 0 || low === "/ff") {
    return { canvas: "/api/canvas/fakeff?name=" + encodeURIComponent(arg || "Player"), label: "Fake FF", alts: [
      "/api/canvas/fakeff?name=" + encodeURIComponent(arg || "Player"),
      "/api/canvas/ff?name=" + encodeURIComponent(arg || "Player"),
      "/api/canvas/fakeface?name=" + encodeURIComponent(arg || "Player"),
      "/api/canvas/freefire?name=" + encodeURIComponent(arg || "Player")
    ]};
  }
  if (low.charAt(0) === "/") return "Perintah tidak dikenal. Ketik /menu";
  return null;
}

async function fetchCanvasBuffer(pathQuery) {
  const target = "https://api.nexadev.my.id" + pathQuery;
  const proxy = "https://imghd.hh5949177.workers.dev/?url=" + encodeURIComponent(target);
  for (const u of [target, proxy]) {
    try {
      const res = await fetch(u);
      if (!res.ok) continue;
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("json") || ct.includes("text/")) {
        const j = await res.json().catch(() => null);
        const url = j && (j.url || j.image || j.result);
        if (url) return { url };
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) continue;
      return { buffer: buf };
    } catch (e) {}
  }
  return null;
}

async function uploadBufferCatbox(buf, filename) {
  // Termux may not have form-data; use raw multipart
  const boundary = "----Whya" + Date.now();
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, buf, tail]);
  return new Promise((resolve, reject) => {
    const url = new URL("https://catbox.moe/user/api.php");
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data; boundary=" + boundary,
          "Content-Length": body.length
        }
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          const t = (d || "").trim();
          if (t.indexOf("http") === 0) resolve(t);
          else reject(new Error(t || "upload fail"));
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}


var seen = new Set();
var tick = 0;

async function pollOnce() {
  tick++;
  if (!BOT_USER_ID || BOT_USER_ID.indexOf("ISI_") === 0) {
    console.error("Isi BOT_USER_ID dulu (Pengaturan → Jadi Bot).");
    return;
  }
  var chats = await dbGet("userChats/" + BOT_USER_ID);
  if (!chats || typeof chats !== "object") return;
  var roomIds = Object.keys(chats);

  for (var i = 0; i < roomIds.length; i++) {
    var roomId = roomIds[i];
    var msgs = await dbGet("chats/" + roomId);
    if (!msgs || typeof msgs !== "object") continue;

    var entries = Object.keys(msgs).map(function (k) {
      var m = msgs[k] || {};
      m.id = k;
      return m;
    });
    entries.sort(function (a, b) { return (a.timestamp || 0) - (b.timestamp || 0); });
    var recent = entries.slice(-8);

    for (var j = 0; j < recent.length; j++) {
      var m = recent[j];
      if (!m.id || seen.has(m.id)) continue;
      seen.add(m.id);
      if (m.senderId === BOT_USER_ID) continue;
      if (m.isBot) continue;
      if (m.type && m.type !== "text") continue;

      var ans = handleCommand(m.text || "");
      if (ans) {
        console.log("[" + roomId + "] <=", String(m.text || "").slice(0, 60));
        if (typeof ans === "object" && ans.canvas) {
          await sendText(roomId, "🎨 Membuat " + (ans.label || "canvas") + "…");
          try {
            let img = await fetchCanvasBuffer(ans.canvas);
            if (!img && ans.alts) {
              for (const p of ans.alts) {
                img = await fetchCanvasBuffer(p);
                if (img) break;
              }
            }
            if (img && img.url) {
              await dbPost("chats/" + roomId, {
                type: "image", mediaUrl: img.url, imageUrl: img.url, url: img.url,
                text: ans.label || "", senderId: BOT_USER_ID, senderName: BOT_NAME,
                timestamp: Date.now(), isBot: true
              });
            } else if (img && img.buffer) {
              const up = await uploadBufferCatbox(img.buffer, "canvas.png");
              await dbPost("chats/" + roomId, {
                type: "image", mediaUrl: up, imageUrl: up, url: up,
                text: ans.label || "", senderId: BOT_USER_ID, senderName: BOT_NAME,
                timestamp: Date.now(), isBot: true
              });
            } else {
              await sendText(roomId, "Gagal membuat gambar canvas.");
            }
          } catch (e) {
            await sendText(roomId, "Gagal canvas: " + (e.message || e));
          }
        } else {
          await sendText(roomId, ans);
        }
      }
    }
  }

  if (seen.size > 8000) {
    var arr = Array.from(seen);
    seen.clear();
    arr.slice(-2000).forEach(function (x) { seen.add(x); });
  }
  if (tick % 20 === 0) console.log("heartbeat · rooms:", roomIds.length);
}

async function markBotOnline() {
  try {
    await dbPatch("botAccounts/" + BOT_USER_ID, {
      enabled: true,
      userId: BOT_USER_ID,
      accountId: BOT_ACCOUNT_ID,
      name: BOT_NAME,
      termuxOnline: true,
      lastSeen: Date.now()
    });
  } catch (e) {
    console.warn("mark online:", e.message || e);
  }
}

console.log("====================================");
console.log(" whya bot Termux v1.1");
console.log(" USER:", BOT_USER_ID);
console.log(" ACC :", BOT_ACCOUNT_ID);
console.log("====================================");

if (BOT_USER_ID.indexOf("ISI_") === 0) {
  console.log("⚠ Edit file ini: isi BOT_USER_ID dan BOT_ACCOUNT_ID");
}

markBotOnline();
setInterval(function () {
  pollOnce().catch(function (e) { console.error("poll", e.message || e); });
}, POLL_MS);
pollOnce().catch(function (e) { console.error("poll", e.message || e); });
