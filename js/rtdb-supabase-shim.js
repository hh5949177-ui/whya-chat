/**
 * whya · Firebase RTDB → Supabase shim
 * API mirip firebase.database(): db.ref(path).once/on/set/update/push/remove
 * Tidak perlu Firebase SDK.
 */
(function (global) {
  function getSb() {
    if (global.WhyaDB && global.WhyaDB.client) return global.WhyaDB.client;
    if (global.__whya_sb) return global.__whya_sb;
    if (global.supabase && global.WHYA_SUPABASE) {
      global.__whya_sb = global.supabase.createClient(
        global.WHYA_SUPABASE.url,
        global.WHYA_SUPABASE.anonKey
      );
      return global.__whya_sb;
    }
    return null;
  }

  function normPath(p) {
    return String(p || "")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/+/g, "/");
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
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function snapVal(val) {
    return {
      val: function () {
        return val === undefined ? null : val;
      },
      exists: function () {
        return val !== null && val !== undefined;
      },
      forEach: function (cb) {
        if (!val || typeof val !== "object" || Array.isArray(val)) return;
        Object.keys(val).forEach(function (k) {
          cb({
            key: k,
            val: function () {
              return val[k];
            },
            exists: function () {
              return val[k] != null;
            }
          });
        });
      },
      key: null
    };
  }

  async function readPath(path) {
    var sb = getSb();
    if (!sb) throw new Error("Supabase belum dikonfigurasi");
    path = normPath(path);
    // exact
    var exact = await sb.from("rt_nodes").select("data").eq("path", path).maybeSingle();
    if (exact.error) throw new Error(exact.error.message);
    if (exact.data && exact.data.data !== undefined && exact.data.data !== null) {
      // if leaf json object stored as whole
      return exact.data.data;
    }
    // children
    var kids = await sb
      .from("rt_nodes")
      .select("path,data")
      .eq("parent", path);
    if (kids.error) throw new Error(kids.error.message);
    if (!kids.data || !kids.data.length) return null;
    var obj = {};
    kids.data.forEach(function (row) {
      var k = childKey(row.path);
      obj[k] = row.data;
    });
    return obj;
  }

  async function writePath(path, data) {
    var sb = getSb();
    if (!sb) throw new Error("Supabase belum dikonfigurasi");
    path = normPath(path);
    var parent = parentPath(path);
    // hapus anak lama jika set object besar? simpan sebagai leaf JSON
    var { error } = await sb.from("rt_nodes").upsert({
      path: path,
      parent: parent,
      data: data === undefined ? null : data,
      is_leaf: true,
      updated_at: new Date().toISOString()
    });
    if (error) throw new Error(error.message);
    // notifikasi listener sederhana
    emit(path, data);
    if (parent) emit(parent, await readPath(parent));
  }

  async function deletePath(path) {
    var sb = getSb();
    path = normPath(path);
    // hapus node + keturunan (prefix)
    await sb.from("rt_nodes").delete().eq("path", path);
    await sb.from("rt_nodes").delete().like("path", path + "/%");
    emit(path, null);
    var parent = parentPath(path);
    if (parent) emit(parent, await readPath(parent));
  }

  // listeners: path -> [{type, cb}]
  var listeners = {};
  function emit(path, val) {
    path = normPath(path);
    var list = listeners[path] || [];
    list.forEach(function (L) {
      try {
        if (L.type === "value") L.cb(snapVal(val));
      } catch (e) {
        console.warn(e);
      }
    });
  }

  function Ref(path) {
    this.path = normPath(path);
  }
  Ref.prototype.ref = function (sub) {
    if (!sub) return this;
    return new Ref(this.path ? this.path + "/" + normPath(sub) : normPath(sub));
  };
  Ref.prototype.child = function (sub) {
    return this.ref(sub);
  };
  Ref.prototype.once = function (event) {
    var self = this;
    return readPath(self.path)
      .then(function (v) {
        var s = snapVal(v);
        s.key = childKey(self.path);
        return s;
      })
      .catch(function (e) {
        console.warn("rt once", self.path, e);
        return snapVal(null);
      });
  };
  Ref.prototype.on = function (event, cb) {
    var self = this;
    var p = self.path;
    event = event || "value";
    if (!listeners[p]) listeners[p] = [];
    listeners[p].push({ type: event, cb: cb, _seen: {} });
    function fireValue(v) {
      var s = snapVal(v);
      s.key = childKey(p);
      try { cb(s); } catch (e) {}
    }
    function fireChildren(v) {
      if (!v || typeof v !== "object") return;
      Object.keys(v).forEach(function (k) {
        var childSnap = {
          key: k,
          val: function () { return v[k]; },
          exists: function () { return v[k] != null; },
          forEach: function () {}
        };
        try { cb(childSnap); } catch (e) {}
      });
    }
    readPath(p).then(function (v) {
      if (event === "value") fireValue(v);
      else if (event === "child_added") fireChildren(v);
    });
    if (!Ref._poll) {
      Ref._last = {};
      Ref._poll = setInterval(function () {
        Object.keys(listeners).forEach(function (path) {
          if (!listeners[path] || !listeners[path].length) return;
          readPath(path).then(function (v) {
            listeners[path].forEach(function (L) {
              try {
                if (L.type === "value") {
                  L.cb(snapVal(v));
                } else if (L.type === "child_added") {
                  if (!v || typeof v !== "object") return;
                  L._seen = L._seen || {};
                  Object.keys(v).forEach(function (k) {
                    if (L._seen[k]) return;
                    L._seen[k] = true;
                    L.cb({
                      key: k,
                      val: function () { return v[k]; },
                      exists: function () { return v[k] != null; },
                      forEach: function () {}
                    });
                  });
                }
              } catch (e) {}
            });
          });
        });
      }, 2500);
    }
    return cb;
  };
  Ref.prototype.off = function (event, cb) {
    var p = this.path;
    if (!listeners[p]) return;
    if (!cb) {
      listeners[p] = [];
      return;
    }
    listeners[p] = listeners[p].filter(function (L) {
      return L.cb !== cb;
    });
  };
  Ref.prototype.set = function (val) {
    return writePath(this.path, val);
  };
  Ref.prototype.update = function (obj) {
    var self = this;
    obj = obj || {};
    return readPath(self.path).then(function (cur) {
      cur = cur && typeof cur === "object" ? cur : {};
      Object.keys(obj).forEach(function (k) {
        cur[k] = obj[k];
      });
      return writePath(self.path, cur);
    });
  };
  Ref.prototype.push = function (val) {
    var key = pushId();
    var child = new Ref(this.path + "/" + key);
    var thenable = val === undefined ? Promise.resolve() : writePath(child.path, val);
    child.key = key;
    // firebase push returns ref with then for compat
    child.then = thenable.then.bind(thenable);
    return child;
  };
  Ref.prototype.remove = function () {
    return deletePath(this.path);
  };
  Ref.prototype.limitToLast = function () {
    return this;
  }; // no-op soft compat

  function Database() {}
  Database.prototype.ref = function (path) {
    return new Ref(path || "");
  };

  var db = new Database();
  global.db = db;
  global.firebase = global.firebase || {
    database: function () {
      return db;
    },
    auth: function () {
      return {
        signInWithPopup: function () {
          return Promise.reject(new Error("Gunakan login Supabase / Google lewat login.html yang sudah diarahkan"));
        },
        signInWithRedirect: function () {
          return Promise.reject(new Error("Auth Firebase dimatikan — pakai Supabase"));
        },
        getRedirectResult: function () {
          return Promise.resolve({});
        }
      };
    },
    initializeApp: function () {
      return {};
    },
    storage: function () {
      return null;
    }
  };
  global.WHYA_USE_SUPABASE_RT = true;
  console.info("[whya] RTDB shim aktif → Supabase rt_nodes");
})(typeof window !== "undefined" ? window : global);
