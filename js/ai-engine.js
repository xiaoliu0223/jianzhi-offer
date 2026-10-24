/* ============================================================
   剑指OFFER —— AI 引擎（本地规则引擎 + 大模型API适配）
   开箱即用：无需任何Key；配置Key后自动切换真实大模型
   ============================================================ */
(function () {
  "use strict";

  /* ================= 技能词库（中英混合，覆盖常见校招领域） ================= */
  var SKILL_DICT = [
    // 开发
    "JavaScript", "TypeScript", "Java", "Python", "Go", "C++", "C#", "PHP", "Ruby", "Rust", "Kotlin", "Swift",
    "HTML", "CSS", "React", "Vue", "Angular", "Node.js", "Spring", "SpringBoot", "Django", "Flask", "Express",
    "微服务", "分布式", "高并发", "多线程", "JVM", "Docker", "Kubernetes", "K8s", "Linux", "Git", "CI/CD",
    "MySQL", "Redis", "MongoDB", "PostgreSQL", "SQL", "Oracle", "Elasticsearch", "Kafka", "RabbitMQ",
    "数据结构", "算法", "计算机网络", "操作系统", "机器学习", "深度学习", "PyTorch", "TensorFlow", "NLP", "CV", "大模型", "AIGC",
    "前端开发", "后端开发", "全栈", "测试", "自动化测试", "性能优化", "爬虫", "数据分析", "数据挖掘", "数据仓库", "Spark", "Hadoop", "Flink", "ETL", "BI",
    // 产品 / 运营 / 市场
    "产品经理", "需求分析", "用户研究", "竞品分析", "原型设计", "Axure", "PRD", "用户增长", "活动运营", "内容运营",
    "社群运营", "新媒体运营", "短视频运营", "SEO", "SEM", "私域", "直播运营", "品牌营销", "市场营销", "市场调研", "整合营销",
    "商业化", "渠道拓展", "商务拓展", "BD", "客户成功", "客户运营",
    // 职能
    "人力资源", "招聘", "薪酬绩效", "组织发展", "财务", "会计", "审计", "税务", "预算管理", "资金管理", "法务", "合规",
    "行政", "文秘", "采购", "供应链", "物流管理", "质量管理", "项目管理", "PMP", "敏捷开发", "Scrum",
    // 设计
    "UI设计", "UX", "交互设计", "视觉设计", "平面设计", "Figma", "Sketch", "Photoshop", "PS", "Illustrator", "AfterEffects", "C4D", "Blender",
    // 金融 / 工程 / 其他
    "财务建模", "估值", "投行", "行研", "量化", "风控", "精算", "CPA", "CFA", "FRM", "证券从业", "基金从业",
    "电气工程", "机械设计", "CAD", "SolidWorks", "嵌入式", "单片机", "PLC", "自动化", "硬件开发", "PCB", "FPGA", "Verilog",
    "土木工程", "建筑学", "工程造价", "BIM", "临床医学", "护理学", "药学", "教育学", "心理学", "新闻传播", "汉语言文学", "英语", "雅思", "托福", "CET-6", "CET-4",
    "Office", "Excel", "PPT", "Word", "VBA", "Python办公自动化"
  ];

  /* ================= 工具函数 ================= */
  function esc(s) { return window.QZ ? QZ.esc(s) : String(s); }

  function countOccurrences(text, word) {
    if (!word) return 0;
    var re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    var m = text.match(re);
    return m ? m.length : 0;
  }

  function extractKeywords(text, topN) {
    topN = topN || 15;
    text = text || "";
    var lower = text.toLowerCase();
    var hits = [];
    // 英文/数字词
    var enWords = lower.match(/[a-z][a-z0-9+#.\-]{1,19}/g) || [];
    var enFreq = {};
    var stop = { and: 1, the: 1, for: 1, with: 1, you: 1, our: 1, will: 1, are: 1, have: 1, job: 1, work: 1, team: 1, this: 1, that: 1, from: 1, your: 1, not: 1, all: 1, can: 1, who: 1, was: 1, but: 1, out: 1, get: 1, has: 1, his: 1, her: 1, one: 1, new: 1, now: 1, see: 1, two: 1, more: 1, may: 1, way: 1, its: 1, any: 1, day: 1, use: 1, man: 1, end: 1, them: 1, these: 1, than: 1, then: 1, well: 1, also: 1, into: 1, year: 1, years: 1, experience: 1, ability: 1, skills: 1, skill: 1, requirements: 1, responsibilities: 1, preferred: 1, plus: 1, strong: 1, good: 1, related: 1, other: 1, etc: 1, candidate: 1, candidates: 1, position: 1, company: 1, benefits: 1, opportunity: 1, about: 1, what: 1, when: 1, each: 1, per: 1, via: 1, upon: 1, while: 1, must: 1, should: 1, would: 1, able: 1, including: 1, across: 1, within: 1, using: 1, used: 1, working: 1, help: 1, support: 1, ensure: 1, provide: 1, based: 1, well: 1, best: 1, role: 1, time: 1, full: 1, part: 1 };
    enWords.forEach(function (w) {
      if (w.length < 2 || stop[w]) return;
      enFreq[w] = (enFreq[w] || 0) + 1;
    });
    Object.keys(enFreq).forEach(function (w) { hits.push({ word: w, freq: enFreq[w] }); });
    // 词库匹配（中文为主）
    SKILL_DICT.forEach(function (w) {
      var c = countOccurrences(text, w);
      if (c > 0) hits.push({ word: w, freq: c + 2 });   // 词库词加权
    });
    // 中文常见能力词
    var zhSoft = ["沟通能力", "学习能力", "抗压", "团队协作", "执行力", "逻辑思维", "责任心", "细心", "创新", "领导力", "英语能力", "数据分析能力", "办公软件", "写作能力", "组织协调"];
    zhSoft.forEach(function (w) {
      var c = countOccurrences(text, w);
      if (c > 0) hits.push({ word: w, freq: c + 1 });
    });
    // 去重合并（同词不同来源）
    var merged = {};
    hits.forEach(function (h) {
      var k = h.word.toLowerCase();
      if (!merged[k]) merged[k] = { word: h.word, freq: 0 };
      merged[k].freq += h.freq;
    });
    var list = Object.keys(merged).map(function (k) { return merged[k]; });
    list.sort(function (a, b) { return b.freq - a.freq; });
    return list.slice(0, topN);
  }

  /* ================= 简历解析（上传/粘贴 → 结构化资料） ================= */
  function parseResume(text) {
    var out = { name: "", phone: "", email: "", school: "", degree: "", graduateYear: "", expectCity: "", skills: "", selfEval: "", experience: "", raw: text };
    if (!text) return out;
    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);

    var mPhone = text.match(/(?:\+?86[-\s]?)?(1[3-9]\d{9})/);
    if (mPhone) out.phone = mPhone[1];
    var mEmail = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (mEmail) out.email = mEmail[0];

    var mName = text.match(/姓\s*名[：:]\s*([\u4e00-\u9fa5]{1,4}(?:[A-Za-z][A-Za-z\s]{0,20})?|[A-Za-z][A-Za-z\s]{1,20})/);
    if (mName) out.name = mName[1].trim();
    if (!out.name) {
      var mNameEn = text.match(/\bName[：:]\s*([A-Z][A-Za-z]*(?:\s[A-Z][A-Za-z]*){0,3})/);
      if (mNameEn) out.name = mNameEn[1].trim();
    }
    if (!out.name) {
      for (var i = 0; i < Math.min(3, lines.length); i++) {
        var l = lines[i];
        if (/^[\u4e00-\u9fa5]{2,4}$/.test(l) && !/简历|求职|个人/.test(l)) { out.name = l; break; }
        var mEn = l.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)$/);
        if (mEn) { out.name = mEn[1]; break; }
      }
    }

    var mDegree = text.match(/(博士|硕士|研究生|本科|大专|专科|学士|Ph\.?D|Master|Bachelor)/i);
    if (mDegree) {
      var d = mDegree[1];
      out.degree = d === "研究生" ? "硕士" : d === "学士" ? "本科"
        : /^ph/i.test(d) ? "博士" : /^master/i.test(d) ? "硕士" : /^bachelor/i.test(d) ? "本科" : d;
    }

    var mSchool = text.match(/([\u4e00-\u9fa5]{2,14}(?:大学|学院|学校|研究院))|((?:[A-Z][A-Za-z&,\s]{1,30})?(?:University|Institute|College)\b)/);
    if (mSchool) out.school = (mSchool[1] || mSchool[2] || "").trim();

    var mYear = text.match(/(20\d{2})\s*(?:届|年)\s*(?:毕业)?/) || text.match(/(?:毕业|毕业时间|Graduat\w*)[：:]?\s*(20\d{2})/i);
    if (mYear) out.graduateYear = mYear[1];

    var mCity = text.match(/期望(?:工作)?(?:城市|地点|地区)[：:]\s*([\u4e00-\u9fa5]{2,12})/) || text.match(/Expected (?:City|Location|Work Location)[：:]\s*([A-Za-z\u4e00-\u9fa5\s]{2,20})/i);
    if (mCity) out.expectCity = mCity[1];

    // 技能：词库命中
    var kws = extractKeywords(text, 12).map(function (k) { return k.word; });
    var known = kws.filter(function (w) {
      return SKILL_DICT.indexOf(w) > -1 || /^[a-z][a-z0-9+#.\-]+$/i.test(w) && w.length > 1;
    });
    if (known.length) out.skills = known.slice(0, 8).join(" / ");

    // 自我评价
    var mEval = text.match(/自我评价[：:]?\s*([\s\S]{10,200}?)(?:\n\s*\n|$)/);
    if (mEval) out.selfEval = mEval[1].replace(/\s+/g, " ").trim();

    // 经历：取“实习/项目/工作经历”标题后的前3条要点
    var expLines = [];
    var inExp = false;
    lines.forEach(function (l) {
      if (/^(实习|项目|工作|校园|实践|竞赛)(经历|经验)/.test(l)) { inExp = true; return; }
      if (inExp) {
        if (/^(教育|技能|荣誉|自我评价|获奖)/.test(l) && expLines.length) { inExp = false; return; }
        if (/^[•\-–·▪▶◆\d.、]/.test(l) || l.length > 15) {
          if (expLines.length < 3) expLines.push(l.replace(/^[•\-–·▪▶◆]\s*/, "").replace(/^\d+[.、]\s*/, ""));
        }
      }
    });
    if (expLines.length) out.experience = expLines.join("\n");
    return out;
  }

  /* ================= 简历魔改（3档规则改写） ================= */
  var VERB_UPGRADE = [
    ["负责", "主导"], ["参与", "深度参与"], ["做了", "主导完成"], ["做", "完成"], ["帮助", "助力"],
    ["提高", "提升"], ["完成了", "交付完成"], ["完成", "交付"], ["使用", "基于"], ["用", "基于"],
    ["学习", "掌握并应用"], ["学会", "掌握"], ["制作", "搭建"], ["写了", "撰写"], ["写", "撰写"],
    ["做了个", "独立搭建"], ["搞", "推进"], ["弄", "搭建"], ["加入", "牵头加入"], ["跟着", "协同"],
    ["了解", "熟悉"], ["知道", "掌握"], ["整理", "沉淀"], ["统计", "分析并沉淀"], ["维护", "保障迭代"]
  ];
  var BOOST_OPENERS = ["通过", "围绕", "针对"];

  function upgradeLine(line) {
    var changed = [];
    var out = line;
    VERB_UPGRADE.forEach(function (pair) {
      var re = new RegExp(pair[0], "g");
      if (re.test(out)) {
        out = out.replace(re, pair[1]);
        changed.push(pair[0] + " → " + pair[1]);
      }
    });
    return { line: out, changed: changed };
  }

  function rewriteResume(text, level) {
    // level: 1 轻度润色 | 2 中度STAR | 3 重度拔高
    var lines = (text || "").split(/\r?\n/);
    var results = [];
    var skillsHint = extractKeywords(text, 5).map(function (k) { return k.word; });

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      var isBullet = /^[•\-–·▪▶◆]/.test(raw.trim()) || /^\d+[.、]/.test(line) || line.length > 12;
      var isHeader = /(简历|个人信息|基本信息|^姓名[:：]|教育背景|教育经历|技能|证书|获奖|荣誉|自我评价|工作经历|实习经历|项目经历|校园经历)$/.test(line) && line.length <= 14;

      if (isHeader && line.length <= 14) { results.push({ type: "header", text: line }); return; }
      if (!isBullet) { results.push({ type: "plain", text: line, changed: [] }); return; }

      var clean = line.replace(/^[•\-–·▪▶◆]\s*/, "").replace(/^\d+[.、]\s*/, "");
      var up = upgradeLine(clean);
      var out = up.line;
      var changed = up.changed.slice();
      var notes = [];

      if (level >= 2) {
        // STAR 化：若缺少“结果”，提示量化；若同时含多个动作，拆分为“行动→结果”结构
        if (!/(\d+%|[\d一二三四五六七八九十百千]+[万多倍]|提升|增长|下降|节省|覆盖|转化)/.test(out)) {
          notes.push("建议量化：补充可衡量的结果（如 提升X%、覆盖X人、节省X小时）");
        }
        if (!/^(通过|围绕|针对|依托)/.test(out) && out.length > 16) {
          out = BOOST_OPENERS[0] + out;
          changed.push("STAR化：增加行动框架开头");
        }
        if (!/[,，。；;]/.test(out) && out.length > 14) {
          out += "，形成可复用方法论";
          changed.push("补充收束");
        }
      }
      if (level >= 3) {
        out = out
          .replace(/^深度参与/, "作为核心成员")
          .replace(/^主导/, "0→1 主导")
          .replace(/^参与/, "作为骨干参与");
        if (!/沉淀|方法论|体系|闭环|影响力/.test(out)) {
          out += "，沉淀标准化流程并形成业务闭环";
          changed.push("重度拔高：体系化收尾");
        }
        notes.push("重度改写幅度较大，务必人工复核真实性");
      }
      results.push({ type: "bullet", text: out, changed: changed, notes: notes, origin: clean });
    });

    if (level >= 3 && skillsHint.length) {
      results.push({ type: "extra", text: "【亮点总结】具备 " + skillsHint.join("、") + " 等核心能力，能快速上手业务并交付结果。", notes: ["由AI根据简历关键词生成，请确认后使用"] });
    }
    return results;
  }

  /* ================= 过机筛（JD ↔ 简历 匹配） ================= */
  function matchJD(jd, resumeText) {
    var jdKws = extractKeywords(jd, 18);
    var lowerResume = (resumeText || "").toLowerCase();
    var matched = [], missing = [];
    jdKws.forEach(function (k) {
      if (countOccurrences(lowerResume, k.word.toLowerCase()) > 0) matched.push(k.word);
      else missing.push({ word: k.word, freq: k.freq });
    });
    var total = jdKws.length || 1;
    var score = Math.round((matched.length / total) * 100);
    return { score: score, matched: matched, missing: missing, jdKeywords: jdKws.map(function (k) { return k.word; }) };
  }

  /* ================= 大模型 API 适配（OpenAI 兼容） ================= */
  function hasAPI() {
    var s = window.QZ.getSettings();
    return !!(s.aiKey && s.aiBase);
  }

  function chat(system, user, maxTokens) {
    var s = window.QZ.getSettings();
    if (!hasAPI()) return Promise.reject(new Error("NO_API"));
    return fetch(s.aiBase.replace(/\/+$/, "") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.aiKey },
      body: JSON.stringify({
        model: s.aiModel || "gpt-4o-mini",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.7,
        max_tokens: maxTokens || 1200
      })
    }).then(function (r) {
      if (!r.ok) throw new Error("API " + r.status);
      return r.json();
    }).then(function (data) {
      return data.choices[0].message.content;
    });
  }

  /* 带回退的改写：API优先，失败回退规则引擎 */
  function rewriteSmart(text, level) {
    var lvlName = level === 1 ? "轻度润色" : level === 2 ? "中度STAR改写" : "重度拔高";
    if (hasAPI()) {
      var sys = "你是资深HR与简历顾问。请对用户的简历做" + lvlName + "。保持真实，不编造数据；每行一条，不要添加解释；中文输出。";
      return chat(sys, text).then(function (out) {
        return { engine: "api", text: out };
      }).catch(function () {
        return Promise.resolve({ engine: "rule", results: rewriteResume(text, level) });
      });
    }
    return Promise.resolve({ engine: "rule", results: rewriteResume(text, level) });
  }

  /* ================= 文件解析：Word(.docx) / PDF ================= */
  /* .docx 本质是 ZIP：解出 word/document.xml，抽取 w:p/w:t 文本。零依赖，离线可用 */
  function extractDocxText(buf) {
    var bytes = new Uint8Array(buf);
    // 定位 ZIP 结束目录记录（EOCD）
    var eocd = -1;
    for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) { eocd = i; break; }
    }
    if (eocd < 0) return Promise.reject(new Error("不是有效的 .docx 文件"));
    var count = bytes[eocd + 10] | (bytes[eocd + 11] << 8);
    var cdOff = (bytes[eocd + 16]) | (bytes[eocd + 17] << 8) | (bytes[eocd + 18] << 16) | (bytes[eocd + 19] << 24);
    var pos = cdOff, target = null;
    for (var n = 0; n < count && pos + 46 <= bytes.length; n++) {
      if (!(bytes[pos] === 0x50 && bytes[pos + 1] === 0x4b && bytes[pos + 2] === 0x01 && bytes[pos + 3] === 0x02)) break;
      var method = bytes[pos + 10] | (bytes[pos + 11] << 8);
      var csize = (bytes[pos + 20]) | (bytes[pos + 21] << 8) | (bytes[pos + 22] << 16) | (bytes[pos + 23] << 24);
      var nameLen = bytes[pos + 28] | (bytes[pos + 29] << 8);
      var extraLen = bytes[pos + 30] | (bytes[pos + 31] << 8);
      var cmtLen = bytes[pos + 32] | (bytes[pos + 33] << 8);
      var lho = (bytes[pos + 42]) | (bytes[pos + 43] << 8) | (bytes[pos + 44] << 16) | (bytes[pos + 45] << 24);
      var name = "";
      for (var k = 0; k < nameLen; k++) name += String.fromCharCode(bytes[pos + 46 + k]);
      if (name === "word/document.xml") { target = { method: method, csize: csize, lho: lho }; break; }
      pos += 46 + nameLen + extraLen + cmtLen;
    }
    if (!target) return Promise.reject(new Error("docx 中未找到 document.xml"));
    // 跳过本地文件头取数据
    var p = target.lho;
    var lnLen = bytes[p + 26] | (bytes[p + 27] << 8);
    var leLen = bytes[p + 28] | (bytes[p + 29] << 8);
    var cdata = bytes.subarray(p + 30 + lnLen + leLen, p + 30 + lnLen + leLen + target.csize);
    var toXml;
    if (target.method === 0) {
      toXml = Promise.resolve(new TextDecoder("utf-8").decode(cdata));
    } else {
      toXml = new Response(new Blob([cdata]).stream().pipeThrough(new DecompressionStream("deflate-raw")))
        .arrayBuffer()
        .then(function (ab) { return new TextDecoder("utf-8").decode(ab); });
    }
    return toXml.then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, "application/xml");
      var paras = doc.getElementsByTagName("w:p");
      var out = [];
      for (var i = 0; i < paras.length; i++) {
        var ts = paras[i].getElementsByTagName("w:t");
        var line = "";
        for (var j = 0; j < ts.length; j++) line += ts[j].textContent;
        if (line.trim()) out.push(line.trim());
      }
      if (!out.length) throw new Error("docx 中未提取到文本");
      return out.join("\n");
    });
  }

  /* PDF：动态加载 Mozilla pdf.js（CDN），提取文本层 */
  var PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
  var PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = PDFJS_URL;
      s.onload = function () {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
          resolve();
        } catch (e) { reject(e); }
      };
      s.onerror = function () { reject(new Error("PDF 引擎加载失败（需联网访问CDN），可改用粘贴文本")); };
      document.head.appendChild(s);
    });
  }

  function extractPdfText(buf) {
    return loadPdfJs().then(function () {
      return window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    }).then(function (pdf) {
      var pages = [];
      var seq = Promise.resolve();
      var _loop = function (num) {
        seq = seq.then(function () {
          return pdf.getPage(num).then(function (page) {
            return page.getTextContent().then(function (tc) {
              var line = "", lastY = null, out = [];
              tc.items.forEach(function (it) {
                if (typeof it.str !== "string") return;
                var y = it.transform ? Math.round(it.transform[5]) : null;
                if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) { out.push(line); line = ""; }
                line += it.str;
                if (it.hasEOL) { out.push(line); line = ""; }
                lastY = y;
              });
              if (line) out.push(line);
              pages.push(out.join("\n"));
            });
          });
        });
      };
      for (var p = 1; p <= pdf.numPages; p++) _loop(p);
      return seq.then(function () {
        var text = pages.join("\n").replace(/\n{3,}/g, "\n\n").trim();
        if (!text) throw new Error("PDF 中未提取到文本（可能是扫描件，请粘贴文本）");
        return text;
      });
    });
  }

  /* 导出 */
  window.JOAI = {
    SKILL_DICT: SKILL_DICT,
    extractKeywords: extractKeywords,
    parseResume: parseResume,
    rewriteResume: rewriteResume,
    matchJD: matchJD,
    chat: chat,
    hasAPI: hasAPI,
    rewriteSmart: rewriteSmart,
    extractDocxText: extractDocxText,
    extractPdfText: extractPdfText
  };
})();
