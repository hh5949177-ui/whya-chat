/**
 * WhyA · path store di Supabase (rt_nodes) — API mirip db.ref()
 */
(function (global) {
  function getSb() {
    if (global.WhyaDB && global.WhyaDB.client) return global.WhyaDB.client;
    if (global.getSb) return global.getSb();
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
    var exact = await sb.from("rt_nodes").select("data").eq("path", path).maybeSingle();
    if (exact.data && exact.data.data !== undefined) return exact.data.data;
    var kids = await sb.from("rt_nodes").select("path,data").eq("parent", path);
    if (!kids.data || !kids.data.length) return null;
    var obj = {};
    kids.data.forEach(function (row) { obj[childKey(row.path)] = row.data; });
    return obj;
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
    });
    if (error) throw new Error(error.message);
    emit(path, data);
  }
  async function deletePath(path) {
    var sb = getSb();
    path = normPath(path);
    await sb.from("rt_nodes").delete().eq("path", path);
    await sb.from("rt_nodes").delete().like("path", path + "/%");
    emit(path, null);
  }

  var listeners = {};
  function emit(path, val) {
    path = normPath(path);
    (listeners[path] || []).forEach(function (L) {
      try { if (L.type === "value") L.cb(snapVal(val)); } catch (e) {}
    });
  }

  function Ref(path) { this.path = normPath(path); }
  Ref.prototype.ref = function (sub) {
    if (!sub) return this;
    return new Ref(this.path ? this.path + "/" + normPath(sub) : normPath(sub));
  };
  Ref.prototype.child = Ref.prototype.ref;
  Ref.prototype.once = function () {
    var self = this;
    return readPath(self.path).then(function (v) {
      var s = snapVal(v); s.key = childKey(self.path); return s;
    }).catch(function () { return snapVal(null); });
  };
  Ref.prototype.on = function (event, cb) {
    var p = this.path;
    event = event || "value";
    if (!listeners[p]) listeners[p] = [];
    listeners[p].push({ type: event, cb: cb, _seen: {} });
    readPath(p).then(function (v) {
      try {
        if (event === "value") cb(snapVal(v));
        else if (event === "child_added" && v && typeof v === "object") {
          Object.keys(v).forEach(function (k) {
            cb({ key: k, val: function () { return v[k]; }, exists: function () { return v[k] != null; } });
          });
        }
      } catch (e) {}
    });
    if (!Ref._poll) {
      Ref._poll = setInterval(function () {
        Object.keys(listeners).forEach(function (path) {
          if (!listeners[path] || !listeners[path].length) return;
          readPath(path).then(function (v) {
            listeners[path].forEach(function (L) {
              try {
                if (L.type === "value") L.cb(snapVal(v));
                else if (L.type === "child_added" && v && typeof v === "object") {
                  L._seen = L._seen || {};
                  Object.keys(v).forEach(function (k) {
                    if (L._seen[k]) return;
                    L._seen[k] = true;
                    L.cb({ key: k, val: function () { return v[k]; }, exists: function () { return v[k] != null; } });
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
    if (!cb) listeners[p] = [];
    else listeners[p] = listeners[p].filter(function (L) { return L.cb !== cb; });
  };
  Ref.prototype.set = function (val) { return writePath(this.path, val); };
  Ref.prototype.update = function (obj) {
    var self = this;
    return readPath(self.path).then(function (cur) {
      cur = cur && typeof cur === "object" ? cur : {};
      Object.keys(obj || {}).forEach(function (k) { cur[k] = obj[k]; });
      return writePath(self.path, cur);
    });
  };
  Ref.prototype.push = function (val) {
    var key = pushId();
    var child = new Ref(this.path + "/" + key);
    child.key = key;
    var p = val === undefined ? Promise.resolve() : writePath(child.path, val);
    child.then = p.then.bind(p);
    return child;
  };
  Ref.prototype.remove = function () { return deletePath(this.path); };
  Ref.prototype.limitToLast = function () { return this; };

  function Database() {}
  Database.prototype.ref = function (path) { return new Ref(path || ""); };

  global.db = new Database();
  console.info("[whya] Supabase rt_nodes siap");
})(typeof window !== "undefined" ? window : globalThis);
