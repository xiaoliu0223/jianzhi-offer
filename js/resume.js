/* ============================================================
   剑指OFFER —— AI改简历页：魔改 / 过机筛 / 在线模板
   ============================================================ */
(function () {
  "use strict";
  QZ.mountShell("resume");

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* ---------------- 模式切换（含URL参数） ---------------- */
  var params = new URLSearchParams(location.search);
  var mode = params.get("mode") || "magic";
  if (["magic", "ats", "ui"].indexOf(mode) === -1) mode = "magic";

  function switchMode(m) {
    mode = m;
    $$(".seg [data-mode]").forEach(function (b) {
      var on = b.getAttribute("data-mode") === m;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    $$("[data-pane]").forEach(function (p) {
      p.hidden = p.getAttribute("data-pane") !== m;
    });
    history.replaceState(null, "", m === "magic" ? "resume.html" : "resume.html?mode=" + m);
    window.scrollTo({ top: 0 });
  }
  $$(".seg [data-mode]").forEach(function (b) {
    b.addEventListener("click", function () { switchMode(b.getAttribute("data-mode")); });
  });
  switchMode(mode);

  function loadProfileText() {
    var p = QZ.store.get("jo-profile", {});
    var lines = [];
    if (p.school) lines.push("教育背景：" + p.school + " " + (p.major || "") + " " + (p.degree || "") + " " + (p.graduateYear || ""));
    if (p.skills) lines.push("技能：" + p.skills);
    if (p.experience) lines.push("实习/项目经历：\n" + p.experience);
    if (p.selfEval) lines.push("自我评价：" + p.selfEval);
    return lines.join("\n");
  }

  /* ================= 模式一：简历魔改 ================= */
  var tier = 2;
  $$("[data-tier]").forEach(function (b) {
    b.addEventListener("click", function () {
      tier = parseInt(b.getAttribute("data-tier"), 10);
      $$("[data-tier]").forEach(function (x) { x.classList.toggle("is-on", x === b); });
    });
  });

  $("#magicLoadProfile").addEventListener("click", function () {
    var t = loadProfileText();
    if (!t) { QZ.toast("资料库为空，请先去「AI填网申」上传简历"); return; }
    $("#magicIn").value = t;
    QZ.toast("已载入资料库内容");
  });

  $("#magicRun").addEventListener("click", function () {
    var text = $("#magicIn").value.trim();
    if (!text) { QZ.toast("请先粘贴简历内容"); return; }
    var out = $("#magicOut");
    out.innerHTML = '<div class="skeleton"><div class="sk" style="height:60px"></div><div class="sk" style="height:60px"></div></div>';
    JOAI.rewriteSmart(text, tier).then(function (res) {
      if (res.engine === "api") {
        out.innerHTML =
          '<span class="engine-badge api">已使用大模型API</span>' +
          '<div class="rewrite-out"><div class="rw-line" style="white-space:pre-wrap">' + QZ.esc(res.text) + "</div></div>";
        $("#magicCopy").style.display = "";
        $("#magicCopy").onclick = function () {
          navigator.clipboard.writeText(res.text).then(function () { QZ.toast("已复制到剪贴板"); });
        };
        return;
      }
      var html = res.results.map(function (r) {
        if (r.type === "header") return '<div class="rw-line rw-header">' + QZ.esc(r.text) + "</div>";
        if (r.type === "plain") return '<div class="rw-line">' + QZ.esc(r.text) + "</div>";
        if (r.type === "extra") {
          return '<div class="rw-line" style="border-style:dashed"><b>' + QZ.esc(r.text) + "</b>" +
            r.notes.map(function (n) { return '<p class="rw-note">⚠ ' + QZ.esc(n) + "</p>"; }).join("") + "</div>";
        }
        var marked = QZ.esc(r.text);
        (r.changed || []).forEach(function (c) {
          var pair = c.split(" → ");
          if (pair.length === 2) {
            try {
              marked = marked.replace(new RegExp(pair[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
                "<mark>" + QZ.esc(pair[1]) + "</mark>");
            } catch (e) {}
          }
        });
        return '<div class="rw-line"><span>• </span>' + marked +
          (r.changed && r.changed.length ? '<p class="rw-note">🔧 ' + QZ.esc(r.changed.join("；")) + "</p>" : "") +
          (r.notes || []).map(function (n) { return '<p class="rw-note">⚠ ' + QZ.esc(n) + "</p>"; }).join("") +
          "</div>";
      }).join("");
      out.innerHTML =
        '<span class="engine-badge rule">本地规则引擎 · 未配置大模型Key</span>' +
        '<div class="rewrite-out">' + html + "</div>";
      $("#magicCopy").style.display = "";
      $("#magicCopy").onclick = function () {
        var plain = res.results.map(function (r) { return (r.type === "bullet" ? "• " : "") + r.text; }).join("\n");
        navigator.clipboard.writeText(plain).then(function () { QZ.toast("已复制到剪贴板"); });
      };
    });
  });

  /* ================= 模式二：过机筛 ================= */
  $("#atsLoadProfile").addEventListener("click", function () {
    var t = loadProfileText();
    if (!t) { QZ.toast("资料库为空，请先去「AI填网申」上传简历"); return; }
    $("#resumeIn").value = t;
    QZ.toast("已载入资料库内容");
  });

  $("#atsRun").addEventListener("click", function () {
    var jd = $("#jdIn").value.trim();
    var resume = $("#resumeIn").value.trim();
    if (!jd || !resume) { QZ.toast("请同时填写 JD 和简历"); return; }
    var m = JOAI.matchJD(jd, resume);
    var C = 2 * Math.PI * 64;
    var off = C * (1 - m.score / 100);
    var ringColor = m.score >= 70 ? "var(--ok)" : m.score >= 40 ? "var(--warn)" : "var(--bad)";
    var html =
      '<div class="analyze">' +
      '<div class="score-big"><svg viewBox="0 0 160 160">' +
      '<circle class="bg" cx="80" cy="80" r="64" fill="none" stroke-width="10"/>' +
      '<circle class="fg" cx="80" cy="80" r="64" fill="none" stroke-width="10" stroke-linecap="round" style="stroke:' + ringColor + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      "</svg><div class=\"val\"><b>" + m.score + "%</b><span>关键词命中率</span></div></div>" +
      '<div>' +
      '<p class="kw-list-title">✅ 已命中 ' + m.matched.length + " 个关键词（机筛能认出的部分）</p>" +
      '<div class="kw-chips">' + (m.matched.length ? m.matched.map(function (w) { return '<span class="kw hit">' + QZ.esc(w) + "</span>"; }).join("") : "<span class='field-hint'>一个都没命中，机筛大概率挂</span>") + "</div>" +
      '<p class="kw-list-title">🎯 缺失关键词 ' + m.missing.length + " 个（建议补进简历）</p>" +
      '<div class="kw-chips">' + (m.missing.length ? m.missing.slice(0, 14).map(function (k) {
        return '<span class="kw miss">' + QZ.esc(k.word) + '<button type="button" data-kw="' + QZ.esc(k.word) + '" title="生成补写建议">+补</button></span>';
      }).join("") : "<span class='field-hint'>全部命中，稳了！</span>") + "</div>" +
      '<div id="suggestionBox"></div>' +
      "</div></div>";
    $("#atsOut").innerHTML = html;

    $$("#atsOut [data-kw]").forEach(function (b) {
      b.addEventListener("click", function () {
        var kw = b.getAttribute("data-kw");
        var box = $("#suggestionBox");
        var item = document.createElement("div");
        item.className = "rw-line";
        item.innerHTML = "<b>补写建议（" + QZ.esc(kw) + "）：</b>" +
          QZ.esc("熟悉" + kw + "，并在【某段项目/实习】中使用其完成【具体产出】，建议替换泛泛描述为可量化结果。");
        box.appendChild(item);
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  });

  /* ================= 模式三：在线模板 ================= */
  var sheet = $("#sheet");
  var TPL_KEY = "jo-resume-ui";

  // 恢复内容（整体保存/恢复，兼容四种模板结构）
  var savedSheet = QZ.store.get(TPL_KEY, null);
  if (savedSheet && savedSheet.tpl) {
    sheet.className = "sheet " + savedSheet.tpl;
    $$(".tpl-pick [data-tpl]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-tpl") === savedSheet.tpl);
    });
    if (savedSheet.html) sheet.innerHTML = savedSheet.html;
  }

  var saveTimer = null;
  function saveSheet() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      QZ.store.set(TPL_KEY, {
        tpl: (sheet.className.match(/tpl-[abcd]/) || ["tpl-a"])[0],
        html: sheet.innerHTML
      });
    }, 500);
  }
  sheet.addEventListener("input", saveSheet);

  $$(".tpl-pick [data-tpl]").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".tpl-pick [data-tpl]").forEach(function (x) { x.classList.toggle("on", x === b); });
      sheet.classList.remove("tpl-a", "tpl-b", "tpl-c", "tpl-d");
      sheet.classList.add(b.getAttribute("data-tpl"));
      saveSheet();
    });
  });

  $("#uiLoadProfile").addEventListener("click", function () {
    var p = QZ.store.get("jo-profile", {});
    if (!p.name && !p.school && !p.experience) { QZ.toast("资料库为空，请先去「AI填网申」上传简历"); return; }
    var set = function (sel, val) {
      var el = sheet.querySelector(sel);
      if (el && val) el.textContent = val;
    };
    set("h1", p.name);
    set(".rsub", [p.degree, p.major, p.graduateYear].filter(Boolean).join(" · ") || "求职简历");
    set(".rcontact", [p.phone, p.email, p.expectCity].filter(Boolean).join(" · "));

    // 教育背景
    var eduB = sheet.querySelectorAll(".ritem b")[0];
    var eduMeta = sheet.querySelectorAll(".ritem .rmeta")[0];
    if (eduB && p.school) eduB.textContent = p.school;
    if (eduMeta) eduMeta.textContent = [p.major, p.degree, p.graduateYear].filter(Boolean).join(" · ");
    // 技能
    set(".skills-line", p.skills || "");
    // 实习经历第一条列表
    if (p.experience) {
      var firstUl = sheet.querySelectorAll(".ritem ul")[0];
      if (firstUl) {
        firstUl.innerHTML = "";
        p.experience.split(/\r?\n/).filter(Boolean).slice(0, 5).forEach(function (l) {
          var li = document.createElement("li");
          li.contentEditable = "true";
          li.textContent = l;
          firstUl.appendChild(li);
        });
      }
    }
    // 自我评价（最后一个 skills-line）
    var evals = sheet.querySelectorAll(".skills-line");
    if (evals.length > 1 && p.selfEval) evals[evals.length - 1].textContent = p.selfEval;
    saveSheet();
    QZ.toast("已载入资料库内容，可继续编辑润色");
  });

  $("#uiAutoPage").addEventListener("click", function () {
    var base = 14, min = 9.5;
    var size = base;
    sheet.style.fontSize = size + "px";
    while (sheet.scrollHeight > 1123 && size > min) {
      size -= 0.5;
      sheet.style.fontSize = size + "px";
    }
    if (sheet.scrollHeight <= 1123) QZ.toast("✅ 已缩排到 " + size + "px，可控制在一页A4内");
    else QZ.toast("内容较多，已缩到最小字号，建议删减内容");
  });

  $("#uiClear").addEventListener("click", function () {
    if (!confirm("确定清空简历内容？")) return;
    QZ.store.del(TPL_KEY);
    location.reload();
  });

  $("#uiPrint").addEventListener("click", function () { window.print(); });
})();
