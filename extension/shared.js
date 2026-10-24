/* 剑指OFFER 插件 —— 共享匹配引擎（content.js 与 popup.js 共用） */
(function () {
  "use strict";
  if (window.JO_MATCH) return;

  /* 标签关键词 → 资料库字段（顺序即优先级， Specific 在前） */
  var RULES = [
    { field: "name", keys: ["姓名", "名字", "your name", "name"] },
    { field: "phone", keys: ["手机", "电话", "联系方式", "mobile", "phone", "tel"] },
    { field: "email", keys: ["邮箱", "电子邮箱", "邮件", "email"] },
    { field: "school", keys: ["毕业院校", "院校", "学校", "大学", "学院", "university", "school", "college"] },
    { field: "major", keys: ["专业", "major"] },
    { field: "degree", keys: ["最高学历", "学历", "教育程度", "degree"] },
    { field: "graduateYear", keys: ["毕业时间", "毕业年份", "毕业", "届", "graduat"] },
    { field: "expectCity", keys: ["期望工作城市", "期望城市", "期望地点", "意向城市", "工作城市", "工作地点", "城市", "地点", "city", "location", "base"] },
    { field: "skills", keys: ["技能", "掌握", "skill"] },
    { field: "selfEval", keys: ["自我评价", "自我介绍", "个人评价", "个人简介"] },
    { field: "experience", keys: ["实习经历", "项目经历", "工作经历", "实践经历", "经历", "经验", "experience", "intern"] }
  ];

  function norm(s) {
    return String(s == null ? "" : s).replace(/\s+/g, "").toLowerCase();
  }

  /* 学习字段优先 → 关键词规则 → 未匹配 */
  function profileValueFor(label, profile) {
    var learned = profile.learned || {};
    if (learned[label]) return learned[label];
    var field = ruleField(label);
    if (field) {
      var v = profile[field];
      return v && String(v).trim() ? String(v).trim() : "";
    }
    return "";
  }

  function ruleField(label) {
    var n = norm(label);
    if (!n) return null;
    for (var i = 0; i < RULES.length; i++) {
      for (var j = 0; j < RULES[i].keys.length; j++) {
        if (n.indexOf(RULES[i].keys[j].toLowerCase()) > -1) return RULES[i].field;
      }
    }
    return null;
  }

  /* 单选组同义词：资料库「是/否」 ↔ 页面「接受/不接受」等 */
  var RADIO_SYNONYMS = {
    "是": ["是", "接受", "同意", "愿意", "服从", "可"],
    "否": ["否", "不接受", "不同意", "不愿意", "拒绝", "无"]
  };
  function radioMatch(optionTexts, val) {
    var nv = norm(val);
    var exact = optionTexts.filter(function (t) { return norm(t) === nv; })[0];
    if (exact) return exact;
    var syn = RADIO_SYNONYMS[nv];
    if (syn) {
      for (var i = 0; i < syn.length; i++) {
        for (var j = 0; j < optionTexts.length; j++) {
          if (norm(optionTexts[j]) === syn[i]) return optionTexts[j];
        }
      }
    }
    return null;
  }

  /* 下拉框选值：完全匹配 → 互相包含 → 数字命中（毕业年份 2026届 ↔ 2026） */
  function pickOptionText(optionTexts, val) {
    var nv = norm(val);
    var hit = optionTexts.filter(function (t) { return norm(t) === nv; })[0];
    if (hit) return hit;
    hit = optionTexts.filter(function (t) {
      var nt = norm(t);
      return nt && (nt.indexOf(nv) > -1 || nv.indexOf(nt) > -1);
    })[0];
    if (hit) return hit;
    var m = String(val).match(/\d{4}/);
    if (m) {
      hit = optionTexts.filter(function (t) { return t.indexOf(m[0]) > -1; })[0];
    }
    return hit || null;
  }

  window.JO_MATCH = {
    RULES: RULES,
    norm: norm,
    profileValueFor: profileValueFor,
    ruleField: ruleField,
    radioMatch: radioMatch,
    pickOptionText: pickOptionText
  };
})();
