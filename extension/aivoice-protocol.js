// このファイルは Native Messaging Host に送る再生・停止・状態取得リクエストを構築します。
(function initDocSnoutAiVoiceProtocol(globalScope) {
  const HOST_NAME = "com.docsnout.aivoice";

  function newRequestId() {
    if (globalScope.crypto?.randomUUID) return globalScope.crypto.randomUUID();
    return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function buildPlayRequest({ text, title = "", url = "" }) {
    return {
      id: newRequestId(),
      type: "play",
      text: String(text ?? ""),
      meta: { title: String(title ?? ""), url: String(url ?? "") },
    };
  }

  function buildStopRequest() {
    return { id: newRequestId(), type: "stop" };
  }

  function buildStatusRequest() {
    return { id: newRequestId(), type: "status" };
  }

  const api = {
    HOST_NAME,
    newRequestId,
    buildPlayRequest,
    buildStopRequest,
    buildStatusRequest,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  globalScope.DocSnoutAiVoiceProtocol = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
