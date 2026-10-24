/* ============================================================
   剑指OFFER —— 首页脚本：星空 / 海报渲染 / Tabs
   ============================================================ */
(function () {
  "use strict";
  QZ.mountShell("index");

  /* ---------------- 星空背景 ---------------- */
  var canvas = document.getElementById("starfield");
  if (canvas && canvas.getContext) {
    var ctx2d = canvas.getContext("2d");
    var stars = [];
    var rafId = null;

    function resize() {
      var hero = canvas.parentElement;
      canvas.width = hero.clientWidth;
      canvas.height = hero.clientHeight;
      buildStars();
    }
    function buildStars() {
      stars = [];
      var count = Math.min(220, Math.floor(canvas.width * canvas.height / 5200));
      var isLight = document.documentElement.getAttribute("data-theme") === "light";
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.5 + 0.4,
          a: Math.random(),
          va: Math.random() * 0.02 + 0.004,
          vy: Math.random() * 0.16 + 0.03
        });
      }
    }
    function draw() {
      var isLight = document.documentElement.getAttribute("data-theme") === "light";
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.a += s.va; s.y += s.vy;
        if (s.y > canvas.height + 4) { s.y = -4; s.x = Math.random() * canvas.width; }
        var alpha = (Math.sin(s.a) + 1) / 2 * (isLight ? 0.5 : 0.9);
        ctx2d.beginPath();
        ctx2d.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx2d.fillStyle = isLight ? "rgba(109,92,231," + alpha.toFixed(3) + ")" : "rgba(235,235,255," + alpha.toFixed(3) + ")";
        ctx2d.fill();
      }
      rafId = requestAnimationFrame(draw);
    }
    resize(); draw();
    window.addEventListener("resize", function () { cancelAnimationFrame(rafId); resize(); draw(); });
    document.addEventListener("jo-theme", function () { buildStars(); });
  }

  /* ---------------- 海报渲染（演示屏幕） ---------------- */
  var posters = {
    autofill: function (tab) {
      var url = ["upload-resume → 资料库", "campus.example.com/apply", "campus.example.com/apply"][tab] || "";
      var heads = ["📚 已解析你的简历资料库", "⚡ AI 一键填写中", "🧠 缺失字段学习补充"][tab];
      var labels = [
        ["张三", "138****8866", "zhang@stu.edu.cn", "本科 · 华中科技大学"],
        ["姓名", "手机号", "邮箱", "教育经历"],
        ["期望薪资：20-30K", "政治面貌：共青团员", "接受调剂：是", "已写入资料库 ✓"]
      ][tab];
      var rows = labels.map(function (l) {
        return '<div class="mock-field"><span style="font-size:11px">' + esc2(l.split("：")[0].slice(0, 8)) + '</span><div class="fill"></div></div>';
      }).join("");
      function esc2(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
      return '<div class="mock-title">🧩 <span class="mlang">' + heads + '</span></div>' +
        '<div class="mock-browser" style="position:relative">' +
        '<div class="mock-bar"><i></i><i></i><i></i><span class="mock-url">' + url + '</span></div>' +
        '<div class="mock-fields">' + rows + '</div>' +
        '<span class="mock-float-btn">⚔️ 一键填写</span>' +
        '</div>';
    },
    job: function (tab) {
      var tips = ["真实岗位 · 实时搜索", "人岗匹配 · 基于你的简历", "申请直达 · 一键跳转"];
      var jobs = [
        [["A", "Acme Tech · Frontend Engineer", "Berlin · Full-time", "92%"],
         ["N", "Nova Labs · Data Analyst", "Remote · Contract", "88%"],
         ["Q", "Quantify · Graduate Developer", "Munich · Full-time", "85%"]],
        [["R", "Realtime Corp · React Developer", "Remote · 15 matched skills", "95%"],
         ["C", "Cloudline · Junior Backend", "Remote · 12 matched skills", "83%"],
         ["D", "Datawave · BI Analyst", "Hamburg · 10 matched skills", "78%"]],
        [["→", "real-job-board.com/apply/1024", "点击卡片 → 官网直达", "真实链接"],
         ["→", "real-job-board.com/apply/2048", "无需注册中间页", "真实链接"],
         ["→", "real-job-board.com/apply/4096", "岗位详情含完整JD", "真实链接"]]
      ][tab];
      var rows = jobs.map(function (j) {
        var high = j[3].indexOf("%") > -1 && parseInt(j[3]) >= 90;
        return '<div class="mock-job"><span class="co">' + j[0] + '</span>' +
          '<div class="info"><b>' + j[1] + '</b><span>' + j[2] + '</span></div>' +
          '<span class="match' + (high ? " high" : "") + '">' + j[3] + '</span></div>';
      }).join("");
      return '<div class="mock-title">🔍 <span class="mlang">' + tips[tab] + '</span></div><div class="mock-jobs">' + rows + "</div>";
    }
  };

  function renderPoster(posterEl, tab) {
    var key = posterEl.getAttribute("data-poster");
    var fn = posters[key];
    if (!fn) return;
    var t = (tab == null) ? 0 : tab;
    posterEl.querySelector(".poster-inner").innerHTML = fn(t);
  }
  document.querySelectorAll(".poster").forEach(function (p) { renderPoster(p, 0); });

  // 功能Tabs联动海报
  document.querySelectorAll(".feature-tabs").forEach(function (group) {
    var tabs = Array.prototype.slice.call(group.querySelectorAll(".ftab"));
    var section = group.closest(".tool-section");
    var poster = section ? section.querySelector(".poster") : null;
    tabs.forEach(function (tab, idx) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", String(on));
        });
        if (poster) renderPoster(poster, idx);
      });
    });
  });
})();
