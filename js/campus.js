/* ============================================================
   剑指OFFER —— 网申汇总表（校招/实习双表，localStorage持久化）
   ============================================================ */
(function () {
  "use strict";
  QZ.mountShell("campus");

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var params = new URLSearchParams(location.search);
  var tableType = params.get("table") === "intern" ? "intern" : "campus";
  var STORE_KEY = "jo-table-" + tableType;

  // 页头同步
  var isIntern = tableType === "intern";
  $("#pageTitle").textContent = isIntern ? "实习网申汇总表" : "校招网申汇总表";
  document.title = (isIntern ? "实习网申汇总表" : "校招网申汇总表") + " - 剑指OFFER";
  $("#tabCampus").classList.toggle("is-on", !isIntern);
  $("#tabIntern").classList.toggle("is-on", isIntern);

  var rows = QZ.store.get(STORE_KEY, []);
  function save() { QZ.store.set(STORE_KEY, rows); }

  /* ---------------- 渲染 ---------------- */
  function render() {
    var kw = $("#searchInput").value.trim().toLowerCase();
    var industry = $("#industrySel").value;
    var sort = $("#sortSel").value;

    var list = rows.filter(function (r) {
      if (industry && r.industry !== industry) return false;
      if (kw && (r.company + " " + r.position + " " + r.note).toLowerCase().indexOf(kw) === -1) return false;
      return true;
    });
    if (sort === "company") list.sort(function (a, b) { return (a.company || "").localeCompare(b.company || "", "zh"); });
    else if (sort === "deadline") list.sort(function (a, b) { return (a.deadline || "9999").localeCompare(b.deadline || "9999"); });

    // 行业下拉选项
    var inds = {};
    rows.forEach(function (r) { if (r.industry) inds[r.industry] = 1; });
    var cur = industry;
    $("#industrySel").innerHTML = '<option value="">全部行业</option>' +
      Object.keys(inds).sort().map(function (i) {
        return '<option' + (i === cur ? " selected" : "") + ">" + QZ.esc(i) + "</option>";
      }).join("");

    if (!rows.length) {
      $("#tableArea").innerHTML =
        '<div class="empty-state"><p class="ico">📊</p><b>表格还是空的</b>' +
        "<p>点「＋ 添加记录」逐条录入，或「📥 导入CSV」批量导入，也可以先「✨ 载入示例数据」看看结构</p></div>";
      $("#countInfo").textContent = "";
      return;
    }
    if (!list.length) {
      $("#tableArea").innerHTML = '<div class="empty-state"><p class="ico">🔍</p><b>没有符合条件的记录</b><p>换个关键词或清空筛选</p></div>';
      $("#countInfo").textContent = "";
      return;
    }

    var html = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      "<th>公司</th><th>行业</th><th>岗位/批次</th><th>网申链接</th><th>截止时间</th><th>备注</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      list.map(function (r) {
        var idx = rows.indexOf(r);
        return "<tr>" +
          '<td class="strong">' + QZ.esc(r.company) + "</td>" +
          "<td>" + QZ.esc(r.industry || "—") + "</td>" +
          "<td>" + QZ.esc(r.position || "—") + "</td>" +
          "<td>" + (r.link ? '<a href="' + QZ.esc(r.link) + '" target="_blank" rel="noopener" style="color:var(--accent)">直达 ↗</a>' : "—") + "</td>" +
          "<td>" + QZ.esc(r.deadline || "—") + "</td>" +
          "<td>" + QZ.esc(r.note || "—") + "</td>" +
          '<td><div class="row-actions"><button data-edit="' + idx + '">编辑</button><button class="del" data-del="' + idx + '">删除</button></div></td>' +
          "</tr>";
      }).join("") + "</tbody></table></div>";
    $("#tableArea").innerHTML = html;
    $("#countInfo").textContent = "共 " + rows.length + " 条记录，当前显示 " + list.length + " 条";

    $$("#tableArea [data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openEditor(parseInt(b.getAttribute("data-edit"), 10)); });
    });
    $$("#tableArea [data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var idx = parseInt(b.getAttribute("data-del"), 10);
        if (!confirm("删除「" + (rows[idx].company || "") + "」这条记录？")) return;
        rows.splice(idx, 1); save(); render();
        QZ.toast("已删除");
      });
    });
  }

  /* ---------------- 编辑器弹窗 ---------------- */
  function openEditor(idx) {
    var r = idx >= 0 ? rows[idx] : { company: "", industry: "", position: "", link: "", deadline: "", note: "" };
    var modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML =
      '<div class="modal-mask"></div><div class="modal-card modal-wide">' +
      '<button class="modal-close" aria-label="关闭">×</button>' +
      '<h3 class="modal-title">' + (idx >= 0 ? "编辑记录" : "添加记录") + "</h3>" +
      '<div class="form-grid">' +
      '<div class="field"><label>公司 *</label><input id="e-company" value="' + QZ.esc(r.company) + '"></div>' +
      '<div class="field"><label>行业</label><input id="e-industry" value="' + QZ.esc(r.industry) + '" placeholder="如：互联网 / 国央企 / 银行"></div>' +
      '<div class="field"><label>岗位/批次</label><input id="e-position" value="' + QZ.esc(r.position) + '" placeholder="如：2026秋招 · 前端开发"></div>' +
      '<div class="field"><label>网申链接</label><input id="e-link" value="' + QZ.esc(r.link) + '" placeholder="https://…"></div>' +
      '<div class="field"><label>截止时间</label><input id="e-deadline" value="' + QZ.esc(r.deadline) + '" placeholder="如：10月15日"></div>' +
      '<div class="field"><label>备注</label><input id="e-note" value="' + QZ.esc(r.note) + '"></div>' +
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
        industry: modal.querySelector("#e-industry").value.trim(),
        position: modal.querySelector("#e-position").value.trim(),
        link: modal.querySelector("#e-link").value.trim(),
        deadline: modal.querySelector("#e-deadline").value.trim(),
        note: modal.querySelector("#e-note").value.trim()
      };
      if (idx >= 0) rows[idx] = rec; else rows.push(rec);
      save(); render(); close();
      QZ.toast(idx >= 0 ? "已保存修改" : "已添加记录");
    });
    setTimeout(function () { modal.querySelector("#e-company").focus(); }, 60);
  }

  $("#addBtn").addEventListener("click", function () { openEditor(-1); });
  $("#searchInput").addEventListener("input", render);
  $("#industrySel").addEventListener("change", render);
  $("#sortSel").addEventListener("change", render);

  /* ---------------- CSV 导入导出 ---------------- */
  $("#exportBtn").addEventListener("click", function () {
    if (!rows.length) { QZ.toast("表格为空，没有可导出的数据"); return; }
    var head = "公司,行业,岗位/批次,网申链接,截止时间,备注";
    var csv = [head].concat(rows.map(function (r) {
      return [r.company, r.industry, r.position, r.link, r.deadline, r.note]
        .map(function (v) { return '"' + String(v || "").replace(/"/g, '""') + '"'; }).join(",");
    })).join("\n");
    downloadFile(csv, (isIntern ? "intern" : "campus") + "-table.csv", "text/csv");
    QZ.toast("CSV已导出");
  });

  $("#importBtn").addEventListener("click", function () {
    var text = prompt("粘贴CSV内容（首行表头：公司,行业,岗位/批次,网申链接,截止时间,备注）\n或输入文件路径请直接用下面的文件选择：\n（点确定后选择文件也可）");
    if (text && text.trim() && text.indexOf(",") > -1) { importCSV(text); return; }
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".csv,text/csv";
    inp.addEventListener("change", function () {
      var f = inp.files[0]; if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { importCSV(String(reader.result)); };
      reader.readAsText(f, "utf-8");
    });
    inp.click();
  });

  function importCSV(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) { QZ.toast("CSV内容为空或只有表头"); return; }
    var added = 0;
    lines.slice(1).forEach(function (line) {
      var cells = parseCSVLine(line);
      if (!cells[0]) return;
      rows.push({ company: cells[0] || "", industry: cells[1] || "", position: cells[2] || "", link: cells[3] || "", deadline: cells[4] || "", note: cells[5] || "" });
      added++;
    });
    save(); render();
    QZ.toast("✅ 成功导入 " + added + " 条记录");
  }
  function parseCSVLine(line) {
    var out = [], cur = "", inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ",") { out.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out.map(function (s) { return s.trim(); });
  }
  function downloadFile(content, name, type) {
    var blob = new Blob(["\uFEFF" + content], { type: type + ";charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 800);
  }

  /* ---------------- 示例数据 ---------------- */
  $("#sampleBtn").addEventListener("click", function () {
    if (rows.length && !confirm("将追加3条示例数据到表格，继续？")) return;
    var sample = isIntern ? [
      { company: "示例·字节跳动（演示数据）", industry: "互联网", position: "日常实习 · 前端开发", link: "", deadline: "随时投递", note: "示例数据，可删除" },
      { company: "示例·美团（演示数据）", industry: "互联网", position: "到店事业群 · 产品实习", link: "", deadline: "长期", note: "示例数据，可删除" },
      { company: "示例·国家电投（演示数据）", industry: "国央企", position: "暑期实习 · 财务", link: "", deadline: "次年3月", note: "示例数据，可删除" }
    ] : [
      { company: "示例·腾讯（演示数据）", industry: "互联网", position: "2026秋招 · 产品培训生", link: "", deadline: "9月15日", note: "示例数据，可删除" },
      { company: "示例·宁德时代（演示数据）", industry: "新能源", position: "2026秋招 · 研发工程师", link: "", deadline: "9月18日", note: "示例数据，可删除" },
      { company: "示例·中金公司（演示数据）", industry: "金融", position: "2026秋招 · 行业研究", link: "", deadline: "9月20日", note: "示例数据，可删除" }
    ];
    rows = rows.concat(sample);
    save(); render();
    QZ.toast("已载入示例数据（标注了演示字样，可随时删除）");
  });

  render();
})();
