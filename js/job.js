/* ============================================================
   剑指OFFER —— AI找工作页：真实岗位API + 人岗匹配
   数据源：Arbeitnow / Remotive（免费公开、CORS开放、真实在招岗位）
   ============================================================ */
(function () {
  "use strict";
  QZ.mountShell("job");

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var PAGE_SIZE = 10;
  var jobs = [];          // 规范化后的岗位
  var page = 1;
  var lastFetchedPages = 0;
  var lastKw = "", lastLoc = "";

  /* ---------------- 资料库 → 匹配关键词 ---------------- */
  function profileSkills() {
    var p = QZ.store.get("jo-profile", {});
    if (!p.skills) return [];
    return p.skills.split(/[\/,、;；\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function matchScore(job, skills) {
    if (!skills.length) return null;
    var hay = (job.title + " " + (job.tags || []).join(" ") + " " + stripHtml(job.desc)).toLowerCase();
    var hit = 0;
    skills.forEach(function (s) {
      var kw = s.toLowerCase();
      if (kw && hay.indexOf(kw) > -1) hit++;
    });
    return Math.round((hit / skills.length) * 100);
  }
  function stripHtml(html) {
    if (!html) return "";
    var doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script,style,iframe").forEach(function (n) { n.remove(); });
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  /* ---------------- 数据源适配 ---------------- */
  function fetchJobs(source, kw, pageIdx) {
    if (source === "remotive") {
      var url = "https://remotive.com/api/jobs?limit=60";
      if (kw) url += "&search=" + encodeURIComponent(kw);
      return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
        lastFetchedPages = 1;
        return (d.jobs || []).map(function (j) {
          return {
            id: "r" + j.id, title: j.title || "", company: j.company_name || "",
            location: j.candidate_required_location || "—",
            tags: (j.tags || []).slice(0, 6),
            desc: j.description || "", url: j.url || "#",
            remote: /remote|anywhere|worldwide/i.test(j.candidate_required_location || ""),
            date: (j.pubdate || "").slice(0, 10), source: "Remotive"
          };
        });
      });
    }
    if (source === "custom") {
      var s = QZ.getSettings();
      if (!s.jobCustomUrl) return Promise.reject(new Error("未配置自定义端点URL，请在设置中填写"));
      return fetch(s.jobCustomUrl).then(function (r) { return r.json(); }).then(function (d) {
        var arr = Array.isArray(d) ? d : (d.data || d.jobs || []);
        lastFetchedPages = 1;
        return arr.map(function (j, i) {
          return {
            id: "c" + i, title: j.title || j.position || "未命名岗位", company: j.company || j.company_name || "",
            location: j.location || j.city || "—",
            tags: j.tags || [], desc: j.description || "", url: j.url || "#",
            remote: !!j.remote || /remote/i.test(j.location || ""),
            date: (j.date || j.created_at || "").slice(0, 10), source: "自定义"
          };
        });
      });
    }
    // 默认：Arbeitnow
    return fetch("https://www.arbeitnow.com/api/job-board-api?page=" + (pageIdx || 1))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        lastFetchedPages = pageIdx || 1;
        return (d.data || []).map(function (j) {
          return {
            id: "a" + j.slug, title: j.title || "", company: j.company_name || "",
            location: j.location || "—",
            tags: (j.tags || []).slice(0, 6),
            desc: j.description || "", url: j.url || "#",
            remote: !!j.remote,
            date: j.created_at ? new Date(j.created_at * 1000).toISOString().slice(0, 10) : "",
            source: "Arbeitnow"
          };
        });
      });
  }

  /* ---------------- 渲染 ---------------- */
  function skeleton() {
    $("#resultArea").innerHTML = '<div class="skeleton"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>';
  }
  function errorCard(msg) {
    $("#resultArea").innerHTML =
      '<div class="empty-state"><p class="ico">📡</p><b>拉取岗位数据失败</b><p>' + QZ.esc(msg) +
      '<br>提示：公共接口偶发限流或网络受限，可稍后重试，或在【设置】中更换数据源/填入自定义端点。</p>' +
      '<button class="btn btn-primary btn-sm" data-open-settings type="button">打开设置</button></div>';
    var b = $("#resultArea [data-open-settings]");
    if (b) b.addEventListener("click", function () { document.getElementById("settingsBtn").click(); });
  }
  function emptyCard() {
    $("#resultArea").innerHTML =
      '<div class="empty-state"><p class="ico">🔍</p><b>没有匹配的真实岗位</b><p>换个关键词试试，比如 frontend / java / data / marketing</p></div>';
  }

  function renderList() {
    var skills = profileSkills();
    var remoteOnly = $("#remoteOnly").checked;
    var loc = $("#locInput").value.trim().toLowerCase();
    var kw = $("#kwInput").value.trim().toLowerCase();

    var filtered = jobs.filter(function (j) {
      if (remoteOnly && !j.remote) return false;
      if (loc && (j.location || "").toLowerCase().indexOf(loc) === -1) return false;
      if (kw && (j.title + " " + (j.tags || []).join(" ") + " " + j.company).toLowerCase().indexOf(kw) === -1) return false;
      return true;
    });

    if (!filtered.length) {
      $("#pager").style.display = "none";
      emptyCard();
      return;
    }
    var totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (page > totalPages) page = totalPages;
    var slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    var html = '<div class="job-list">' + slice.map(function (j) {
      var score = matchScore(j, skills);
      var side;
      if (score == null) {
        side = '<div class="score-ring na"><b>上传简历<br>得匹配分</b></div>';
      } else {
        var C = 2 * Math.PI * 22;
        var off = C * (1 - score / 100);
        side = '<div class="score-ring" title="基于资料库技能匹配">' +
          '<svg width="52" height="52"><circle class="bg" cx="26" cy="26" r="22" fill="none" stroke-width="4"/>' +
          '<circle class="fg' + (score >= 80 ? " high" : "") + '" cx="26" cy="26" r="22" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
          "<b>" + score + "%</b></div>";
      }
      var tags = (j.tags || []).slice(0, 5).map(function (t) { return "<i>" + QZ.esc(t) + "</i>"; }).join("");
      return '<article class="job-card" data-id="' + QZ.esc(j.id) + '">' +
        '<span class="jco">' + QZ.esc((j.company || j.title || "?").slice(0, 1).toUpperCase()) + "</span>" +
        '<div class="jmain"><h4>' + QZ.esc(j.title) + "</h4>" +
        '<div class="jmeta"><span>🏢 ' + QZ.esc(j.company || "—") + "</span>" +
        "<span>📍 " + QZ.esc(j.location) + "</span>" +
        (j.date ? "<span>🗓 " + QZ.esc(j.date) + "</span>" : "") +
        (j.remote ? '<span class="remote-badge">远程</span>' : "") + "</div>" +
        (tags ? '<div class="jtags">' + tags + "</div>" : "") +
        "</div>" +
        '<div class="job-side">' + side + '<span class="jdate">' + QZ.esc(j.source) + "</span></div></article>";
    }).join("") + "</div>";

    $("#resultArea").innerHTML = html;
    var pager = $("#pager");
    pager.style.display = "flex";
    $("#pageInfo").textContent = "第 " + page + " / " + totalPages + " 页 · 共 " + filtered.length + " 条真实岗位";
    $("#prevBtn").disabled = page <= 1;
    $("#nextBtn").disabled = page >= totalPages;

    $$("#resultArea .job-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var j = filtered.filter(function (x) { return x.id === card.getAttribute("data-id"); })[0];
        if (j) openDetail(j);
      });
    });
  }

  function openDetail(j) {
    var skills = profileSkills();
    var score = matchScore(j, skills);
    var modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML =
      '<div class="modal-mask"></div>' +
      '<div class="modal-card modal-wide">' +
      '<button class="modal-close" aria-label="关闭">×</button>' +
      '<h3 class="modal-title">' + QZ.esc(j.title) + "</h3>" +
      '<p class="modal-sub">🏢 ' + QZ.esc(j.company || "—") + " · 📍 " + QZ.esc(j.location) +
      (j.date ? " · 🗓 " + QZ.esc(j.date) : "") + " · 数据源 " + QZ.esc(j.source) + "</p>" +
      (score != null ? '<p class="modal-sub">🎯 与你资料库的技能匹配度：<b style="color:var(--' + (score >= 80 ? "ok" : score >= 50 ? "warn" : "bad") + ')">' + score + "%</b>（关键词重合算法，本地计算）</p>" : "") +
      '<div class="detail-desc">' + QZ.esc(cleanDesc(j.desc)).slice(0, 6000) + "</div>" +
      '<div class="modal-actions">' +
      '<a class="btn btn-primary" href="' + QZ.esc(j.url) + '" target="_blank" rel="noopener">🚀 前往官网申请</a>' +
      '<button class="btn btn-ghost" data-act="close">关闭</button>' +
      "</div></div>";
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    function close() { modal.remove(); document.body.style.overflow = ""; }
    modal.querySelector(".modal-close").addEventListener("click", close);
    modal.querySelector("[data-act=close]").addEventListener("click", close);
    modal.querySelector(".modal-mask").addEventListener("click", close);
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });
  }

  function cleanDesc(html) {
    var doc = new DOMParser().parseFromString(html || "", "text/html");
    doc.querySelectorAll("script,style,iframe,img").forEach(function (n) { n.remove(); });
    var text = doc.body ? doc.body.textContent : "";
    return (text || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  /* ---------------- 搜索流程 ---------------- */
  function search() {
    var s = QZ.getSettings();
    var source = $("#sourceSel").value;
    page = 1;
    lastKw = $("#kwInput").value.trim();
    lastLoc = $("#locInput").value.trim();
    skeleton();
    fetchJobs(source, lastKw, 1)
      .then(function (list) {
        jobs = list;
        if (!jobs.length) { emptyCard(); $("#pager").style.display = "none"; return; }
        renderList();
        QZ.toast("✅ 拉取到 " + jobs.length + " 条真实岗位");
      })
      .catch(function (e) { errorCard(e.message || "网络错误"); });
  }

  $("#searchBtn").addEventListener("click", search);
  $("#kwInput").addEventListener("keydown", function (e) { if (e.key === "Enter") search(); });
  $("#locInput").addEventListener("keydown", function (e) { if (e.key === "Enter") renderList(); });
  $("#locInput").addEventListener("input", function () { page = 1; renderList(); });
  $("#remoteOnly").addEventListener("change", function () { page = 1; renderList(); });
  $("#prevBtn").addEventListener("click", function () { if (page > 1) { page--; renderList(); } });
  $("#nextBtn").addEventListener("click", function () { page++; renderList(); });

  // 数据源下拉与设置同步
  var s = QZ.getSettings();
  $("#sourceSel").value = s.jobSource === "custom" && !s.jobCustomUrl ? "arbeitnow" : s.jobSource;
  $("#sourceSel").addEventListener("change", function () {
    var cur = QZ.getSettings();
    cur.jobSource = $("#sourceSel").value;
    QZ.store.set("jo-settings", cur);
    QZ.toast("数据源已切换：" + $("#sourceSel").selectedOptions[0].textContent.replace("数据源：", ""));
  });

  // 资料库提示
  var skills = profileSkills();
  $("#profileHint").innerHTML = skills.length
    ? "🎯 已载入你的技能关键词：<b style='color:var(--accent)'>" + QZ.esc(skills.slice(0, 8).join(" / ")) + "</b>，将用于实时计算匹配度"
    : "💡 资料库为空，所有岗位不显示匹配分。前往 <a href='autofill.html' style='color:var(--accent)'>AI填网申</a> 上传简历后即可开启匹配";
})();
