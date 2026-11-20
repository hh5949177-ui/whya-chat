/**
 * WhyA · path store di Supabase (rt_nodes) — API mirip db.ref()
 */
(function (global) {
  var _sb = null;
  function getSb() {
    if (_sb) return _sb;
    try {
      if (global.WhyaDB && global.WhyaDB.client) { _sb = global.WhyaDB.client; return _sb; }
    } catch (e) {}
    try {
      if (typeof global.getSb === "function") {
        var c = global.getSb();
        if (c) { _sb = c; return _sb; }
      }
    } catch (e) {}
    // buat client sendiri dari config
    try {
      var url = (global.WHYA_SUPABASE && global.WHYA_SUPABASE.url) || global.SUPABASE_URL || "";
      var key = (global.WHYA_SUPABASE && global.WHYA_SUPABASE.anonKey) || global.SUPABASE_ANON_KEY || "";
      if (!url && global.WHYA_CONFIG) {
        url = global.WHYA_CONFIG.supabaseUrl || global.WHYA_CONFIG.url || "";
        key = global.WHYA_CONFIG.supabaseAnonKey || global.WHYA_CONFIG.anonKey || key;
      }
      if (!url) {
        url = "https://wjmxiedkyklmmoxcxjlw.supabase.co";
        key = key || "sb_publishable_TMNireG8PZENCgtHdh-HQA_BkAlGAle";
      }
      if (global.supabase && global.supabase.createClient && url && key) {
        _sb = global.supabase.createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        return _sb;
      }
    } catch (e) { console.error("[shim] createClient", e); }
    return null;
  }

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
  function snapVal(val) {
    return {
      val: function () { return val === undefined ? null : val; },
      exists: function () { return val !== null && val !== undefined; },
      forEach: function (cb) {
        if (!val || typeof val !== "object" || Array.isArray(val)) return;
        Object.keys(val).forEach(function (k) {
          cb({ key: k, val: function () { return val[k]; }, exists: function () { return val[k] != null; } });
        });
      },
      key: null
    };
  }

  async function readPath(path) {
    var sb = getSb();
    if (!sb) return null;
    path = normPath(path);
    try {
      var exact = await sb.from("rt_nodes").select("data").eq("path", path).maybeSingle();
      if (exact && exact.data && exact.data.data !== undefined && exact.data.data !== null) {
        return exact.data.data;
      }
    } catch (e) {}
    try {
      var kids = await sb.from("rt_nodes").select("path,data").eq("parent", path);
      if (!kids || !kids.data || !kids.data.length) return null;
      var obj = {};
      kids.data.forEach(function (row) {
        obj[childKey(row.path)] = row.data;
      });
      return obj;
    } catch (e) {
      console.warn("[shim] readPath", path, e);
      return null;
    }
  }

  async function writePath(path, data) {
    var sb = getSb();
    if (!sb) throw new Error("Supabase tidak siap");
    path = normPath(path);
    var { error } = await sb.from("rt_nodes").upsert({
      path: path,
      parent: parentPath(path),
      data: data === undefined ? null : data,
      is_leaf: true,
      updated_at: new Date().toISOString()
    }, { onConflict: "path" });
    if (error) throw new Error(error.message);
    emit(path, data);
  }

  async function deletePath(path) {
    var sb = getSb();
    if (!sb) return;
    path = normPath(path);
    await sb.from("rt_nodes").delete().eq("path", path);
    await sb.from("rt_nodes").delete().like("path", path + "/%");
    emit(path, null);
  }

  var listeners = {};

  function emit(path, val) {
    path = normPath(path);
    // exact value listeners
    (listeners[path] || []).forEach(function (L) {
      try {
        if (L.type === "value") L.cb(snapVal(val));
      } catch (e) {}
    });
    // parent child_added / value
    var parent = parentPath(path);
    var key = childKey(path);
    if (parent) {
      (listeners[parent] || []).forEach(function (L) {
        try {
          if (L.type === "child_added") {
            L._seen = L._seen || {};
            if (val == null) return;
            if (L._seen[key]) return;
            L._seen[key] = true;
            L.cb({
              key: key,
              val: function () { return val; },
              exists: function () { return val != null; }
            });
          } else if (L.type === "child_changed") {
            L.cb({
              key: key,
              val: function () { return val; },
              exists: function () { return val != null; }
            });
          } else if (L.type === "child_removed" && val == null) {
            L.cb({ key: key, val: function () { return null; }, exists: function () { return false; } });
          }
        } catch (e) {}
      });
    }
  }

  function Ref(path) {
    this.path = normPath(path);
  }
  Ref.prototype.ref = function (sub) {
    if (!sub) return this;
    return new Ref(this.path ? this.path + "/" + normPath(sub) : normPath(sub));
  };
  Ref.prototype.child = Ref.prototype.ref;

  Ref.prototype.once = function () {
    var self = this;
    return readPath(self.path).then(function (v) {
      var s = snapVal(v);
      s.key = childKey(self.path);
      return s;
    }).catch(function () {
      return snapVal(null);
    });
  };

  Ref.prototype.on = function (event, cb) {
    var p = this.path;
    event = event || "value";
    if (!listeners[p]) listeners[p] = [];
    var entry = { type: event, cb: cb, _seen: {} };
    listeners[p].push(entry);
    readPath(p).then(function (v) {
      try {
        if (event === "value") {
          cb(snapVal(v));
        } else if (event === "child_added" && v && typeof v === "object") {
          Object.keys(v).forEach(function (k) {
            entry._seen[k] = true;
            cb({
              key: k,
              val: function () { return v[k]; },
              exists: function () { return v[k] != null; }
            });
          });
        }
      } catch (e) {}
    });
    if (!Ref._poll) {
      Ref._pollLast = Ref._pollLast || {};
      Ref._poll = setInterval(function () {
        Object.keys(listeners).forEach(function (path) {
          if (!listeners[path] || !listeners[path].length) return;
          readPath(path).then(function (v) {
            var sig = "";
            try { sig = JSON.stringify(v); } catch (e) { sig = String(v); }
            var prev = Ref._pollLast[path];
            var changed = prev !== sig;
            Ref._pollLast[path] = sig;
            listeners[path].forEach(function (L) {
              try {
                if (L.type === "value") {
                  if (changed) L.cb(snapVal(v));
                } else if (L.type === "child_added" && v && typeof v === "object") {
                  L._seen = L._seen || {};
                  Object.keys(v).forEach(function (k) {
                    if (L._seen[k]) return;
                    L._seen[k] = true;
                    L.cb({
                      key: k,
                      val: function () { return v[k]; },
                      exists: function () { return v[k] != null; }
                    });
                  });
                }
              } catch (e) {}
            });
          });
        });
      }, 3000);
    }
    return cb;
  };

  Ref.prototype.off = function (event, cb) {
    var p = this.path;
    if (!listeners[p]) return;
    if (!event && !cb) {
      listeners[p] = [];
      return;
    }
    listeners[p] = listeners[p].filter(function (L) {
      if (event && L.type !== event) return true;
      if (cb && L.cb !== cb) return true;
      return false;
    });
  };

  Ref.prototype.set = function (val) {
    return writePath(this.path, val);
  };

  Ref.prototype.update = function (obj) {
    var self = this;
    return readPath(self.path).then(function (cur) {
      cur = cur && typeof cur === "object" && !Array.isArray(cur) ? cur : {};
      Object.keys(obj || {}).forEach(function (k) {
        cur[k] = obj[k];
      });
      return writePath(self.path, cur);
    });
  };

  Ref.prototype.push = function (val) {
    var key = pushId();
    var child = new Ref(this.path + "/" + key);
    child.key = key;
    // PENTING: await push() harus resolve ke child (punya .key)
    var p = (val === undefined ? Promise.resolve() : writePath(child.path, val)).then(function () {
      return child;
    });
    child.then = function (onFulfilled, onRejected) {
      return p.then(onFulfilled, onRejected);
    };
    child.catch = function (onRejected) {
      return p.catch(onRejected);
    };
    return child;
  };

  Ref.prototype.remove = function () {
    return deletePath(this.path);
  };

  Ref.prototype.limitToLast = function () {
    return this;
  };
  Ref.prototype.limitToFirst = function () {
    return this;
  };
  Ref.prototype.orderByChild = function () {
    return this;
  };

  function Database() {}
  Database.prototype.ref = function (path) {
    return new Ref(path || "");
  };

  global.db = new Database();
  global.WHYA_RTDB = global.db;
  console.info("[whya] Supabase rt_nodes shim siap");
})(typeof window !== "undefined" ? window : globalThis);
