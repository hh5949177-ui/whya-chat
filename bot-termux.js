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
  "Menu Bot WhyA Chat",
  "------------------------------",
  "1 /menu  2 /ping  3 /info  4 /waktu  5 /help",
  "6 /iqc <teks>  7 /brat <teks>  8 /nokia <teks>",
  "9 /fakeff <nama>  10 /toqr <url>  11 /hd <url>",
  "12 /stc <url gambar>  13 /ttdown <url tiktok>",
  "14 /ytserc <kata kunci>  15 /status  16 /versi",
  "------------------------------",
  "Contoh: /nokia semangat pagi"
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
  if (low.indexOf("/iqc ") === 0 || low === "/iqc") return {
    fullUrl: "https://api.nexadev.my.id/api/canvas/iqc?text=" + encodeURIComponent(arg || "whya"),
    label: "IQC"
  };
  if (low.indexOf("/brat ") === 0 || low === "/brat") return {
    fullUrl: "https://api.nexadev.my.id/api/canvas/brat?text=" + encodeURIComponent(arg || "hai"),
    label: "Brat"
  };
  if (low.indexOf("/nokia ") === 0 || low === "/nokia") {
    var n = new Date();
    var dd = String(n.getDate()).padStart(2,"0");
    var mm = String(n.getMonth()+1).padStart(2,"0");
    var yyyy = n.getFullYear();
    var hh = String(n.getHours()).padStart(2,"0");
    var mi = String(n.getMinutes()).padStart(2,"0");
    return {
      fullUrl: "https://apii.nexadev.my.id/nokia?text=" + encodeURIComponent(arg || "kata-kata hari ini") +
        "&from=" + encodeURIComponent(BOT_NAME || "whya") +
        "&date=" + encodeURIComponent(dd + "/" + mm + "/" + yyyy) +
        "&time=" + encodeURIComponent(hh + ":" + mi) +
        "&title=" + encodeURIComponent("whya"),
      label: "Nokia"
    };
  }
  if (low.indexOf("/fakeff ") === 0 || low === "/fakeff" || low.indexOf("/ff ") === 0 || low === "/ff") {
    return {
      fullUrl: "https://apii.nexadev.my.id/fakeff?usn=" + encodeURIComponent(arg || "whya"),
      label: "Fake FF"
    };
  }
  if (low.indexOf("/toqr ") === 0 || low === "/toqr") {
    if (!arg) return "Format: /toqr <url>";
    return { fullUrl: "https://api.nexadev.my.id/tools/toqr?url=" + encodeURIComponent(arg), label: "QR" };
  }
  if (low.indexOf("/hd ") === 0 || low === "/hd") {
    if (!arg) return "Format: /hd <url gambar>";
    return { fullUrl: "https://api.nexadev.my.id/api/upscale?url=" + encodeURIComponent(arg), label: "HD" };
  }
  if (low.indexOf("/stc ") === 0 || low === "/stc" || low.indexOf("/sticker ") === 0) {
    if (!arg) return "Format: /stc <url gambar>";
    return { fullUrl: arg, label: "Stiker", asSticker: true };
  }
  if (low.indexOf("/ttdown ") === 0 || low === "/ttdown" || low.indexOf("/tiktok ") === 0) {
    if (!arg) return "Format: /ttdown <url tiktok>";
    return { jsonUrl: "https://api.nexadev.my.id/api/snaptik/?url=" + encodeURIComponent(arg), label: "TikTok", kind: "tiktok" };
  }
  if (low.indexOf("/ytserc ") === 0 || low === "/ytserc" || low.indexOf("/ytsearch ") === 0) {
    if (!arg) return "Format: /ytserc <kata kunci>";
    return { jsonUrl: "https://api.nexadev.my.id/tools/ytsearch?q=" + encodeURIComponent(arg), label: "YT Search", kind: "ytsearch", query: arg };
  }
  if (low.charAt(0) === "/") return "Perintah tidak dikenal. Ketik /menu";
  return null;
}


function httpsGetBuffer(urlStr, redirects) {
  redirects = redirects == null ? 3 : redirects;
  return new Promise(function (resolve, reject) {
    var u;
    try { u = new URL(urlStr); } catch (e) { return reject(e); }
    var lib = u.protocol === "http:" ? require("http") : https;
    var req = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 13) WhyaBot/1.2",
          "Accept": "image/*,application/json,*/*",
          "Connection": "close"
        },
        timeout: 90000
      },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          var next = res.headers.location;
          if (next.indexOf("http") !== 0) {
            next = u.protocol + "//" + u.host + next;
          }
          res.resume();
          return resolve(httpsGetBuffer(next, redirects - 1));
        }
        var chunks = [];
        res.on("data", function (c) { chunks.push(c); });
        res.on("end", function () {
          var buf = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            contentType: (res.headers["content-type"] || "").toLowerCase(),
            buffer: buf
          });
        });
      }
    );
    req.on("timeout", function () {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

async function fetchJsonUrl(url) {
  const CF = "https://imghd.hh5949177.workers.dev";
  const list = [CF + "/?url=" + encodeURIComponent(url), CF + "?url=" + encodeURIComponent(url), url];
  let last = null;
  for (const u of list) {
    try {
      const r = await httpsGetBuffer(u);
      if (!r || r.status >= 400) { last = new Error("HTTP " + (r && r.status)); continue; }
      return JSON.parse(r.buffer.toString("utf8"));
    } catch (e) { last = e; }
  }
  throw last || new Error("json fail");
}

async function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

async function fetchCanvasBuffer(pathQuery) {
  var target = (pathQuery && pathQuery.indexOf("http") === 0) ? pathQuery : ("https://api.nexadev.my.id" + pathQuery);
  // 2 format proxy Cloudflare user
  var CF = "https://imghd.hh5949177.workers.dev";
  var candidates = [
    CF + "/?url=" + encodeURIComponent(target),
    CF + "?url=" + encodeURIComponent(target),
    CF + "/" + target.replace(/^https?:\/\//, ""),
    CF + "/proxy?url=" + encodeURIComponent(target),
    target
  ];
  var lastErr = null;
  for (var i = 0; i < candidates.length; i++) {
    for (var attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await sleep(1000 * attempt);
        console.log("canvas try", i, "attempt", attempt, candidates[i].slice(0, 90));
        var r = await httpsGetBuffer(candidates[i]);
        if (!r || r.status >= 400) {
          lastErr = new Error("HTTP " + (r && r.status));
          // 408/520 → coba proxy berikutnya
          if (r && (r.status === 408 || r.status === 520 || r.status === 502 || r.status === 503)) {
            break; // next candidate
          }
          continue;
        }
        var ct = r.contentType || "";
        var buf = r.buffer || Buffer.alloc(0);
        if (ct.indexOf("json") >= 0 || (buf.length < 8000 && buf.slice(0, 1).toString() === "{")) {
          try {
            var j = JSON.parse(buf.toString("utf8"));
            var url = j.url || j.image || j.result || j.data || (j.result && j.result.url);
            if (typeof url === "string" && url.indexOf("http") === 0) {
              // unduh via CF proxy juga
              var imgUrls = [
                CF + "/?url=" + encodeURIComponent(url),
                CF + "?url=" + encodeURIComponent(url),
                url
              ];
              for (var k = 0; k < imgUrls.length; k++) {
                try {
                  var img = await httpsGetBuffer(imgUrls[k]);
                  if (img && img.status < 400 && img.buffer && img.buffer.length > 200) {
                    return { buffer: img.buffer, url: url };
                  }
                } catch (e) {}
              }
              return { url: url };
            }
          } catch (e) {
            lastErr = e;
          }
          continue;
        }
        if (buf.length > 200) {
          var isImg =
            (buf[0] === 0x89 && buf[1] === 0x50) ||
            (buf[0] === 0xff && buf[1] === 0xd8) ||
            (buf[0] === 0x47 && buf[1] === 0x49) ||
            (buf.toString("utf8", 0, 4) === "RIFF") ||
            ct.indexOf("image/") >= 0 ||
            ct.indexOf("octet-stream") >= 0;
          if (isImg) return { buffer: buf };
        }
        lastErr = new Error("bukan gambar (" + ct + ", " + buf.length + "b)");
      } catch (e) {
        lastErr = e;
        // ECONNRESET → next attempt / candidate
      }
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

function httpsPostMultipart(urlStr, fields, fileField, filename, fileBuf, contentType) {
  return new Promise(function (resolve, reject) {
    var boundary = "----Whya" + Date.now() + Math.random().toString(16).slice(2);
    var parts = [];
    Object.keys(fields || {}).forEach(function (k) {
      parts.push(
        Buffer.from(
          "--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + k + "\"\r\n\r\n" +
          fields[k] + "\r\n"
        )
      );
    });
    parts.push(
      Buffer.from(
        "--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + fileField +
        "\"; filename=\"" + filename + "\"\r\nContent-Type: " + (contentType || "image/png") + "\r\n\r\n"
      )
    );
    parts.push(fileBuf);
    parts.push(Buffer.from("\r\n--" + boundary + "--\r\n"));
    var body = Buffer.concat(parts);
    var u = new URL(urlStr);
    var req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data; boundary=" + boundary,
          "Content-Length": body.length,
          "User-Agent": "WhyaBot/1.2"
        },
        timeout: 60000
      },
      function (res) {
        var d = "";
        res.on("data", function (c) { d += c; });
        res.on("end", function () {
          resolve({ status: res.statusCode, text: (d || "").trim() });
        });
      }
    );
    req.on("timeout", function () { req.destroy(); reject(new Error("upload timeout")); });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function uploadBufferCatbox(buf, filename) {
  // catbox
  try {
    var r = await httpsPostMultipart(
      "https://catbox.moe/user/api.php",
      { reqtype: "fileupload" },
      "fileToUpload",
      filename || "canvas.png",
      buf,
      "image/png"
    );
    if (r.text && r.text.indexOf("http") === 0) return r.text;
  } catch (e) {}
  // litterbox 1h
  try {
    var r2 = await httpsPostMultipart(
      "https://litterbox.catbox.moe/resources/internals/api.php",
      { reqtype: "fileupload", time: "24h" },
      "fileToUpload",
      filename || "canvas.png",
      buf,
      "image/png"
    );
    if (r2.text && r2.text.indexOf("http") === 0) return r2.text;
  } catch (e) {}
  throw new Error("upload host gagal");
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
        if (typeof ans === "object" && ans.jsonUrl) {
          await sendText(roomId, (ans.label || "Proses") + "…");
          try {
            const j = await fetchJsonUrl(ans.jsonUrl);
            if (ans.kind === "tiktok") {
              const video = j && (j.url || j.download || (j.data && (j.data.hdplay || j.data.play || j.data.wmplay || j.data.url)));
              const title = (j && (j.title || (j.data && j.data.title))) || "TikTok";
              if (video) {
                await dbPost("chats/" + roomId, { type: "video", mediaUrl: video, url: video, text: String(title).slice(0,120), senderId: BOT_USER_ID, senderName: BOT_NAME, timestamp: Date.now(), isBot: true });
              } else await sendText(roomId, "Gagal ambil video TikTok.");
            } else if (ans.kind === "ytsearch") {
              const list = (j && (j.result || j.results || j.data || j.items)) || [];
              let lines = ["Hasil YouTube: " + (ans.query || ""), ""];
              (Array.isArray(list) ? list : []).slice(0, 8).forEach((it, idx) => {
                const title = it.title || it.name || "Video";
                const url = it.url || it.link || (it.id ? ("https://youtu.be/" + it.id) : "");
                lines.push((idx + 1) + ". " + title + (url ? ("\n" + url) : ""));
              });
              await sendText(roomId, lines.join("\n") || "Tidak ada hasil.");
            } else {
              await sendText(roomId, JSON.stringify(j).slice(0, 1500));
            }
          } catch (e) {
            await sendText(roomId, "Gagal: " + (e.message || e));
          }
        } else if (typeof ans === "object" && (ans.canvas || ans.fullUrl)) {
          await sendText(roomId, "Membuat " + (ans.label || "canvas") + "…");
          try {
            let img = await fetchCanvasBuffer(ans.fullUrl || ans.canvas);
            if (!img && ans.alts) {
              for (const p of ans.alts) {
                img = await fetchCanvasBuffer(p);
                if (img) break;
              }
            }
            const msgType = ans.asSticker ? "sticker" : "image";
            if (img && img.url) {
              await dbPost("chats/" + roomId, {
                type: msgType, mediaUrl: img.url, imageUrl: img.url, url: img.url,
                text: ans.asSticker ? "" : (ans.label || ""), senderId: BOT_USER_ID, senderName: BOT_NAME,
                timestamp: Date.now(), isBot: true
              });
            } else if (img && img.buffer) {
              const up = await uploadBufferCatbox(img.buffer, "canvas.png");
              await dbPost("chats/" + roomId, {
                type: msgType, mediaUrl: up, imageUrl: up, url: up,
                text: ans.asSticker ? "" : (ans.label || ""), senderId: BOT_USER_ID, senderName: BOT_NAME,
                timestamp: Date.now(), isBot: true
              });
            } else {
              await sendText(roomId, "Gagal membuat gambar canvas. Coba lagi / cek jaringan Termux.");
            }
          } catch (e) {
            await sendText(roomId, "Gagal canvas: " + (e && e.message ? e.message : e) + " — coba lagi.");
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
