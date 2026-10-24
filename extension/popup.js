/* 剑指OFFER 插件 —— 弹窗：资料库管理 + 填写 + 学习 */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var FIXED_TOTAL = 11;

  function getProfile(cb) {
    chrome.storage.local.get(["jo-profile"], function (r) { cb(r["jo-profile"] || {}); });
  }
  function saveProfile(p, cb) {
    chrome.storage.local.set({ "jo-profile": p }, cb || function () {});
  }

  function status(msg, isError) {
    var el = $("#status");
    el.textContent = msg;
    el.style.color = isError ? "#ef5b6e" : "#52c98a";
  }

  function render() {
    getProfile(function (p) {
      var keys = ["name", "phone", "email", "school", "degree", "graduateYear", "expectCity", "major", "skills", "experience", "selfEval"];
      var filled = keys.filter(function (k) { return p[k] && String(p[k]).trim(); }).length;
      var learnedN = Object.keys(p.learned || {}).length;
      $("#sum").textContent = "资料库完整度 " + filled + "/" + FIXED_TOTAL + (learnedN ? " · 已学习 " + learnedN + " 项" : "");
      var parts = [];
      if (p.name) parts.push(p.name);
      if (p.phone) parts.push(p.phone);
      if (p.email) parts.push(p.email);
      if (p.degree) parts.push(p.degree);
      if (p.school) parts.push(p.school);
      if (p.expectCity) parts.push("期望:" + p.expectCity);
      $("#detail").textContent = parts.length ? parts.join(" · ") : "资料库为空：请先在演示站解析简历，再点「导入资料库」";
    });
  }

  /* ---------- 填写本页 ---------- */
  $("#fillBtn").addEventListener("click", function () {
    getProfile(function (profile) {
      if (!profile.name && !profile.phone && !profile.email && !Object.keys(profile.learned || {}).length) {
        status("资料库为空，请先导入或去演示站解析简历", true);
        return;
      }
      status("正在扫描本页表单…");
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || !tabs[0]) { status("找不到当前标签页", true); return; }
        var tabId = tabs[0].id;
        if (!/^https?:/i.test(tabs[0].url || "")) {
          status("此页面（" + (tabs[0].url || "").slice(0, 30) + "…）不支持注入，请打开企业网申页", true);
          return;
        }
        chrome.scripting.executeScript(
          { target: { tabId: tabId }, files: ["shared.js", "content.js"] },
          function () {
            if (chrome.runtime.lastError) {
              status("注入失败：" + chrome.runtime.lastError.message, true);
              return;
            }
            chrome.tabs.sendMessage(tabId, { type: "JO_FILL", profile: profile }, function (res) {
              if (chrome.runtime.lastError) {
                status("通信失败，请刷新网申页后重试", true);
                return;
              }
              if (res && res.error) { status("填写出错：" + res.error, true); return; }
              var msg = "✅ 已按资料库填写 " + (res ? res.filled : 0) + " 项";
              if (res && res.missing && res.missing.length) {
                msg += "；未识别/缺失：" + res.missing.slice(0, 4).join("、") + (res.missing.length > 4 ? " 等" : "");
              }
              status(msg);
            });
          }
        );
      });
    });
  });

  /* ---------- 学习本页修改 ---------- */
  $("#learnBtn").addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs || !tabs[0]) { status("找不到当前标签页", true); return; }
      var tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, { type: "JO_LEARN" }, function (res) {
        if (chrome.runtime.lastError || !res || res.error) {
          status("请先在本页用「填写本页表单」后再学习", true);
          return;
        }
        var pairs = res.pairs || {};
        var labels = Object.keys(pairs);
        if (!labels.length) { status("没有发现修改：你还没改动本页已填内容"); return; }
        getProfile(function (profile) {
          var learnedN = 0, fixedN = 0;
          labels.forEach(function (label) {
            var val = pairs[label];
            if ((profile.learned || {})[label]) {
              profile.learned[label] = val; learnedN++;
              return;
            }
            var field = window.JO_MATCH.ruleField(label);
            if (field) { profile[field] = val; fixedN++; }
            else {
              profile.learned = profile.learned || {};
              profile.learned[label] = val; learnedN++;
            }
          });
          saveProfile(profile, function () {
            render();
            status("🧠 已学习 " + learnedN + " 个新字段、修正 " + fixedN + " 个已有字段");
          });
        });
      });
    });
  });

  /* ---------- 导入 / 导出 ---------- */
  $("#importBtn").addEventListener("click", function () { $("#fileInput").click(); });
  $("#fileInput").addEventListener("change", function () {
    var f = $("#fileInput").files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var p = JSON.parse(String(reader.result));
        if (typeof p !== "object" || p === null) throw new Error("格式不对");
        saveProfile(p, function () {
          render();
          status("✅ 资料库已导入（" + Object.keys(p).length + " 个键）");
        });
      } catch (e) {
        status("导入失败：不是有效的资料库JSON", true);
      }
    };
    reader.readAsText(f, "utf-8");
  });

  $("#exportBtn").addEventListener("click", function () {
    getProfile(function (p) {
      if (!Object.keys(p).length) { status("资料库为空，无可导出", true); return; }
      var blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "jo-profile.json";
      a.click();
      status("已导出 jo-profile.json");
    });
  });

  render();
})();
