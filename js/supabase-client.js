/**
 * WhyA · Supabase client (full, no Firebase)
 */
(function (global) {
  var SUPABASE_URL = "https://wjmxiedkyklmmoxcxjlw.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_TMNireG8PZENCgtHdh-HQA_BkAlGAle";

  function resolveConfig() {
    try {
      if (global.WHYA_SUPABASE && global.WHYA_SUPABASE.url) {
        return { url: global.WHYA_SUPABASE.url, anonKey: global.WHYA_SUPABASE.anonKey || SUPABASE_ANON_KEY };
      }
    } catch (e) {}
    return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
  }

  var sb = null;
  function getSb() {
    if (sb) return sb;
    if (!global.supabase || !global.supabase.createClient) {
      console.error("Supabase SDK belum dimuat");
      return null;
    }
    var cfg = resolveConfig();
    sb = global.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return sb;
  }

  function emailToId(email) {
    return "u_" + String(email).toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 48);
  }
  function simpleHash(str) {
    var h = 0;
    str = String(str);
    for (var i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return String(h);
  }
  function emailKey(email) {
    return String(email || "").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 80);
  }
  function genOtp4() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  function persistLocal(user) {
    try {
      localStorage.setItem("wg_user", JSON.stringify(user));
      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.setItem("wa_user_" + user.id, JSON.stringify(user));
      localStorage.setItem("wa_current_id", user.id);
      if (user.email) localStorage.setItem("wa_current_email", user.email);
    } catch (e) {}
  }

  
  async function sendOtpEmail(email, otp, name) {
    try {
      var res = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(email), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: "WhyA Chat",
          subject: "Kode OTP WhyA Chat",
          message:
            "Halo" + (name ? " " + name : "") + ",\n\n" +
            "Kode OTP pendaftaran WhyA Chat kamu:\n\n" +
            "    " + otp + "\n\n" +
            "Berlaku 10 menit. Jangan bagikan kode ini kepada siapa pun.\n\n— WhyA Chat",
          _captcha: "false",
          _template: "table"
        })
      });
      if (!res.ok) return { ok: false, error: "status " + res.status };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }

var WhyaDB = {
    get client() { return getSb(); },
    isConfigured: function () {
      var cfg = resolveConfig();
      return !!(cfg.url && cfg.anonKey && cfg.anonKey.length > 10);
    },

    async requestOtp(name, email, password) {
      var client = getSb();
      if (!client) throw new Error("Supabase tidak siap");
      email = String(email).toLowerCase().trim();
      if (!/@gmail\.com$/.test(email) && !/@googlemail\.com$/.test(email)) {
        throw new Error("Gunakan Gmail (@gmail.com)");
      }
      // rate-limit sederhana: 1 permintaan / 40 detik per email
      try {
        var last = await client.from("registration_otp").select("created_at,expires_at").eq("email_key", emailKey(email)).maybeSingle();
        if (last.data && last.data.created_at) {
          var age = Date.now() - new Date(last.data.created_at).getTime();
          if (age < 40000 && new Date(last.data.expires_at).getTime() > Date.now()) {
            throw new Error("Tunggu sebentar sebelum meminta OTP lagi");
          }
        }
      } catch (e) {
        if (/Tunggu sebentar/i.test(e.message||"")) throw e;
      }
      var otp = genOtp4();
      var key = emailKey(email);
      var expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      var { error } = await client.from("registration_otp").upsert({
        email_key: key,
        email: email,
        otp: String(otp),
        name: name || "",
        expires_at: expires,
        attempts: 0,
        created_at: new Date().toISOString()
      });
      if (error) {
        var m = error.message || String(error);
        if (/does not exist/i.test(m)) throw new Error("Tabel belum ada — jalankan fix-register.sql");
        if (/row-level security|permission/i.test(m)) throw new Error("RLS memblokir — jalankan fix-register.sql");
        throw new Error(m);
      }
      var sent = await sendOtpEmail(email, otp, name);
      if (!sent || !sent.ok) {
        throw new Error("Gagal mengirim OTP ke email. Cek koneksi / coba lagi nanti.");
      }
      // JANGAN kirim otp ke browser
      return { otpStored: true, emailSent: true, email: email };
    },

    async verifyOtp(email, code) {
      var client = getSb();
      var key = emailKey(email);
      var { data, error } = await client.from("registration_otp").select("*").eq("email_key", key).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("OTP tidak ditemukan — minta kode baru");
      if (new Date(data.expires_at).getTime() < Date.now()) throw new Error("OTP kedaluwarsa — minta kode baru");
      if ((data.attempts || 0) >= 5) throw new Error("Terlalu banyak percobaan — minta kode baru");
      if (String(code).trim() !== String(data.otp).trim()) {
        try {
          await client.from("registration_otp").update({ attempts: (data.attempts || 0) + 1 }).eq("email_key", key);
        } catch (e) {}
        throw new Error("Kode OTP salah");
      }
      return true;
    },

    async registerUser(name, email, password) {
      var client = getSb();
      if (!client) throw new Error("Supabase tidak siap");
      email = String(email).toLowerCase().trim();
      var id = emailToId(email);
      var publicId = "whya" + Math.floor(1000 + Math.random() * 9000);
      try { await client.from("users").delete().eq("id", id); } catch (e) {}
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
      var { data, error } = await client.from("users").insert([row]).select().single();
      if (error) {
        var m = error.message || String(error);
        if (/duplicate|unique/i.test(m)) throw new Error("Email sudah terdaftar — silakan masuk");
        if (/does not exist/i.test(m)) throw new Error("Tabel users belum ada — jalankan fix-register.sql");
        if (/row-level security|permission/i.test(m)) throw new Error("RLS memblokir — jalankan fix-register.sql");
        throw new Error(m);
      }
      try { await client.from("registration_otp").delete().eq("email_key", emailKey(email)); } catch (e) {}
      var user = {
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
      persistLocal(user);
      // mirror ke rt_nodes
      try {
        await client.from("rt_nodes").upsert({
          path: "users/" + id,
          parent: "users",
          data: user,
          is_leaf: true,
          updated_at: new Date().toISOString()
        });
      } catch (e) {}
      return user;
    },

    async login(email, password) {
      var client = getSb();
      if (!client) throw new Error("Supabase tidak siap");
      email = String(email).toLowerCase().trim();
      var id = emailToId(email);
      var { data, error } = await client.from("users").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        // coba by email column
        var r2 = await client.from("users").select("*").eq("email", email).maybeSingle();
        if (r2.error) throw new Error(r2.error.message);
        data = r2.data;
      }
      if (!data) throw new Error("Akun tidak ditemukan — daftar dulu");
      if (data.banned) throw new Error("Akun diblokir");
      var hash = simpleHash(password);
      if (String(data.password_hash) !== String(hash) && String(data.password_plain) !== String(password)) {
        throw new Error("Password salah");
      }
      try {
        await client.from("users").update({ last_login: new Date().toISOString() }).eq("id", data.id);
      } catch (e) {}
      var user = {
        id: data.id,
        publicId: data.public_id,
        name: data.name,
        email: data.email,
        avatar: data.avatar,
        photoURL: data.photo_url,
        role: data.role || "user",
        verified: !!data.verified,
        badgeColor: data.badge_color || "blue",
        authProvider: data.auth_provider || "email"
      };
      persistLocal(user);
      return user;
    },

    async uploadMedia(file, folder) {
      var client = getSb();
      if (!client) throw new Error("Supabase tidak siap");
      folder = folder || "chat";
      var ext = (file.name && file.name.split(".").pop()) || "bin";
      ext = String(ext).replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
      var path = folder + "/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "." + ext;
      var { data, error } = await client.storage.from("media").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });
      if (error) throw new Error(error.message || String(error));
      var pub = client.storage.from("media").getPublicUrl(data.path);
      return pub && pub.data ? pub.data.publicUrl : null;
    }
  };

  global.WhyaDB = WhyaDB;
  global.emailToId = emailToId;
  global.simpleHash = simpleHash;
  global.getSb = getSb;
})(typeof window !== "undefined" ? window : globalThis);
