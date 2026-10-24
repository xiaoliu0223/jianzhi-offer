/* ============================================================
   剑指OFFER —— 投递进展表：状态管线 + 统计 + CRUD
   ============================================================ */
(function () {
  "use strict";
  QZ.mountShell("history");

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var STORE_KEY = "jo-history";
  var STATUSES = [
    { key: "已投递", cls: "info" },
    { key: "笔试", cls: "run" },
    { key: "面试", cls: "warn" },
    { key: "Offer", cls: "ok" },
    { key: "暂缓", cls: "wait" },
    { key: "挂了", cls: "bad" }
  ];
  var rows = QZ.store.get(STORE_KEY, []);
  function save() { QZ.store.set(STORE_KEY, rows); }
  function statusCls(s) {
    var f = STATUSES.filter(function (x) { return x.key === s; })[0];
    return f ? f.cls : "wait";
  }

  var filterStatus = "";

  /* ---------------- 统计 ---------------- */
  function renderStats() {
    var counts = {};
    STATUSES.forEach(function (s) { counts[s.key] = 0; });
    rows.forEach(function (r) { counts[r.status] = (counts[r.status] || 0) + 1; });
    $("#statCards").innerHTML =
      '<div class="stat-card"><p class="num">' + rows.length + '</p><p class="lab"><i style="background:var(--accent)"></i>总投递</p></div>' +
      STATUSES.map(function (s) {
        return '<div class="stat-card"><p class="num">' + counts[s.key] + '</p><p class="lab"><i style="background:var(--' +
          (s.cls === "info" ? "accent" : s.cls === "run" ? "accent-2" : s.cls === "warn" ? "warn" : s.cls === "ok" ? "ok" : s.cls === "bad" ? "bad" : "text-3") +
          ')"></i>' + s.key + "</p></div>";
      }).join("");
  }

  /* ---------------- 筛选chips ---------------- */
  function renderChips() {
    $("#statusFilter").innerHTML =
      '<button class="chip' + (filterStatus === "" ? " is-on" : "") + '" data-st="">全部</button>' +
      STATUSES.map(function (s) {
        return '<button class="chip' + (filterStatus === s.key ? " is-on" : "") + '" data-st="' + s.key + '">' + s.key + "</button>";
      }).join("");
    $$("#statusFilter .chip").forEach(function (c) {
      c.addEventListener("click", function () {
        filterStatus = c.getAttribute("data-st");
        renderChips(); renderTable();
      });
    });
  }

  /* ---------------- 表格 ---------------- */
  function renderTable() {
    var kw = $("#searchInput").value.trim().toLowerCase();
    var list = rows.filter(function (r) {
      if (filterStatus && r.status !== filterStatus) return false;
      if (kw && (r.company + " " + r.position + " " + (r.channel || "")).toLowerCase().indexOf(kw) === -1) return false;
      return true;
    });
    if (!rows.length) {
      $("#tableArea").innerHTML =
        '<div class="empty-state"><p class="ico">🗂️</p><b>还没有投递记录</b>' +
        "<p>每投一家公司就记一笔，状态走到哪改到哪，秋招结束后这就是你的战役地图</p></div>";
      return;
    }
    if (!list.length) {
      $("#tableArea").innerHTML = '<div class="empty-state"><p class="ico">🔍</p><b>没有符合条件的记录</b><p>换个筛选条件试试</p></div>';
      return;
    }
    $("#tableArea").innerHTML =
      '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      "<th>公司</th><th>岗位</th><th>渠道</th><th>投递日期</th><th>当前状态</th><th>下一步</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      list.map(function (r) {
        var idx = rows.indexOf(r);
        return "<tr>" +
          '<td class="strong">' + QZ.esc(r.company) + "</td>" +
          "<td>" + QZ.esc(r.position || "—") + "</td>" +
          "<td>" + QZ.esc(r.channel || "—") + "</td>" +
          "<td>" + QZ.esc(r.date || "—") + "</td>" +
          '<td><span class="pill-tag ' + statusCls(r.status) + '">' + QZ.esc(r.status) + "</span></td>" +
          "<td>" + QZ.esc(r.next || "—") + "</td>" +
          '<td><div class="row-actions">' +
          '<button data-adv="' + idx + '" title="推进到下一状态">推进 ▸</button>' +
          '<button data-edit="' + idx + '">编辑</button>' +
          '<button class="del" data-del="' + idx + '">删除</button>' +
          "</div></td></tr>";
      }).join("") + "</tbody></table></div>";

    $$("#tableArea [data-adv]").forEach(function (b) {
      b.addEventListener("click", function () {
        var idx = parseInt(b.getAttribute("data-adv"), 10);
        var order = ["已投递", "笔试", "面试", "Offer"];
        var i = order.indexOf(rows[idx].status);
        if (i === -1 || i >= order.length - 1) { QZ.toast("该状态无法继续推进（可手动编辑）"); return; }
        rows[idx].status = order[i + 1];
        save(); renderAll();
        QZ.toast("「" + rows[idx].company + "」推进到 " + rows[idx].status + " 🎉");
      });
    });
    $$("#tableArea [data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openEditor(parseInt(b.getAttribute("data-edit"), 10)); });
    });
    $$("#tableArea [data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var idx = parseInt(b.getAttribute("data-del"), 10);
        if (!confirm("删除「" + (rows[idx].company || "") + "」的投递记录？")) return;
        rows.splice(idx, 1); save(); renderAll();
        QZ.toast("已删除");
      });
    });
  }

  function renderAll() { renderStats(); renderChips(); renderTable(); }

  /* ---------------- 编辑器 ---------------- */
  function openEditor(idx) {
    var r = idx >= 0 ? rows[idx] : { company: "", position: "", channel: "官网", date: new Date().toISOString().slice(0, 10), status: "已投递", next: "" };
    var modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML =
      '<div class="modal-mask"></div><div class="modal-card modal-wide">' +
      '<button class="modal-close" aria-label="关闭">×</button>' +
      '<h3 class="modal-title">' + (idx >= 0 ? "编辑投递记录" : "记一笔投递") + "</h3>" +
      '<div class="form-grid">' +
      '<div class="field"><label>公司 *</label><input id="e-company" value="' + QZ.esc(r.company) + '"></div>' +
      '<div class="field"><label>岗位</label><input id="e-position" value="' + QZ.esc(r.position) + '" placeholder="如：产品培训生"></div>' +
      '<div class="field"><label>投递渠道</label><input id="e-channel" value="' + QZ.esc(r.channel) + '" placeholder="官网 / Boss / 内推…"></div>' +
      '<div class="field"><label>投递日期</label><input id="e-date" type="date" value="' + QZ.esc(r.date) + '"></div>' +
      '<div class="field"><label>当前状态</label><select id="e-status">' +
      STATUSES.map(function (s) { return '<option' + (s.key === r.status ? " selected" : "") + ">" + s.key + "</option>"; }).join("") +
      "</select></div>" +
      '<div class="field"><label>下一步动作</label><input id="e-next" value="' + QZ.esc(r.next || "") + '" placeholder="如：准备笔试 / 等结果"></div>' +
      "</div>" +
      '<div class="modal-actions"><button class="btn btn-primary" data-act="ok">保存</button><button class="btn btn-ghost" data-act="cancel">取消</button></div>' +
      "</div>";
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    function close() { modal.remove(); document.body.style.overflow = ""; }
    modal.querySelector(".modal-close").addEventListener("click", close);
    modal.querySelector("[data-act=cancel]").addEventListener("click", close);
    modal.querySelector(".modal-mask").addEventListener("click", close);
    modal.querySelector("[data-act=ok]").addEventListener("click", function () {
      var company = modal.querySelector("#e-company").value.trim();
      if (!company) { QZ.toast("公司名必填"); return; }
      var rec = {
        company: company,
        position: modal.querySelector("#e-position").value.trim(),
        channel: modal.querySelector("#e-channel").value.trim(),
        date: modal.querySelector("#e-date").value,
        status: modal.querySelector("#e-status").value,
        next: modal.querySelector("#e-next").value.trim()
      };
      if (idx >= 0) rows[idx] = rec; else rows.unshift(rec);
      save(); renderAll(); close();
      QZ.toast(idx >= 0 ? "已保存" : "已记录，祝你拿Offer ⚔️");
    });
    setTimeout(function () { modal.querySelector("#e-company").focus(); }, 60);
  }

  $("#addBtn").addEventListener("click", function () { openEditor(-1); });
  $("#searchInput").addEventListener("input", renderTable);

  $("#exportBtn").addEventListener("click", function () {
    if (!rows.length) { QZ.toast("没有可导出的记录"); return; }
    var head = "公司,岗位,渠道,投递日期,状态,下一步";
    var csv = [head].concat(rows.map(function (r) {
      return [r.company, r.position, r.channel, r.date, r.status, r.next]
        .map(function (v) { return '"' + String(v || "").replace(/"/g, '""') + '"'; }).join(",");
    })).join("\n");
    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "投递进展表.csv";
    a.click();
    QZ.toast("CSV已导出");
  });

  renderAll();
})();
