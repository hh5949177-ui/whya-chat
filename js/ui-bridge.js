/*! WhyA UI bridge — fallback tab + boot if main script gagal */
(function(){
  function $(id){ return document.getElementById(id); }
  function hideOverlays(){
    ["welcome-screen","auth-login","auth-register","about-whya","app-loader","group-invite-screen","account-warning-overlay"].forEach(function(id){
      var el=$(id);
      if(el){ el.style.display="none"; el.style.pointerEvents="none"; el.classList && el.classList.remove("show"); }
    });
    var app=$("app");
    if(app){ app.style.display="flex"; app.style.visibility="visible"; app.style.opacity="1"; app.style.pointerEvents="auto"; }
    document.body && document.body.classList.add("app-ready");
  }
  function switchTabFallback(name){
    name = String(name||"chat");
    document.querySelectorAll(".tab-page").forEach(function(p){
      p.classList.remove("active");
      p.style.display = "none";
    });
    document.querySelectorAll(".nav-item").forEach(function(n){ n.classList.remove("active"); });
    var page = $("tab-"+name);
    if(page){
      page.classList.add("active");
      page.style.display = "flex";
      page.style.opacity = "1";
      page.style.visibility = "visible";
    }
    var nav = $("nav-"+name);
    if(nav) nav.classList.add("active");
    // empty chat state
    if(name==="chat"){
      var box=$("chat-list");
      if(box && !box.innerHTML.trim()){
        box.innerHTML = '<div style="padding:48px 24px;text-align:center;color:rgba(255,255,255,.45);font-size:14px;line-height:1.6">'
          +'<div style="font-size:40px;margin-bottom:12px;opacity:.5">💬</div>'
          +'<div style="font-weight:700;color:rgba(255,255,255,.75);margin-bottom:6px">Belum ada chat</div>'
          +'<div>Tekan ikon user+ untuk tambah teman</div></div>';
      }
    }
  }
  // Only install if main belum sediakan
  function install(){
    hideOverlays();
    if (typeof window.switchTab !== "function") {
      window.switchTab = switchTabFallback;
      console.warn("[whya] switchTab fallback aktif");
    }
    // bind nav buttons
    ["chat","status","calls","web","profile"].forEach(function(name){
      var btn = $("nav-"+name);
      if(!btn) return;
      btn.addEventListener("click", function(ev){
        ev.preventDefault();
        (window.switchTab||switchTabFallback)(name);
      }, true);
    });
    // session gate soft
    try {
      var raw = localStorage.getItem("wg_user") || localStorage.getItem("currentUser");
      var ok = false;
      if (raw) {
        var u = JSON.parse(raw);
        ok = !!(u && (u.id || u.email));
      }
      if (!ok && !localStorage.getItem("wa_current_id")) {
        // biarkan; main boot boleh redirect
      } else {
        hideOverlays();
        switchTabFallback("chat");
      }
    } catch(e) { hideOverlays(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
  setTimeout(install, 800);
})();
