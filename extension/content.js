/* 剑指OFFER 插件 —— 内容脚本：扫描当前网申页表单，按资料库填写，记录可学习项 */
(function () {
  "use strict";
  if (window.__JO_CONTENT) return;
  window.__JO_CONTENT = true;

  var FILLABLE = ["text", "tel", "email", "number", "search", "url"];

  function visible(el) {
    if (!el.getClientRects().length) return false;
    var st = window.getComputedStyle(el);
    return st.visibility !== "hidden" && st.display !== "none" && st.opacity !== "0";
  }

  function labelFor(el) {
    var lbl = "";
    try {
      if (el.id) {
        var l = document.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id) + '"]');
        if (l) lbl = l.textContent || "";
      }
      if (!lbl) {
        var wrap = el.closest("label");
        if (wrap) lbl = wrap.textContent || "";
      }
      if (!lbl) {
        // 容器内若有 <label>，只取 label 文本（避免把下拉选项文字混进标签）
        var box = el.closest(".field,.form-group,.form-item,.el-form-item,.ant-form-item,.ivu-form-item,.row,.form-row,li,td");
        if (box) {
          var lblEl = box.querySelector("label");
          if (lblEl) lbl = lblEl.textContent || "";
          else lbl = (box.textContent || "").slice(0, 60);
        }
      }
      if (!lbl) lbl = el.getAttribute("aria-label") || "";
      if (!lbl) lbl = el.getAttribute("placeholder") || "";
      if (!lbl) lbl = el.getAttribute("title") || "";
      if (!lbl && el.name) lbl = el.name;
    } catch (e) { lbl = el.name || ""; }
    return String(lbl).replace(/[*＊✕×✖]/g, " ").replace(/\s+/g, " ").trim();
  }

  /* React/Vue 安全赋值：原生 setter + input/change 事件 */
  function setValue(el, val) {
    var proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, val); else el.value = val;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function flash(el) {
    try {
      var old = el.style.outline;
      el.style.outline = "2px solid #7c6cf0";
      el.style.transition = "outline-color .4s";
      setTimeout(function () { el.style.outline = old; }, 1600);
    } catch (e) {}
  }

  function collectControls() {
    var controls = [];
    var radioGroups = {};
    Array.prototype.forEach.call(document.querySelectorAll("input, select, textarea"), function (el) {
      if (!visible(el)) return;
      if (el.disabled || el.readOnly) return;
      if (el.tagName === "INPUT") {
        var t = (el.type || "text").toLowerCase();
        if (t === "checkbox" || t === "radio") {
          // 单选组：按 name 归组，取组内第一个可见项
          if (t === "radio" && el.name && !radioGroups[el.name]) {
            radioGroups[el.name] = true;
            controls.push({ kind: "radio-group", el: el });
          }
          return;
        }
        if (t === "hidden" || t === "password" || t === "file" || t === "submit" || t === "button" || t === "image" || t === "reset") return;
        if (FILLABLE.indexOf(t) === -1) return;
        controls.push({ kind: "input", el: el });
        return;
      }
      if (el.tagName === "SELECT" || el.tagName === "TEXTAREA") {
        controls.push({ kind: el.tagName === "SELECT" ? "select" : "textarea", el: el });
      }
    });
    return controls;
  }

  function optionTextsOf(sel) {
    return Array.prototype.map.call(sel.options, function (o) { return o.textContent.trim(); })
      .filter(function (t) { return t && !/请选择|请选择|select|--/i.test(t) || /本科|硕士/.test(t); });
  }

  function fillRadioGroup(firstRadio, desired) {
    var name = firstRadio.name;
    var radios = Array.prototype.filter.call(document.querySelectorAll('input[type="radio"][name="' + name.replace(/"/g, '\\"') + '"]'), visible);
    var texts = radios.map(function (r) { return labelFor(r) || r.value; });
    var pick = window.JO_MATCH.radioMatch(texts, desired);
    if (!pick) return false;
    var idx = texts.indexOf(pick);
    if (idx < 0) return false;
    var target = radios[idx];
    target.checked = true;
    target.dispatchEvent(new Event("change", { bubbles: true }));
    flash(target);
    return true;
  }

  function fillPage(profile) {
    var filled = 0, attempted = 0;
    var missing = [];
    var seen = [];
    window.__JO_TRACK = [];

    var controls = collectControls();
    controls.forEach(function (c) {
      var el = c.el;
      var label = labelFor(el);
      if (!label) return;
      // 同名标签只填第一个——但按所属表单区域分区（页面上可能有多个表单）
      var scope = el.closest("form,section") || document.body;
      var scopeKey = scope.id || (scope.className ? String(scope.className).slice(0, 30) : "body");
      var seenKey = scopeKey + "::" + label;
      if (seen.indexOf(seenKey) > -1) return;
      var desired = window.JO_MATCH.profileValueFor(label, profile);

      // 单选组：问题文本在容器上，用「学习库的键出现在容器文本中」来匹配
      if (c.kind === "radio-group" && !desired) {
        var box = el.closest(".field,.form-group,.form-item,.el-form-item,.ant-form-item,td,li") || document.body;
        var boxText = window.JO_MATCH.norm(box.textContent || "").slice(0, 120);
        var learned = profile.learned || {};
        Object.keys(learned).some(function (k) {
          var nk = window.JO_MATCH.norm(k);
          if (nk && boxText.indexOf(nk) > -1) { desired = learned[k]; return true; }
          return false;
        });
      }
      attempted++;

      var ok = false;
      if (c.kind === "radio-group") {
        ok = desired ? fillRadioGroup(el, desired) : false;
      } else if (c.kind === "select") {
        var texts = optionTextsOf(el);
        var pick = window.JO_MATCH.pickOptionText(texts, desired);
        if (desired && pick) {
          Array.prototype.forEach.call(el.options, function (o) {
            if (!ok && o.textContent.trim() === pick) { el.value = o.value || o.textContent; ok = true; }
          });
          if (ok) {
            el.dispatchEvent(new Event("change", { bubbles: true }));
            flash(el);
          }
        }
      } else {
        if (!desired) { /* skip */ }
        else {
          var val = desired;
          if (c.kind === "textarea" && val.length > 300) val = val.slice(0, 298) + "…";
          setValue(el, val);
          flash(el);
          ok = true;
        }
      }

      if (ok) {
        filled++;
        if (seen.indexOf(seenKey) === -1) seen.push(seenKey);
        window.__JO_TRACK.push({
          label: label,
          orig: c.kind === "radio-group" ? desired : (el.value || ""),
          el: el,
          kind: c.kind
        });
      } else if (desired === "" && missing.length < 8 && missing.indexOf(label) === -1 && seen.indexOf(seenKey) === -1) {
        missing.push(label);
      }
    });

    // 去重统计
    var uniqFilled = {};
    window.__JO_TRACK.forEach(function (t) { uniqFilled[t.label] = 1; });
    var uniqMissing = [];
    missing.forEach(function (m) { if (uniqMissing.indexOf(m) === -1 && !uniqFilled[m]) uniqMissing.push(m); });

    return { filled: Object.keys(uniqFilled).length, missing: uniqMissing, attempted: attempted };
  }

  /* 学习：对比填写时的值与当前值，把用户的修正回传 */
  function learnPage() {
    var pairs = {};
    (window.__JO_TRACK || []).forEach(function (t) {
      var cur;
      if (t.kind === "radio-group") {
        var checked = t.el.closest("form") || document;
        var radios = Array.prototype.filter.call(
          document.querySelectorAll('input[type="radio"][name="' + (t.el.name || "").replace(/"/g, '\\"') + '"]'),
          function (r) { return r.checked; });
        cur = radios.length ? (labelFor(radios[0]) || radios[0].value) : "";
      } else {
        cur = t.el.value || "";
      }
      cur = String(cur).trim();
      if (cur && cur !== String(t.orig).trim()) pairs[t.label] = cur;
    });
    return { pairs: pairs };
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    try {
      if (msg.type === "JO_FILL") {
        sendResponse(fillPage(msg.profile || {}));
      } else if (msg.type === "JO_LEARN") {
        sendResponse(learnPage());
      }
    } catch (e) {
      sendResponse({ error: String(e && e.message || e) });
    }
    return false;
  });
})();
