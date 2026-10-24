/* 剑指OFFER 插件 —— 桥接脚本：驻留在演示站页面，实现资料库自动双向同步 */
(function () {
  "use strict";
  if (window.__JO_BRIDGE__) return;
  window.__JO_BRIDGE__ = true;

  function reply(type, payload, requestId) {
    try {
      window.postMessage(Object.assign({ __JO_BRIDGE__: true, type: type, requestId: requestId }, payload), window.location.origin);
    } catch (e) {}
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== window.location.origin) return;
    var d = e.data;
    if (!d || !d.__JO_PAGE__) return;

    if (d.type === "JO_PUSH_PROFILE") {
      try {
        chrome.storage.local.set({ "jo-profile": d.profile || {} }, function () {
          var err = chrome.runtime.lastError;
          reply("JO_PROFILE_SAVED", { ok: !err, error: err && err.message }, d.requestId);
        });
      } catch (err) {
        // 扩展刚重载导致上下文失效
        reply("JO_PROFILE_SAVED", { ok: false, error: String(err && err.message || err) }, d.requestId);
      }
      return;
    }

    if (d.type === "JO_PULL_PROFILE") {
      try {
        chrome.storage.local.get(["jo-profile"], function (r) {
          var err = chrome.runtime.lastError;
          reply("JO_PROFILE_DATA", { profile: err ? null : (r["jo-profile"] || null) }, d.requestId);
        });
      } catch (err) {
        reply("JO_PROFILE_DATA", { profile: null }, d.requestId);
      }
      return;
    }
  });

  // 向页面广播：桥已就绪
  reply("JO_BRIDGE_READY", {});
})();
