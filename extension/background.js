// バックグラウンドで Native Messaging の接続と要求の送受信を管理する。
(function initDocSnoutBackground() {
  const protocol = globalThis.DocSnoutAiVoiceProtocol;
  const HOST_NAME = protocol?.HOST_NAME || "com.docsnout.aivoice";

  /** @type {chrome.runtime.Port | null} */
  let port = null;
  /** @type {Map<string, {resolve: Function, reject: Function, timer: any}>} */
  const pending = new Map();

  function ensurePort() {
    if (port) return port;
    port = chrome.runtime.connectNative(HOST_NAME);

    port.onMessage.addListener((message) => {
      const id = typeof message?.id === "string" ? message.id : "";
      if (!id) return;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      clearTimeout(entry.timer);
      entry.resolve(message);
    });

    port.onDisconnect.addListener(() => {
      const err = chrome.runtime?.lastError;
      const error = new Error(
        err?.message || "Native Messaging Host から切断されました",
      );
      port = null;
      for (const [id, entry] of pending) {
        pending.delete(id);
        clearTimeout(entry.timer);
        entry.reject(error);
      }
    });

    return port;
  }

  function sendNativeRequest(request, { timeoutMs = 15000 } = {}) {
    return new Promise((resolve, reject) => {
      const id = typeof request?.id === "string" ? request.id : "";
      if (!id) {
        reject(new Error("リクエストIDがありません"));
        return;
      }

      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error("Native Messaging Host の応答がタイムアウトしました"));
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer });
      try {
        ensurePort().postMessage(request);
      } catch (e) {
        pending.delete(id);
        clearTimeout(timer);
        reject(new Error(String(e?.message || e)));
      }
    });
  }

  async function handleRequest(payload) {
    try {
      const resp = await sendNativeRequest(payload);
      return resp;
    } catch (e) {
      console.warn("DocSnout: native host error, retrying once", e);
      // 1回だけ再接続してリトライする
      port = null;
      const resp = await sendNativeRequest(payload);
      return resp;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "aivoice.request") return;
    void (async () => {
      try {
        const rawResp = await handleRequest(message.payload);
        const ok = rawResp?.ok === true;
        sendResponse(ok ? rawResp : rawResp || { ok: false });
      } catch (e) {
        sendResponse({
          ok: false,
          error: { code: "EXT_NATIVE_ERROR", message: String(e?.message || e) },
        });
      }
    })();
    return true;
  });
})();
