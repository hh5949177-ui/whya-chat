/**
 * ============================================================
 *  WhyA Bot — Termux (pairing kode)
 * ============================================================
 *  1) pkg install nodejs
 *  2) node bot-termux.js
 *  3) Masukkan email → dapat kode (whya-xxxx)
 *  4) Di app: Pengaturan → Jadi Bot → Tautkan Bot → isi kode
 *  5) Biarkan Termux tetap jalan
 * ============================================================
 */

const https = require("https");
const http = require("http");
const { URL } = require("url");
const readline = require("readline");

const SUPABASE_URL = "https://wjmxiedkyklmmoxcxjlw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_TMNireG8PZENCgtHdh-HQA_BkAlGAle";
const POLL_MS = 2500;
const BOT_WEB_URL = "https://whyachtt.vercel.app";
const BOT_BANNER_URL = "https://whyachtt.vercel.app/bot-banner.png";
const CF_PROXIES = ["https://imghd.hh5949177.workers.dev"];

// diisi setelah pairing sukses
var BOT_USER_ID = "";
var BOT_ACCOUNT_ID = "";
var BOT_NAME = "whyaBot";
var BOT_PHOTO = null;
var BOT_EMAIL = "";
var PAIR_CODE = "";

const MENU_TEXT =
  "✦ WhyA Bot Menu\n" +
  "────────────────\n" +
  "\n〔 UTAMA 〕\n" +
  "• /menu\n• /ping\n• /info\n• /waktu\n• /status\n• /versi\n• /link\n• /ai\n• /stop\n• /motivasi\n" +
  "\n〔 CANVAS / MAKER 〕\n" +
  "• /iqc teks\n• /brat teks\n• /brathd teks\n• /nokia teks\n• /fakeff nama\n• /qc teks\n• /qr teks\n• /toqr url\n" +
  "\n〔 MEDIA 〕\n" +
  "• /hd url_gambar\n• /ssweb url\n• /ttdown url_tiktok\n• /ytserc kata kunci\n" +
  "\n〔 ISLAMI 〕\n" +
  "• /ayatkursi\n• /asmaulhusna\n• /niatsholat\n" +
  "\n〔 ANIME 〕\n" +
  "• /waifu\n• /neko\n• /cosplay\n" +
  "\n〔 TOOLS 〕\n" +
  "• /hitung 1+2*3\n• /password\n• /uuid\n• /base64 teks\n• /dadu\n• /koin\n• /random\n• /warna\n• /nama\n" +
  "\nWeb: " + BOT_WEB_URL;

const QUOTES = [
  "Konsisten lebih penting daripada sempurna.",
  "Bug hari ini, pelajaran besok.",
  "Sedikit kemajuan setiap hari tetap kemajuan."
];
const NAMA = ["Alya", "Raka", "Sinta", "Dimas", "Naufal", "Putri", "Bima", "Kirana"];
const WARNA = ["Merah", "Biru", "Hijau", "Kuning", "Ungu", "Hitam", "Putih", "Orange"];
const ASMAUL = [
  "1. Ar-Rahman — Maha Pengasih",
  "2. Ar-Rahim — Maha Penyayang",
  "3. Al-Malik — Maha Merajai",
  "4. Al-Quddus — Maha Suci",
  "5. As-Salam — Maha Sejahtera",
  "6. Al-Mu'min — Maha Memberi Keamanan",
  "7. Al-Muhaymin — Maha Mengawasi",
  "8. Al-Aziz — Maha Perkasa",
  "9. Al-Jabbar — Maha Memaksa",
  "10. Al-Mutakabbir — Maha Megah"
];

function normPath(p) {
  return String(p || "").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}
function parentPath(p) {
  p = normPath(p);
  var i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}
function childKey(p) {
  p = normPath(p);
  var i = p.lastIndexOf("/");
  return i < 0 ? p : p.slice(i + 1);
}
function pushId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
function genPairCode() {
  var a = Math.random().toString(36).slice(2, 6);
  return "whya-" + a;
}

function sbRequest(method, pathWithQuery, body) {
  return new Promise(function (resolve, reject) {
    var url = new URL(SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/" + pathWithQuery.replace(/^\//, ""));
    var data = body != null ? JSON.stringify(body) : null;
    var headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      Accept: "application/json",
      "Content-Type": "application/json"
    };
    if (method === "POST" && /rt_nodes/i.test(pathWithQuery)) {
      headers.Prefer = "resolution=merge-duplicates,return=minimal";
    } else if (method === "POST" || method === "PATCH") {
      headers.Prefer = "return=minimal";
    }
    var opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: headers
    };
    if (data) opts.headers["Content-Length"] = Buffer.byteLength(data);
    var req = https.request(opts, function (res) {
      var raw = "";
      res.on("data", function (c) { raw += c; });
      res.on("end", function () {
        if (res.statusCode >= 400) {
          return reject(new Error("HTTP " + res.statusCode + " " + raw.slice(0, 220)));
        }
        if (!raw) return resolve(null);
        try { resolve(JSON.parse(raw)); } catch (e) { resolve(raw); }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, function () { req.destroy(new Error("timeout")); });
    if (data) req.write(data);
    req.end();
  });
}

async function dbGet(path) {
  path = normPath(path);
  var exact = await sbRequest(
    "GET",
    "rt_nodes?path=eq." + encodeURIComponent(path) + "&select=data&limit=1"
  );
  if (Array.isArray(exact) && exact.length && exact[0].data !== undefined) {
    return exact[0].data;
  }
  var kids = await sbRequest(
    "GET",
    "rt_nodes?parent=eq." + encodeURIComponent(path) + "&select=path,data"
  );
  if (!Array.isArray(kids) || !kids.length) return null;
  var obj = {};
  kids.forEach(function (row) {
    obj[childKey(row.path)] = row.data;
  });
  return obj;
}

async function dbSet(path, data) {
  path = normPath(path);
  await sbRequest("POST", "rt_nodes?on_conflict=path", {
    path: path,
    parent: parentPath(path),
    data: data === undefined ? null : data,
    is_leaf: true,
    updated_at: new Date().toISOString()
  });
}

async function dbPost(path, data) {
  var id = pushId();
  await dbSet(normPath(path) + "/" + id, data);
  return id;
}

async function sendText(roomId, text) {
  return dbPost("chats/" + roomId, {
    type: "text",
    text: String(text || ""),
    senderId: BOT_USER_ID,
    senderName: BOT_NAME,
    sender: BOT_NAME,
    photoURL: BOT_PHOTO,
    avatar: (BOT_NAME || "B").charAt(0),
    timestamp: Date.now(),
    isBot: true
  });
}

async function sendImage(roomId, imageUrl, caption) {
  var cap = caption ? String(caption) : "";
  return dbPost("chats/" + roomId, {
    type: "image",
    mediaUrl: imageUrl,
    imageUrl: imageUrl,
    url: imageUrl,
    caption: cap,
    text: cap,
    senderId: BOT_USER_ID,
    senderName: BOT_NAME,
    sender: BOT_NAME,
    photoURL: BOT_PHOTO,
    avatar: (BOT_NAME || "B").charAt(0),
    timestamp: Date.now(),
    isBot: true,
    mime: "image/png",
    fileName: null
  });
}

function httpsGetBuffer(urlStr, redirects) {
  redirects = redirects || 0;
  return new Promise(function (resolve, reject) {
    var u;
    try { u = new URL(urlStr); } catch (e) { return reject(e); }
    var lib = u.protocol === "http:" ? http : https;
    var req = lib.get(
      urlStr,
      { timeout: 35000, headers: { "User-Agent": "WhyABot/2.2", Accept: "*/*" } },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
          res.resume();
          return resolve(httpsGetBuffer(res.headers.location, redirects + 1));
        }
        var chunks = [];
        res.on("data", function (c) { chunks.push(c); });
        res.on("end", function () {
          var buf = Buffer.concat(chunks);
          if (res.statusCode >= 400) {
            return reject(new Error("GET " + res.statusCode));
          }
          resolve(buf);
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", function () {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function fetchJsonUrl(url) {
  var buf = await httpsGetBuffer(url);
  return JSON.parse(buf.toString("utf8"));
}

async function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

async function fetchImageBuffer(fullUrl) {
  var tries = [fullUrl].concat(
    CF_PROXIES.map(function (cf) {
      return cf.replace(/\/$/, "") + "/proxy?url=" + encodeURIComponent(fullUrl);
    })
  );
  var lastErr = null;
  for (var i = 0; i < tries.length; i++) {
    try {
      var buf = await httpsGetBuffer(tries[i]);
      if (buf && buf.length > 80) return buf;
    } catch (e) {
      lastErr = e;
      await sleep(250);
    }
  }
  throw lastErr || new Error("Gagal unduh gambar");
}

async function resolveImageSrc(fullUrl) {
  try {
    var buf = await fetchImageBuffer(fullUrl);
    if (buf.length > 850000) return fullUrl;
    var mime = "image/png";
    if (buf[0] === 0xff && buf[1] === 0xd8) mime = "image/jpeg";
    else if (buf[0] === 0x47 && buf[1] === 0x49) mime = "image/gif";
    return "data:" + mime + ";base64," + buf.toString("base64");
  } catch (e) {
    return fullUrl;
  }
}

function ask(question) {
  var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(function (resolve) {
    rl.question(question, function (ans) {
      rl.close();
      resolve(String(ans || "").trim());
    });
  });
}

async function runPairing() {
  console.log("\n=== WhyA Bot Pairing ===\n");
  var email = await ask("Masukkan email akun WhyA: ");
  if (!email || email.indexOf("@") < 0) {
    console.error("Email tidak valid.");
    process.exit(1);
  }
  BOT_EMAIL = email.toLowerCase();
  PAIR_CODE = genPairCode();
  console.log("\nMemproses…");
  await dbSet("botPairCodes/" + PAIR_CODE, {
    email: BOT_EMAIL,
    code: PAIR_CODE,
    createdAt: Date.now(),
    used: false,
    platform: "Termux",
    name: "Termux Bot"
  });
  console.log("\n=================================");
  console.log("  KODE PAIRING ANDA:");
  console.log("  " + PAIR_CODE);
  console.log("=================================");
  console.log("\nBuka app WhyA → Pengaturan → Jadi Bot");
  console.log("→ Tautkan Bot → masukkan kode di atas.\n");
  console.log("Menunggu penautan");
  for (var i = 0; i < 120; i++) {
    process.stdout.write(".");
    var data = await dbGet("botPairCodes/" + PAIR_CODE);
    if (data && data.used && data.userId) {
      BOT_USER_ID = data.userId;
      BOT_ACCOUNT_ID = data.accountId || data.userId;
      console.log("\n\n✓ Bot tertaut ke akun:", BOT_USER_ID);
      // ambil profil
      try {
        var u = await dbGet("users/" + BOT_USER_ID);
        if (u) {
          BOT_NAME = u.name || u.displayName || BOT_NAME;
          BOT_PHOTO = u.photoURL || u.avatarUrl || null;
        }
      } catch (e) {}
      await dbSet("botAccounts/" + BOT_USER_ID + "/lastSeen", Date.now());
      return;
    }
    await sleep(3000);
  }
  console.error("\nTimeout menunggu pairing. Jalankan ulang.");
  process.exit(1);
}

function handleCommand(text) {
  var raw = String(text || "").trim();
  if (!raw) return null;
  var low = raw.toLowerCase();
  var arg = raw.replace(/^\S+\s*/, "").trim();

  if (low === "/menu" || low === "menu" || low === "/help") return { kind: "menu" };
  if (low === "/ping") return { kind: "text", text: "pong ✅" };
  if (low === "/info") {
    return { kind: "text", text: "WhyA Bot · " + BOT_NAME + "\nEmail: " + BOT_EMAIL + "\nID: " + BOT_USER_ID };
  }
  if (low === "/waktu") return { kind: "text", text: new Date().toLocaleString("id-ID") };
  if (low === "/status") return { kind: "text", text: "✅ Bot online (Termux)" };
  if (low === "/versi") return { kind: "text", text: "whya-bot Termux v2.2 (pairing)" };
  if (low === "/link") return { kind: "text", text: BOT_WEB_URL + "/dashboard" };
  if (low === "/ai") return { kind: "text", text: "Buka asisten AI di app: /aiwhya" };
  if (low === "/stop") return { kind: "text", text: "Stop Termux: Ctrl+C. Lepas bot di app: Jadi Bot." };
  if (low === "/motivasi") {
    return { kind: "text", text: "💪 " + QUOTES[Math.floor(Math.random() * QUOTES.length)] };
  }
  if (low === "/password") {
    return { kind: "text", text: "🔑 " + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2, 8) };
  }
  if (low === "/uuid") {
    return { kind: "text", text: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10) };
  }
  if (low.indexOf("/base64 ") === 0) {
    return { kind: "text", text: Buffer.from(arg, "utf8").toString("base64") };
  }
  if (low === "/random") return { kind: "text", text: String(Math.floor(Math.random() * 1000)) };
  if (low === "/koin") return { kind: "text", text: Math.random() > 0.5 ? "🪙 Angka" : "🪙 Gambar" };
  if (low === "/dadu") return { kind: "text", text: "🎲 " + (1 + Math.floor(Math.random() * 6)) };
  if (low === "/warna") return { kind: "text", text: "🎨 " + WARNA[Math.floor(Math.random() * WARNA.length)] };
  if (low === "/nama") return { kind: "text", text: "👤 " + NAMA[Math.floor(Math.random() * NAMA.length)] };
  if (low.indexOf("/hitung ") === 0) {
    try {
      if (!/^[\d\s+\-*/().]+$/.test(arg)) return { kind: "text", text: "Format: /hitung 1+2*3" };
      var v = Function('"use strict"; return (' + arg + ")")();
      return { kind: "text", text: "Hasil: " + v };
    } catch (e) {
      return { kind: "text", text: "Gagal hitung" };
    }
  }
  if (low === "/ayatkursi" || low === "/akursi") {
    return {
      kind: "text",
      text: "📖 Ayat Kursi (Al-Baqarah:255)\n\nAllahu laa ilaaha illaa huwal hayyul qayyuum..."
    };
  }
  if (low === "/asmaulhusna" || low === "/asma") {
    return { kind: "text", text: "✨ Asmaul Husna (1–10)\n\n" + ASMAUL.join("\n") };
  }
  if (low === "/niatsholat" || low === "/niat") {
    return { kind: "text", text: "🕌 Niat Sholat Fardhu\n• Subuh · Dzuhur · Ashar · Maghrib · Isya" };
  }
  if (low === "/waifu") {
    return { kind: "image", url: "https://api.waifu.pics/sfw/waifu", jsonPick: "url", caption: "" };
  }
  if (low === "/neko") {
    return { kind: "image", url: "https://api.waifu.pics/sfw/neko", jsonPick: "url", caption: "" };
  }
  if (low === "/cosplay") {
    return { kind: "image", url: "https://api.waifu.pics/sfw/shinobu", jsonPick: "url", caption: "" };
  }
  if (low.indexOf("/iqc") === 0) {
    return {
      kind: "image",
      url: "https://api.nexadev.my.id/api/canvas/iqc?text=" + encodeURIComponent(arg || "whya"),
      caption: ""
    };
  }
  if (low.indexOf("/brathd") === 0) {
    return {
      kind: "image",
      url: "https://api-faa.my.id/faa/brathd?text=" + encodeURIComponent(arg || "hai"),
      caption: ""
    };
  }
  if (low.indexOf("/brat") === 0) {
    return {
      kind: "image",
      url: "https://api.nexadev.my.id/api/canvas/brat?text=" + encodeURIComponent(arg || "hai"),
      caption: ""
    };
  }
  if (low.indexOf("/nokia") === 0) {
    var now = new Date();
    return {
      kind: "image",
      url:
        "https://apii.nexadev.my.id/nokia?text=" +
        encodeURIComponent(arg || "kata-kata hari ini") +
        "&from=whya&date=" +
        encodeURIComponent(now.toLocaleDateString("id-ID")) +
        "&time=" +
        encodeURIComponent(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })) +
        "&title=whya",
      caption: ""
    };
  }
  if (low.indexOf("/fakeff") === 0) {
    return {
      kind: "image",
      url: "https://apii.nexadev.my.id/fakeff?usn=" + encodeURIComponent(arg || "whya"),
      caption: ""
    };
  }
  if (low.indexOf("/qc") === 0 || low.indexOf("/quote") === 0) {
    return {
      kind: "image",
      url: "https://api.nexadev.my.id/api/canvas/iqc?text=" + encodeURIComponent(arg || "quote"),
      caption: ""
    };
  }
  if (low.indexOf("/toqr") === 0 || low.indexOf("/qr") === 0) {
    if (!arg) return { kind: "text", text: "Format: /qr teks" };
    return {
      kind: "image",
      url: "https://quickchart.io/qr?text=" + encodeURIComponent(arg) + "&size=400",
      caption: ""
    };
  }
  if (low.indexOf("/ssweb") === 0 || low === "/ss") {
    if (!arg) return { kind: "text", text: "Format: /ssweb https://example.com" };
    var u = arg;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return { kind: "image", url: "https://image.thum.io/get/width/800/" + u, caption: "" };
  }
  if (low.indexOf("/hd ") === 0 || low === "/hd") {
    if (!arg) return { kind: "text", text: "Format: /hd https://gambar.jpg" };
    return {
      kind: "image",
      url: "https://api.nexadev.my.id/api/upscale?url=" + encodeURIComponent(arg),
      caption: ""
    };
  }
  if (low.indexOf("/ttdown") === 0) {
    if (!arg) return { kind: "text", text: "Format: /ttdown <url tiktok>" };
    return {
      kind: "json_media",
      jsonUrl: "https://www.tikwm.com/api/?url=" + encodeURIComponent(arg) + "&hd=1",
      label: "TikTok"
    };
  }
  if (low.indexOf("/ytserc") === 0 || low.indexOf("/ytsearch") === 0) {
    if (!arg) return { kind: "text", text: "Format: /ytserc kata kunci" };
    return {
      kind: "json_list",
      jsonUrl: "https://api.nexadev.my.id/tools/ytsearch?q=" + encodeURIComponent(arg),
      label: "YT"
    };
  }
  if (low.charAt(0) === "/") return { kind: "text", text: "Perintah tidak dikenal. Ketik /menu" };
  return null;
}

async function handleAnswer(roomId, ans) {
  if (!ans) return;
  if (ans.kind === "menu") {
    await sendImage(roomId, BOT_BANNER_URL, MENU_TEXT);
    return;
  }
  if (ans.kind === "text") {
    await sendText(roomId, ans.text || "");
    return;
  }
  if (ans.kind === "image") {
    try {
      var src = ans.url;
      if (ans.jsonPick) {
        var j = await fetchJsonUrl(ans.url);
        src = j && (j[ans.jsonPick] || j.url || j.image);
        if (!src) throw new Error("URL kosong");
      } else {
        src = await resolveImageSrc(ans.url);
      }
      await sendImage(roomId, src, ans.caption || "");
    } catch (e) {
      await sendText(roomId, "Gagal membuat gambar: " + (e.message || e));
    }
    return;
  }
  if (ans.kind === "json_media") {
    try {
      var data = await fetchJsonUrl(ans.jsonUrl);
      var media =
        (data && data.data && (data.data.hdplay || data.data.play || data.data.wmplay)) ||
        (data && (data.url || data.download)) ||
        null;
      if (!media) {
        await sendText(roomId, "Media tidak ditemukan.");
        return;
      }
      var isVid = /\.mp4|video|play/i.test(String(media));
      if (isVid) {
        await dbPost("chats/" + roomId, {
          type: "video",
          mediaUrl: media,
          url: media,
          caption: ans.label || "",
          text: ans.label || "",
          senderId: BOT_USER_ID,
          senderName: BOT_NAME,
          sender: BOT_NAME,
          photoURL: BOT_PHOTO,
          timestamp: Date.now(),
          isBot: true
        });
      } else {
        await sendImage(roomId, media, ans.label || "");
      }
    } catch (e) {
      await sendText(roomId, "Gagal: " + (e.message || e));
    }
    return;
  }
  if (ans.kind === "json_list") {
    try {
      var jj = await fetchJsonUrl(ans.jsonUrl);
      var list = (jj && (jj.results || jj.data || jj)) || [];
      if (!Array.isArray(list)) list = [];
      var lines = list.slice(0, 5).map(function (it, idx) {
        var t = it.title || it.name || "item";
        var u = it.url || it.link || "";
        return idx + 1 + ". " + t + (u ? "\n" + u : "");
      });
      await sendText(roomId, lines.length ? lines.join("\n\n") : "Tidak ada hasil.");
    } catch (e) {
      await sendText(roomId, "Gagal: " + (e.message || e));
    }
  }
}

const seen = new Set();
var tick = 0;

async function pollOnce() {
  tick++;
  if (!BOT_USER_ID) return;
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
    entries.sort(function (a, b) {
      return (a.timestamp || 0) - (b.timestamp || 0);
    });
    var recent = entries.slice(-12);
    for (var j = 0; j < recent.length; j++) {
      var m = recent[j];
      if (!m.id || seen.has(m.id)) continue;
      seen.add(m.id);
      if (m.senderId === BOT_USER_ID) continue;
      if (m.isBot) continue;
      if (m.type && m.type !== "text") continue;
      var ans = handleCommand(m.text || "");
      if (!ans) continue;
      console.log("[" + roomId + "] <=", String(m.text || "").slice(0, 60));
      try {
        await handleAnswer(roomId, ans);
      } catch (e) {
        console.error("reply", e.message || e);
      }
    }
  }
  if (tick % 12 === 0) {
    try {
      await dbSet("botAccounts/" + BOT_USER_ID + "/lastSeen", Date.now());
    } catch (e) {}
    console.log("poll ok · rooms:", roomIds.length);
  }
}

async function main() {
  console.log("WhyA Bot Termux v2.2");
  await runPairing();
  console.log("Bot siap sebagai:", BOT_NAME, "|", BOT_USER_ID);
  for (;;) {
    try {
      await pollOnce();
    } catch (e) {
      console.error("poll:", e.message || e);
    }
    await sleep(POLL_MS);
  }
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
