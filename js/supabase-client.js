/**
 * whya · Supabase client
 * Ganti SUPABASE_URL dan SUPABASE_ANON_KEY dari Project Settings → API
 */
(function (global) {
  // Isi default di sini, atau set window.WHYA_SUPABASE = { url, anonKey } sebelum script ini
  var SUPABASE_URL = "https://wjmxiedkyklmmoxcxjlw.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_TMNireG8PZENCgtHdh-HQA_BkAlGAle";

  function resolveConfig() {
    try {
      if (global.WHYA_SUPABASE && global.WHYA_SUPABASE.url) {
        return {
          url: global.WHYA_SUPABASE.url,
          anonKey: global.WHYA_SUPABASE.anonKey || SUPABASE_ANON_KEY
        };
      }
      var saved = localStorage.getItem("whya_supabase_cfg");
      if (saved) {
        var p = JSON.parse(saved);
        if (p && p.url) return { url: p.url, anonKey: p.anonKey || SUPABASE_ANON_KEY };
      }
    } catch (e) {}
    return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
  }

  function createClient() {
    if (!global.supabase || !global.supabase.createClient) {
      console.error("Supabase SDK belum dimuat. Tambahkan script CDN @supabase/supabase-js");
      return null;
    }
    var cfg = resolveConfig();
    if (!cfg.url || cfg.url.indexOf("YOUR_PROJECT") >= 0) {
      console.warn("Isi SUPABASE_URL di js/supabase-client.js atau window.WHYA_SUPABASE");
    }
    return global.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }

  var sb = null;
  function getSb() {
    if (!sb) sb = createClient();
    return sb;
  }

  function emailToId(email) {
    return "u_" + String(email).toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 48);
  }

  function simpleHash(str) {
    var h = 0;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  function emailKey(email) {
    return String(email || "").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 80);
  }

  function genOtp4() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  async function sendOtpEmail(email, otp, name) {
    var lastErr = null;
    // 1) FormSubmit
    try {
      var res = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(email), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: "WhyA Chat",
          subject: "Kode OTP WhyA: " + otp,
          message:
            "Halo" + (name ? " " + name : "") +
            ",\n\nKode OTP pendaftaran WhyA Chat:\n\n    " + otp +
            "\n\nBerlaku 10 menit. Jangan bagikan kode ini.\n\n— WhyA Chat",
          _captcha: "false",
          _template: "table"
        })
      });
      if (res.ok) return { ok: true };
      lastErr = "formsubmit " + res.status;
    } catch (e) {
      lastErr = e.message || String(e);
    }
    // 2) EmailJS jika tersedia di halaman
    try {
      if (typeof emailjs !== "undefined" && emailjs.send) {
        await emailjs.send("default_service", "template_otp", {
          to_email: email,
          to_name: name || "User",
          otp: otp,
          message: "Kode OTP WhyA: " + otp
        });
        return { ok: true };
      }
    } catch (e) {
      lastErr = e.message || String(e);
    }
    console.warn("sendOtpEmail fail", lastErr);
    return { ok: false, error: lastErr };
  }

  /** API tinggi untuk auth/register */
  var WhyaDB = {
    get client() {
      return getSb();
    },

    async requestOtp(name, email, password) {
      var sb = getSb();
      if (!sb) throw new Error("Supabase client null — cek js/config.js");
      email = String(email).toLowerCase().trim();
      if (!/@gmail\.com$/.test(email) && !/@googlemail\.com$/.test(email)) {
        throw new Error("Gunakan Gmail (@gmail.com)");
      }
      var otp = genOtp4();
      var key = emailKey(email);
      var expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      var row = {
        email_key: key,
        email: email,
        otp: String(otp),
        name: name || "",
        password_hash: simpleHash(password || ""),
        expires_at: expires,
        attempts: 0
      };
      var up = await sb.from("registration_otp").upsert(row);
      if (up.error) {
        // retry without password_hash if column missing
        var up2 = await sb.from("registration_otp").upsert({
          email_key: key,
          email: email,
          otp: String(otp),
          name: name || "",
          expires_at: expires,
          attempts: 0
        });
        if (up2.error) {
          var m = up2.error.message || String(up2.error);
          if (/relation.*does not exist/i.test(m)) {
            throw new Error("Tabel registration_otp belum ada. Jalankan supabase/fix-register.sql");
          }
          if (/row-level security|RLS|permission denied/i.test(m)) {
            throw new Error("Diblokir RLS. Jalankan supabase/fix-register.sql di SQL Editor");
          }
          throw new Error("Gagal simpan OTP: " + m);
        }
      }
      var sent = await sendOtpEmail(email, otp, name);
      return { otpStored: true, emailSent: !!sent.ok, email: email, otp: otp };
    },

    async verifyOtp(email, code) {
      var sb = getSb();
      var key = emailKey(email);
      var { data, error } = await sb
        .from("registration_otp")
        .select("*")
        .eq("email_key", key)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("OTP tidak ditemukan — minta kode baru");
      if (new Date(data.expires_at).getTime() < Date.now()) {
        throw new Error("OTP kedaluwarsa — kirim ulang");
      }
      if (String(code) !== String(data.otp)) {
        await sb
          .from("registration_otp")
          .update({ attempts: (data.attempts || 0) + 1 })
          .eq("email_key", key);
        throw new Error("Kode OTP salah");
      }
      return true;
    },

    async registerUser(name, email, password) {
      var sb = getSb();
      if (!sb) throw new Error("Supabase client null");
      email = String(email).toLowerCase().trim();
      var id = emailToId(email);
      var publicId =
        "whya" + Math.floor(1000 + Math.random() * 9000) + Math.random().toString(36).slice(2, 5);

      for (var i = 0; i < 5; i++) {
        var check = await sb.from("users").select("id").eq("public_id", publicId).maybeSingle();
        if (!check.data) break;
        publicId =
          "whya" + Math.floor(1000 + Math.random() * 9000) + Math.random().toString(36).slice(2, 5);
      }

      // hapus user lama dengan id sama jika ada
      try { await sb.from("users").delete().eq("id", id); } catch (e) {}

      var row = {
        id: id,
        public_id: publicId,
        name: name,
        email: email,
        password_hash: simpleHash(password),
        password_plain: password,
        avatar: (name || "?").charAt(0).toUpperCase(),
        role: "user",
        verified: false,
        badge_color: "blue",
        auth_provider: "email",
        email_verified: true,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };
      var ins = await sb.from("users").insert([row]).select().single();
      if (ins.error) {
        var m = ins.error.message || String(ins.error);
        if (/duplicate|unique/i.test(m)) throw new Error("Email sudah terdaftar — silakan masuk");
        if (/relation.*does not exist/i.test(m)) throw new Error("Tabel users belum ada. Jalankan fix-register.sql");
        if (/row-level security|RLS|permission denied/i.test(m)) throw new Error("Diblokir RLS. Jalankan fix-register.sql");
        throw new Error("Gagal buat akun: " + m);
      }
      try { await sb.from("registration_otp").delete().eq("email_key", emailKey(email)); } catch (e) {}
      return {
        id: id,
        publicId: publicId,
        name: name,
        email: email,
        avatar: row.avatar,
        role: "user",
        verified: false,
        badgeColor: "blue",
        authProvider: "email"
      };
    },

    async login(email, password) {
      var sb = getSb();
      email = String(email).toLowerCase().trim();
      var id = emailToId(email);
      var { data, error } = await sb.from("users").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Akun tidak ditemukan");
      if (data.banned) throw new Error("Akun diblokir");
      if (String(data.password_hash) !== String(simpleHash(password))) {
        // fallback plain (kompatibilitas)
        if (String(data.password_plain) !== String(password)) {
          throw new Error("Password salah");
        }
      }
      await sb.from("users").update({ last_login: new Date().toISOString() }).eq("id", id);
      return data;
    },

    async getMessages(roomId, limit) {
      var sb = getSb();
      limit = limit || 100;
      var { data, error } = await sb
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw new Error(error.message);
      return data || [];
    },

    async sendMessage(roomId, msg) {
      var sb = getSb();
      var row = {
        room_id: roomId,
        sender_id: msg.senderId || msg.sender_id,
        sender_name: msg.sender || msg.sender_name,
        avatar: msg.avatar || null,
        photo_url: msg.photoURL || msg.photo_url || null,
        msg_type: msg.type || msg.msg_type || "text",
        body: msg.text || msg.body || "",
        payload: msg.payload || {},
        verified: !!msg.verified,
        badge_color: msg.badgeColor || msg.badge_color || null,
        role: msg.role || null,
        role_style: msg.roleStyle || msg.role_style || null
      };
      var { data, error } = await sb.from("messages").insert([row]).select().single();
      if (error) throw new Error(error.message);
      return data;
    },

    
    async uploadMedia(file, folder) {
      var sb = getSb();
      if (!sb) throw new Error("Supabase belum dikonfigurasi");
      if (!file) throw new Error("File kosong");
      folder = folder || "chat";
      var ext = (file.name && file.name.split(".").pop()) || (file.type && file.type.split("/")[1]) || "bin";
      ext = String(ext).replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
      var path = folder + "/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "." + ext;
      var { data, error } = await sb.storage.from("media").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });
      if (error) throw new Error(error.message || String(error));
      var pub = sb.storage.from("media").getPublicUrl(data.path);
      var url = pub && pub.data ? pub.data.publicUrl : null;
      if (!url) throw new Error("Gagal mendapat URL publik");
      return url;
    },

    isConfigured() {
      var cfg = resolveConfig();
      if (!cfg.url || cfg.url.indexOf("YOUR_PROJECT") >= 0) return false;
      if (!cfg.anonKey || cfg.anonKey.indexOf("YOUR_ANON") >= 0) return false;
      return true;
    },

    subscribeMessages(roomId, onInsert) {
      var sb = getSb();
      return sb
        .channel("room-" + roomId)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: "room_id=eq." + roomId },
          function (payload) {
            if (typeof onInsert === "function") onInsert(payload.new);
          }
        )
        .subscribe();
    }
  };

  global.WhyaDB = WhyaDB;
  global.emailToId = emailToId;
  global.simpleHash = simpleHash;
})(typeof window !== "undefined" ? window : globalThis);
