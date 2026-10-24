/* ============================================================
   剑指OFFER · 复刻演示 —— 公共层
   壳注入（导航/Dock/页脚/弹窗） · 主题 · Mock登录 · 设置
   ============================================================ */
(function () {
  "use strict";

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ---------------- 存储 ---------------- */
  var store = {
    get: function (k, def) {
      try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); }
      catch (e) { return def; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------------- 全局状态 ---------------- */
  var NAVS = [
    { key: "autofill", href: "autofill.html", label: "AI填网申", ico: "📝", group: "AI" },
    { key: "job", href: "job.html", label: "AI找工作", ico: "🤖", group: "AI" },
    { key: "resume", href: "resume.html", label: "AI改简历", ico: "✨", group: "AI" },
    { key: "campus", href: "campus.html", label: "校招表格", ico: "📊", group: "Excel" },
    { key: "intern", href: "campus.html?table=intern", label: "实习表格", ico: "🧳", group: "Excel" },
    { key: "history", href: "history.html", label: "投递进展", ico: "🗂️", group: "Excel" }
  ];

  function getSettings() {
    return store.get("jo-settings", {
      aiBase: "https://api.openai.com/v1",
      aiKey: "",
      aiModel: "gpt-4o-mini",
      jobSource: "arbeitnow",   // arbeitnow | remotive | custom
      jobCustomUrl: ""
    });
  }
  function getUser() { return store.get("jo-user", null); }

  /* ---------------- Shell 模板 ---------------- */
  function shellHTML(active) {
    var navLinks = NAVS.filter(function (n) { return ["autofill", "job", "resume", "campus", "history"].indexOf(n.key) > -1; })
      .map(function (n) {
        return '<a href="' + n.href + '"' + (n.key === active ? ' class="is-active"' : "") + ">" + n.label + "</a>";
      }).join("");

    var dockAI = NAVS.filter(function (n) { return n.group === "AI"; }).map(function (n) {
      return '<a href="' + n.href + '"' + (n.key === active ? ' class="is-active"' : "") + '><span class="dock-ico" aria-hidden="true">' + n.ico + '</span><span class="dock-txt">' + n.label + "</span></a>";
    }).join("");
    var dockExcel = NAVS.filter(function (n) { return n.group === "Excel"; }).map(function (n) {
      return '<a href="' + n.href + '"' + (n.key === active ? ' class="is-active"' : "") + '><span class="dock-ico" aria-hidden="true">' + n.ico + '</span><span class="dock-txt">' + n.label + "</span></a>";
    }).join("");

    return ''

      /* 顶栏 */
      + '<header class="topbar">'
      + '<div class="topbar-inner">'
      + '<a class="brand" href="index.html" aria-label="剑指OFFER 首页"><span class="brand-logo" aria-hidden="true">⚔️</span><span class="brand-name">剑指OFFER</span></a>'
      + '<nav class="topnav" id="topnav" aria-label="主导航">' + navLinks + "</nav>"
      + '<div class="topbar-actions">'
      + '<button class="icon-btn" id="settingsBtn" type="button" aria-label="AI与数据源设置" title="AI与数据源设置">⚙️</button>'
      + '<button class="icon-btn" id="themeToggle" type="button" aria-label="切换浅色主题" title="切换主题"><span class="theme-icon">🌙</span></button>'
      + '<button class="btn btn-primary btn-sm" id="loginBtn" type="button">登录</button>'
      + '<button class="icon-btn menu-btn" id="menuBtn" type="button" aria-label="打开菜单" aria-expanded="false"><span></span><span></span><span></span></button>'
      + "</div></div></header>"

      /* 左侧 Dock */
      + '<aside class="dock" aria-label="功能导航">'
      + '<a class="dock-logo" href="index.html" title="剑指OFFER"><span aria-hidden="true">⚔️</span></a>'
      + '<nav class="dock-nav">'
      + '<p class="dock-group">AI × 3</p>' + dockAI
      + '<p class="dock-group">Excel × 3</p>' + dockExcel
      + "</nav>"
      + '<div class="dock-captain">'
      + '<p class="dock-group">Captain</p>'
      + '<button class="dock-login" id="dockSettingsBtn" type="button" title="AI与数据源设置"><span class="dock-ico" aria-hidden="true">⚙️</span><span class="dock-txt">设置</span></button>'
      + '<button class="dock-login" id="dockLoginBtn" type="button"><span class="dock-ico" aria-hidden="true">👤</span><span class="dock-txt">登录/注册</span></button>'
      + "</div></aside>";

    /* 注意：以上 return 提前返回了 topbar+dock；footer/弹窗见下 */
  }

  function footerHTML() {
    return '<footer class="footer">'
      + '<div class="footer-cta"><h2>AI出鞘，直指Offer</h2>'
      + '<a class="btn btn-primary btn-lg" href="job.html">打开 AI找工作 · 真实岗位</a></div>'
      + '<div class="footer-brand">'
      + '<div class="brand"><span class="brand-logo" aria-hidden="true">⚔️</span><span class="brand-name">剑指OFFER</span></div>'
      + '<p class="footer-tag">大学生AI求职工具 · AI填网申 + AI找工作 + AI改简历 + 3张在线表格 · 全链路覆盖校招求职</p>'
      + '<p class="footer-copy">©2026 本站为前端学习复刻演示（Demo），与任何商业产品无关，数据仅存于本地浏览器</p>'
      + "</div>"
      + '<div class="footer-cols">'
      + '<div class="fcol"><h4>AI工具</h4><a href="autofill.html">AI填网申</a><a href="job.html">AI找工作</a><a href="resume.html">AI改简历</a></div>'
      + '<div class="fcol"><h4>在线表格</h4><a href="campus.html">校招网申汇总表</a><a href="campus.html?table=intern">实习网申汇总表</a><a href="history.html">投递进展表</a></div>'
      + '<div class="fcol"><h4>支持</h4><a href="javascript:void 0" data-open-settings>AI与数据源设置</a><a href="index.html#tools">全部工具</a><a href="index.html">返回首页</a></div>'
      + "</div></footer>";
  }

  function modalsHTML() {
    return ''
      + '<div class="modal" id="loginModal" role="dialog" aria-modal="true" aria-label="登录" hidden>'
      + '<div class="modal-mask" data-close-modal></div>'
      + '<div class="modal-card">'
      + '<button class="modal-close" data-close-modal type="button" aria-label="关闭">×</button>'
      + '<div class="modal-tabs" role="tablist">'
      + '<button class="mtab is-active" role="tab" aria-selected="true" type="button" data-mtab="phone">手机号登录</button>'
      + '<button class="mtab" role="tab" aria-selected="false" type="button" data-mtab="wechat">微信登录</button>'
      + "</div>"
      + '<div class="modal-pane" data-mpane="phone">'
      + '<div class="field"><label for="phoneInput">手机号</label><input id="phoneInput" type="tel" maxlength="11" placeholder="请输入手机号" autocomplete="tel"></div>'
      + '<div class="field"><label for="codeInput">验证码</label><div class="code-row">'
      + '<input id="codeInput" type="text" maxlength="6" placeholder="请输入验证码">'
      + '<button class="btn btn-ghost btn-sm" id="sendCodeBtn" type="button">获取验证码</button></div></div>'
      + '<button class="btn btn-primary btn-block" id="phoneLoginBtn" type="button">登录 / 注册</button>'
      + "</div>"
      + '<div class="modal-pane" data-mpane="wechat" hidden>'
      + '<div class="qr-demo" aria-label="微信登录二维码（演示）"><div class="qr-grid" aria-hidden="true"></div><p>打开微信扫一扫（演示环境，任意输入即可）</p></div>'
      + "</div>"
      + '<p class="modal-tip">演示站点：登录信息仅保存在你的浏览器本地</p>'
      + "</div></div>"

      + '<div class="modal" id="settingsModal" role="dialog" aria-modal="true" aria-label="设置" hidden>'
      + '<div class="modal-mask" data-close-modal></div>'
      + '<div class="modal-card modal-wide">'
      + '<button class="modal-close" data-close-modal type="button" aria-label="关闭">×</button>'
      + '<h3 class="modal-title">⚙️ AI 与数据源设置</h3>'
      + '<p class="modal-sub">不配置也能用：所有AI功能走本地规则引擎；岗位数据默认走免费公开真实接口。</p>'
      + '<h4 class="group-title">大模型 API（可选，OpenAI 兼容）</h4>'
      + '<div class="field"><label for="setAiBase">API Base URL</label><input id="setAiBase" type="text" placeholder="https://api.openai.com/v1"></div>'
      + '<div class="field-row">'
      + '<div class="field"><label for="setAiKey">API Key</label><input id="setAiKey" type="password" placeholder="sk-..."></div>'
      + '<div class="field"><label for="setAiModel">模型名</label><input id="setAiModel" type="text" placeholder="gpt-4o-mini / glm-4-flash"></div>'
      + "</div>"
      + '<h4 class="group-title">岗位数据源</h4>'
      + '<div class="field"><label for="setJobSource">数据源</label><select id="setJobSource">'
      + '<option value="arbeitnow">Arbeitnow（免费公开 · 真实岗位）</option>'
      + '<option value="remotive">Remotive（免费公开 · 真实岗位）</option>'
      + '<option value="custom">自定义端点（可接入国内岗位API）</option>'
      + "</select></div>"
      + '<div class="field"><label for="setJobCustom">自定义端点 URL（返回岗位JSON数组）</label><input id="setJobCustom" type="text" placeholder="https://example.com/api/jobs"></div>'
      + '<p class="modal-sub">自定义端点返回格式：[{"title":"岗位","company":"公司","location":"城市","tags":["技能"],"url":"申请链接","description":"描述"}]</p>'
      + '<div class="modal-actions">'
      + '<button class="btn btn-ghost" id="testConnBtn" type="button">测试连接</button>'
      + '<button class="btn btn-primary" id="saveSettingsBtn" type="button">保存设置</button>'
      + "</div>"
      + "</div></div>";
  }

  /* ---------------- 挂载 ---------------- */
  function mountShell(active) {
    var body = document.body;
    body.insertAdjacentHTML("afterbegin", shellHTML(active || ""));
    var main = body.querySelector("main.content");
    if (main) {
      var layout = document.createElement("div");
      layout.className = "layout";
      body.insertBefore(layout, main);
      layout.appendChild(body.querySelector("aside.dock"));
      layout.appendChild(main);
      main.insertAdjacentHTML("beforeend", footerHTML());
    }
    body.insertAdjacentHTML("beforeend", modalsHTML());
    body.insertAdjacentHTML("beforeend",
      '<div class="toast" id="toast" role="status"></div>' +
      '<button class="backtop" id="backTop" type="button" aria-label="返回顶部">↑</button>');
    initTheme(); initNav(); initLogin(); initSettings(); initBacktop(); initReveal();
  }

  /* ---------------- 主题 ---------------- */
  function initTheme() {
    var btn = document.getElementById("themeToggle");
    var icon = btn.querySelector(".theme-icon");
    function apply(t) {
      document.documentElement.setAttribute("data-theme", t);
      icon.textContent = t === "dark" ? "🌙" : "☀️";
      btn.setAttribute("aria-label", t === "dark" ? "切换浅色主题" : "切换深色主题");
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", t === "dark" ? "#0e0e10" : "#f4f4f7");
      try { localStorage.setItem("jo-theme", t); } catch (e) {}
      document.dispatchEvent(new CustomEvent("jo-theme", { detail: t }));
    }
    var saved = "dark";
    try { saved = localStorage.getItem("jo-theme") || "dark"; } catch (e) {}
    apply(saved);
    btn.addEventListener("click", function () {
      apply(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  }

  /* ---------------- 导航 / 移动端菜单 ---------------- */
  function initNav() {
    var menuBtn = document.getElementById("menuBtn");
    var topnav = document.getElementById("topnav");
    menuBtn.addEventListener("click", function () {
      var open = topnav.classList.toggle("open");
      menuBtn.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    topnav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { topnav.classList.remove("open"); menuBtn.classList.remove("open"); }
    });
  }

  /* ---------------- Toast ---------------- */
  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  /* ---------------- 登录 ---------------- */
  function refreshLoginUI() {
    var user = getUser();
    var top = document.getElementById("loginBtn");
    var dock = document.getElementById("dockLoginBtn");
    if (user) {
      var masked = user.phone.slice(0, 3) + "****" + user.phone.slice(7);
      top.textContent = masked;
      top.title = "点击退出登录";
      dock.querySelector(".dock-txt").textContent = masked;
    } else {
      top.textContent = "登录"; top.title = "";
      dock.querySelector(".dock-txt").textContent = "登录/注册";
    }
  }

  function initLogin() {
    var modal = document.getElementById("loginModal");
    function openLogin() {
      if (getUser()) {                       // 已登录 → 点击=退出
        store.del("jo-user");
        refreshLoginUI();
        toast("已退出登录");
        return;
      }
      modal.hidden = false; document.body.style.overflow = "hidden";
      setTimeout(function () { var p = document.getElementById("phoneInput"); p && p.focus(); }, 60);
    }
    function closeLogin() { modal.hidden = true; document.body.style.overflow = ""; }

    document.getElementById("loginBtn").addEventListener("click", openLogin);
    document.getElementById("dockLoginBtn").addEventListener("click", openLogin);

    modal.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close-modal")) closeLogin(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) closeLogin();
      var sm = document.getElementById("settingsModal");
      if (e.key === "Escape" && sm && !sm.hidden) sm.hidden = true, document.body.style.overflow = "";
    });

    modal.querySelectorAll(".mtab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        modal.querySelectorAll(".mtab").forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on));
        });
        var key = tab.getAttribute("data-mtab");
        modal.querySelectorAll("[data-mpane]").forEach(function (p) {
          p.hidden = p.getAttribute("data-mpane") !== key;
        });
      });
    });

    var sendBtn = document.getElementById("sendCodeBtn");
    sendBtn.addEventListener("click", function () {
      var phone = document.getElementById("phoneInput").value.trim();
      if (!/^1\d{10}$/.test(phone)) { toast("请输入正确的 11 位手机号"); return; }
      var left = 60; sendBtn.disabled = true; sendBtn.textContent = left + "s 后重发";
      toast("演示环境：验证码任意填写");
      var timer = setInterval(function () {
        left--;
        if (left <= 0) { clearInterval(timer); sendBtn.disabled = false; sendBtn.textContent = "获取验证码"; }
        else sendBtn.textContent = left + "s 后重发";
      }, 1000);
    });

    document.getElementById("phoneLoginBtn").addEventListener("click", function () {
      var phone = document.getElementById("phoneInput").value.trim();
      var code = document.getElementById("codeInput").value.trim();
      if (!/^1\d{10}$/.test(phone)) { toast("请输入正确的 11 位手机号"); return; }
      if (code.length < 4) { toast("请输入验证码（演示环境任意4位）"); return; }
      store.set("jo-user", { phone: phone, at: Date.now() });
      refreshLoginUI(); closeLogin(); toast("登录成功，欢迎你，剑友 ⚔️");
    });

    refreshLoginUI();
  }

  /* ---------------- 设置弹窗 ---------------- */
  function initSettings() {
    var modal = document.getElementById("settingsModal");
    var s = getSettings();
    function openSettings() {
      var cur = getSettings();
      document.getElementById("setAiBase").value = cur.aiBase;
      document.getElementById("setAiKey").value = cur.aiKey;
      document.getElementById("setAiModel").value = cur.aiModel;
      document.getElementById("setJobSource").value = cur.jobSource;
      document.getElementById("setJobCustom").value = cur.jobCustomUrl;
      modal.hidden = false; document.body.style.overflow = "hidden";
    }
    function close() { modal.hidden = true; document.body.style.overflow = ""; }

    Array.prototype.forEach.call(document.querySelectorAll("[data-open-settings], #settingsBtn, #dockSettingsBtn"), function (el) {
      el.addEventListener("click", openSettings);
    });
    modal.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close-modal")) close(); });

    document.getElementById("saveSettingsBtn").addEventListener("click", function () {
      store.set("jo-settings", {
        aiBase: document.getElementById("setAiBase").value.trim() || "https://api.openai.com/v1",
        aiKey: document.getElementById("setAiKey").value.trim(),
        aiModel: document.getElementById("setAiModel").value.trim() || "gpt-4o-mini",
        jobSource: document.getElementById("setJobSource").value,
        jobCustomUrl: document.getElementById("setJobCustom").value.trim()
      });
      toast("设置已保存（仅存本地浏览器）");
      close();
      document.dispatchEvent(new CustomEvent("jo-settings"));
    });

    document.getElementById("testConnBtn").addEventListener("click", function () {
      var key = document.getElementById("setAiKey").value.trim();
      var base = document.getElementById("setAiBase").value.trim().replace(/\/$/, "");
      var src = document.getElementById("setJobSource").value;
      if (key) {
        toast("正在测试大模型连接…");
        fetch(base + "/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
          body: JSON.stringify({ model: document.getElementById("setAiModel").value.trim() || "gpt-4o-mini", messages: [{ role: "user", content: "hi" }], max_tokens: 5 })
        }).then(function (r) {
          toast(r.ok ? "✅ 大模型连接成功" : "❌ 大模型返回 " + r.status + "，请检查Key/模型名");
        }).catch(function () { toast("❌ 无法连接大模型（网络/CORS）"); });
      } else if (src === "custom") {
        var url = document.getElementById("setJobCustom").value.trim();
        if (!url) { toast("请先填写自定义端点URL"); return; }
        toast("正在测试岗位数据源…");
        fetch(url).then(function (r) { toast(r.ok ? "✅ 数据源连接成功" : "❌ 数据源返回 " + r.status); })
          .catch(function () { toast("❌ 无法连接数据源（网络/CORS）"); });
      } else {
        toast("✅ 公开数据源无需Key，AI将使用本地规则引擎");
      }
    });
  }

  /* ---------------- 返回顶部 / 滚动出现 ---------------- */
  function initBacktop() {
    var btn = document.getElementById("backTop");
    window.addEventListener("scroll", function () {
      btn.classList.toggle("show", window.scrollY > 700);
    }, { passive: true });
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); }); return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- 导出 ---------------- */
  window.QZ = {
    esc: esc,
    store: store,
    toast: toast,
    getSettings: getSettings,
    getUser: getUser,
    mountShell: mountShell
  };
})();
