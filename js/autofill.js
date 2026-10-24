/* ============================================================
   剑指OFFER —— AI填网申页：资料库 + 模拟网申 + 缺失字段自动学习
   学习机制：AI填表时资料库缺的字段标记「待学习」→ 用户补填后勾选
   「记住」提交 → 标签-值写入资料库 → 下次网申自动带上
   ============================================================ */
(function () {
  "use strict";
  QZ.mountShell("autofill");

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var PROF_KEY = "jo-profile";

  /* 固定字段映射：表单标签 → 资料库键 */
  var FIXED = {
    "姓名": "name", "手机号": "phone", "邮箱": "email",
    "最高学历": "degree", "毕业年份": "graduateYear",
    "期望工作城市": "expectCity", "自我评价": "selfEval"
  };
  var FIXED_TOTAL = 11; // 完整度分母（资料库固定字段数）

  /* ---------------- 资料库核心 ---------------- */
  function loadProfile() { return QZ.store.get(PROF_KEY, {}); }
  function fillProfileForm(p) {
    $$("[data-pf]").forEach(function (input) {
      input.value = p[input.getAttribute("data-pf")] || "";
    });
  }
  function collectProfileForm() {
    var p = {};
    $$("[data-pf]").forEach(function (input) {
      p[input.getAttribute("data-pf")] = input.value.trim();
    });
    return p;
  }
  function saveProfile(p) {
    p.updatedAt = Date.now();
    QZ.store.set(PROF_KEY, p);
    $("#profileStatus").textContent = "已保存 · " + new Date().toLocaleTimeString();
    SYNC.push(p);
  }

  /* ---------------- 与插件的自动同步 ----------------
     桥接脚本(bridge.js)驻留在本站页面：保存即推送、打开即拉取合并，
     无需任何手动导入导出文件。 */
  var SYNC = {
    ready: false, reqId: 0, pending: {},
    init: function () {
      var self = this;
      window.addEventListener("message", function (e) {
        if (e.origin !== location.origin || !e.data || !e.data.__JO_BRIDGE__) return;
        if (e.data.type === "JO_BRIDGE_READY") { self.markReady(); return; }
        var cb = self.pending[e.data.requestId];
        if (cb) { delete self.pending[e.data.requestId]; cb(e.data); }
      });
      if (window.__JO_BRIDGE__) this.markReady();
      setTimeout(function () {
        if (!self.ready) self.setChip("⚪ 未检测到插件（确认已安装并启用后刷新本页）· 可手动导出JSON", "off");
      }, 3000);
    },
    markReady: function () {
      if (this.ready) return;
      this.ready = true;
      this.setChip("🟢 已连接插件 · 自动同步中", "ok");
      this.pullAndMerge();
    },
    setChip: function (text, cls) {
      var chip = $("#syncChip");
      if (!chip) return;
      chip.textContent = text;
      chip.className = "badge-soft " + (cls || "");
    },
    request: function (type, payload, cb) {
      var id = "r" + (++this.reqId);
      this.pending[id] = cb;
      window.postMessage(Object.assign({ __JO_PAGE__: true, type: type, requestId: id }, payload), location.origin);
    },
    push: function (profile) {
      if (!this.ready) return;
      var self = this;
      this.request("JO_PUSH_PROFILE", { profile: profile }, function (data) {
        if (data.ok === false) self.setChip("🔴 同步失败：" + (data.error || "请刷新本页"), "off");
        else self.setChip("🟢 已自动同步到插件 · " + new Date().toLocaleTimeString(), "ok");
      });
    },
    pullAndMerge: function () {
      var self = this;
      this.request("JO_PULL_PROFILE", {}, function (data) {
        var remote = data.profile;
        var local = loadProfile();
        if (!remote || !Object.keys(remote).length) {
          self.push(local);            // 插件侧为空 → 推送本地
          return;
        }
        if ((remote.updatedAt || 0) > (local.updatedAt || 0)) {
          var merged = mergeProfiles(local, remote);
          QZ.store.set(PROF_KEY, merged);
          fillProfileForm(merged);
          renderLearned(merged); updateCompleteness(merged);
          $("#profileStatus").textContent = "已从插件同步资料库 · " + new Date().toLocaleTimeString();
        } else {
          self.push(local);            // 本地更新 → 推回去
        }
      });
    }
  };

  function mergeProfiles(local, remote) {
    var lT = local.updatedAt || 0, rT = remote.updatedAt || 0;
    var base = rT >= lT ? Object.assign({}, local, remote) : Object.assign({}, remote, local);
    var learned = Object.assign({}, remote.learned || {}, local.learned || {});
    if (Object.keys(learned).length) base.learned = learned;
    base.updatedAt = Math.max(lT, rT);
    return base;
  }

  function updateCompleteness(p) {
    p = p || loadProfile();
    var keys = ["name", "phone", "email", "school", "degree", "graduateYear", "expectCity", "major", "skills", "experience", "selfEval"];
    var filled = keys.filter(function (k) { return p[k] && String(p[k]).trim(); }).length;
    var learnedN = Object.keys(p.learned || {}).length;
    $("#profileComplete").textContent = "完整度 " + filled + "/" + FIXED_TOTAL + (learnedN ? " · 已学习 " + learnedN + " 项" : "");
  }

  /* ---------------- 学习字段展示区 ---------------- */
  function renderLearned(p) {
    p = p || loadProfile();
    var wrap = $("#learnedWrap");
    var learned = p.learned || {};
    var keys = Object.keys(learned);
    if (!keys.length) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = '<p class="learned-head">🧠 AI 学习补充的字段（来自网申填写过程，可修改或删除）</p><div class="form-grid">' +
      keys.map(function (k) {
        return '<div class="field"><label>' + QZ.esc(k) +
          '<button class="unlearn-btn" data-unlearn="' + QZ.esc(k) + '" type="button" title="删除该学习字段">✕</button></label>' +
          '<input data-lf="' + QZ.esc(k) + '" value="' + QZ.esc(learned[k]) + '"></div>';
      }).join("") + "</div>";

    $$("#learnedWrap [data-unlearn]").forEach(function (b) {
      b.addEventListener("click", function () {
        var cur = loadProfile();
        delete (cur.learned || {})[b.getAttribute("data-unlearn")];
        saveProfile(cur); renderLearned(cur); updateCompleteness(cur);
        QZ.toast("已删除该学习字段");
      });
    });
    $$("#learnedWrap [data-lf]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var cur = loadProfile();
        cur.learned = cur.learned || {};
        cur.learned[inp.getAttribute("data-lf")] = inp.value.trim();
        saveProfile(cur); updateCompleteness(cur);
        QZ.toast("学习字段已更新");
      });
    });
  }

  function flashProfilePanel() {
    var panel = $("#profilePanel");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    panel.classList.remove("panel-flash");
    void panel.offsetWidth; // 重启动画
    panel.classList.add("panel-flash");
  }

  var saved = loadProfile();
  fillProfileForm(saved);
  renderLearned(saved);
  updateCompleteness(saved);
  if (Object.keys(saved).length) {
    $("#profileStatus").textContent = "本地已有资料库 · 自动载入";
  }
  SYNC.init();

  $("#saveProfileBtn").addEventListener("click", function () {
    var p = collectProfileForm();
    saveProfile(p); updateCompleteness(p);
    QZ.toast("资料库已保存到本地浏览器");
  });

  /* 导出资料库 JSON（供浏览器插件导入） */
  $("#exportProfileBtn").addEventListener("click", function () {
    var p = loadProfile();
    if (!Object.keys(p).length) { QZ.toast("资料库为空，先解析一份简历吧"); return; }
    var blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "jo-profile.json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 800);
    QZ.toast("已导出 jo-profile.json → 到插件弹窗点「导入资料库」");
  });
  $("#clearProfileBtn").addEventListener("click", function () {
    if (!confirm("确定清空资料库？此操作不可恢复。")) return;
    QZ.store.del(PROF_KEY);
    fillProfileForm({});
    renderLearned({}); updateCompleteness({});
    $("#profileStatus").textContent = "";
    SYNC.push({});
    QZ.toast("资料库已清空（已同步到插件）");
  });

  /* ---------------- 上传 / 粘贴 解析 ---------------- */
  var dz = $("#dropzone"), fileInput = $("#fileInput");
  dz.addEventListener("click", function () { fileInput.click(); });
  dz.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") fileInput.click(); });
  ["dragover", "dragenter"].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("drag"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("drag"); });
  });
  dz.addEventListener("drop", function (e) {
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) readAndParse(f);
  });
  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) readAndParse(fileInput.files[0]);
  });

  function readAndParse(file) {
    var name = (file.name || "").toLowerCase();
    if (/\.txt$|\.md$|\.markdown$/.test(name)) {
      var reader = new FileReader();
      reader.onload = function () { doParse(String(reader.result)); };
      reader.readAsText(file, "utf-8");
      return;
    }
    if (/\.docx$/.test(name)) {
      QZ.toast("正在解析 Word 文档…");
      file.arrayBuffer()
        .then(function (buf) { return JOAI.extractDocxText(buf); })
        .then(function (text) { $("#pasteArea").value = text; doParse(text); })
        .catch(function (e) { QZ.toast("❌ " + (e.message || "Word解析失败，可粘贴文本代替")); });
      return;
    }
    if (/\.pdf$/.test(name)) {
      QZ.toast("正在解析 PDF（首次需加载PDF引擎，请稍候）…");
      file.arrayBuffer()
        .then(function (buf) { return JOAI.extractPdfText(buf); })
        .then(function (text) { $("#pasteArea").value = text; doParse(text); })
        .catch(function (e) { QZ.toast("❌ " + (e.message || "PDF解析失败，可粘贴文本代替")); });
      return;
    }
    if (/\.doc$/.test(name)) {
      QZ.toast("旧版 .doc 暂不支持：请用 Word 另存为 .docx，或复制文本粘贴");
      return;
    }
    QZ.toast("暂不支持该格式：请上传 PDF / .docx / .txt / .md");
  }

  $("#parseBtn").addEventListener("click", function () {
    var text = $("#pasteArea").value.trim();
    if (!text) { QZ.toast("请先上传文件或粘贴简历全文"); return; }
    doParse(text);
  });

  function doParse(text) {
    var r = JOAI.parseResume(text);
    var merged = Object.assign({}, loadProfile(), r);
    ["raw"].forEach(function (k) { delete merged[k]; });
    if (merged.graduateYear) merged.graduateYear = merged.graduateYear + "届";
    fillProfileForm(merged);
    saveProfile(merged);
    renderLearned(merged); updateCompleteness(merged);
    var filled = ["name", "phone", "email", "school", "degree", "graduateYear", "expectCity", "major", "skills", "experience", "selfEval"]
      .filter(function (k) { return merged[k] && String(merged[k]).trim(); }).length;
    $("#profileStatus").textContent = "本次解析填入 " + filled + " 个字段，请核对修正";
    flashProfilePanel();
    QZ.toast("✅ 解析完成：已填入下方资料库（" + filled + " 个字段），请核对修正");
  }

  $("#loadSampleBtn").addEventListener("click", function () {
    $("#pasteArea").value =
      "个人简历\n" +
      "姓名：林晓航\n手机：13912345678\n邮箱：linxh@stu.hust.edu.cn\n" +
      "教育经历\n华中科技大学 计算机科学与技术 本科 2026届毕业\n" +
      "期望工作城市：杭州\n" +
      "技能：JavaScript, TypeScript, React, Node.js, MySQL, Git, 数据结构\n" +
      "实习经历\n" +
      "- 负责公司官网前端页面开发，使用 React 完成 5 个核心模块\n" +
      "- 参与小程序性能优化，首屏加载时间降低 40%\n" +
      "- 完成内部组件库文档整理，覆盖 30+ 组件\n" +
      "自我评价\n" +
      "学习能力强，对前端工程化有兴趣，能快速融入团队。";
    QZ.toast("示例简历已载入，点击「AI解析」试试");
  });

  /* ---------------- 模拟网申表单 ---------------- */
  var CITIES = ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "南京", "西安", "苏州",
    "天津", "重庆", "长沙", "郑州", "合肥", "厦门", "福州", "济南", "青岛", "大连",
    "宁波", "无锡", "佛山", "东莞", "珠海", "海口", "昆明", "贵阳", "南昌", "太原",
    "石家庄", "哈尔滨", "长春", "沈阳", "兰州", "乌鲁木齐", "南宁", "香港", "澳门", "远程"];
  var citySel = $("#f-city");
  CITIES.forEach(function (c) {
    var o = document.createElement("option"); o.textContent = c; o.value = c; citySel.appendChild(o);
  });

  function setFlash(el, on) { el.classList.toggle("fill-flash", !!on); }

  function typeInto(input, text, done) {
    if (!text) { done(); return; }
    setFlash(input, true);
    var i = 0;
    input.value = "";
    var timer = setInterval(function () {
      i++;
      input.value = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(timer);
        setTimeout(function () { setFlash(input, false); done(); }, 160);
      }
    }, 26);
  }
  function selectInto(sel, value, done) {
    if (!value) { done(); return; }
    setFlash(sel, true);
    setTimeout(function () {
      var found = false;
      Array.prototype.forEach.call(sel.options, function (o) {
        if (!found && o.value !== "" && (o.value === value || o.textContent === value ||
          o.textContent.indexOf(value) > -1 || value.indexOf(o.textContent) > -1)) {
          sel.value = o.value || o.textContent; found = true;
        }
      });
      if (!found && sel.options.length > 1) sel.selectedIndex = 1;
      setTimeout(function () { setFlash(sel, false); done(); }, 200);
    }, 120);
  }

  /* 标签 → 资料库取值（固定字段 → 学习字段 → 推断） */
  function profileValueFor(label, p) {
    if (label === "投递岗位") return p.lastPosition || guessPosition(p);
    if (label === "是否接受调剂") return p.acceptAdjust || "";
    if (FIXED[label]) return p[FIXED[label]] || "";
    return (p.learned || {})[label] || "";
  }
  function fieldValue(el) {
    if (el.classList.contains("radio-group")) {
      var c = el.querySelector("input:checked");
      return c ? c.value : "";
    }
    return (el.value || "").trim();
  }
  function guessPosition(p) {
    var s = (p.skills || "").toLowerCase();
    if (/react|vue|javascript|前端|html|css/.test(s)) return "前端开发工程师";
    if (/java|python|go|mysql|后端|node/.test(s)) return "后端开发工程师";
    if (/sql|数据|bi|分析/.test(s)) return "数据分析";
    if (/产品|原型|需求/.test(s)) return "产品经理";
    if (/营销|运营|市场|新媒体/.test(s)) return "市场营销";
    return "前端开发工程师";
  }

  /* ---------------- AI 一键填写（带缺失标记） ---------------- */
  var filling = false;
  $("#autoFillBtn").addEventListener("click", function () {
    if (filling) return;
    var p = loadProfile();
    if (!p.name && !p.phone && !p.email && !Object.keys(p.learned || {}).length) {
      QZ.toast("资料库还是空的～先去上方「AI解析简历」建立资料库");
      return;
    }
    $$("#mockForm .need-learn").forEach(function (f) { f.classList.remove("need-learn"); });

    var steps = [], missing = [];
    $$("#mockForm [data-ffield]").forEach(function (el) {
      var label = el.getAttribute("data-ffield");
      var val = profileValueFor(label, p);
      if (!val) missing.push(el); else steps.push({ el: el, val: val });
    });

    filling = true;
    QZ.toast("⚔️ AI 开始按资料库填写…");
    var queue = steps.map(function (s) {
      return function (next) { fillElement(s.el, s.val, next); };
    });
    function run(i) {
      if (i >= queue.length) {
        missing.forEach(function (el) { el.closest(".field").classList.add("need-learn"); });
        filling = false;
        if (missing.length) {
          QZ.toast("✅ 已填 " + steps.length + " 项；" + missing.length + " 项资料库缺失（虚线标记），补填后提交即可学习");
        } else {
          QZ.toast("✅ 填写完成！请检查一遍再提交");
        }
        return;
      }
      queue[i](function () { run(i + 1); });
    }
    run(0);
  });

  function fillElement(el, val, done) {
    if (el.classList.contains("radio-group")) {
      setFlash(el, true);
      setTimeout(function () {
        var target = Array.prototype.filter.call(el.querySelectorAll("input[type=radio]"), function (r) { return r.value === val; })[0];
        if (target) target.checked = true;
        else { var first = el.querySelector("input"); if (first) first.checked = true; }
        setTimeout(function () { setFlash(el, false); done(); }, 200);
      }, 120);
      return;
    }
    if (el.tagName === "SELECT") { selectInto(el, val, done); return; }
    typeInto(el, val, done);
  }

  $("#resetFormBtn").addEventListener("click", function () {
    $$("#mockForm input").forEach(function (el) {
      if (el.type === "radio") el.checked = false; else if (el.type !== "checkbox") el.value = "";
    });
    $$("#mockForm select").forEach(function (s) { s.selectedIndex = 0; });
    $$("#mockForm textarea").forEach(function (t) { t.value = ""; });
    $$("#mockForm .need-learn").forEach(function (f) { f.classList.remove("need-learn"); });
    QZ.toast("表单已重置");
  });

  /* ---------------- 提交 + 学习 ---------------- */
  $("#submitFormBtn").addEventListener("click", function () {
    var required = [
      ["#f-name", "姓名"], ["#f-phone", "手机号"], ["#f-email", "邮箱"],
      ["#f-degree", "最高学历"], ["#f-year", "毕业年份"], ["#f-city", "期望工作城市"], ["#f-pos", "投递岗位"]
    ];
    for (var i = 0; i < required.length; i++) {
      if (!$(required[i][0]).value) {
        QZ.toast("「" + required[i][1] + "」还未填写");
        var el = $(required[i][0]);
        setFlash(el, true);
        (function (target) {
          setTimeout(function () { setFlash(target, false); }, 900);
        })(el);
        return;
      }
    }

    var msg = "🎉 网申提交成功（演示）！";
    if ($("#rememberFill").checked) {
      var p = loadProfile();
      var learnedN = 0, updatedN = 0;
      $$("#mockForm [data-ffield]").forEach(function (el) {
        var label = el.getAttribute("data-ffield");
        var val = fieldValue(el);
        if (!val) return;
        if (label === "投递岗位") {
          if (p.lastPosition !== val) { p.lastPosition = val; learnedN++; }
          return;
        }
        if (label === "是否接受调剂") {
          if (p.acceptAdjust !== val) { p.acceptAdjust = val; learnedN++; }
          return;
        }
        if (FIXED[label]) {
          if (p[FIXED[label]] !== val) { p[FIXED[label]] = val; updatedN++; }
          return;
        }
        p.learned = p.learned || {};
        if (p.learned[label] !== val) { p.learned[label] = val; learnedN++; }
      });
      saveProfile(p);
      renderLearned(p); updateCompleteness(p);
      flashProfilePanel();
      $$("#mockForm .need-learn").forEach(function (f) { f.classList.remove("need-learn"); });
      if (learnedN || updatedN) msg = "🎉 提交成功！🧠 AI 已学习 " + learnedN + " 个新字段、更新 " + updatedN + " 个已有字段并写入资料库";
    }
    QZ.toast(msg);
  });
})();
