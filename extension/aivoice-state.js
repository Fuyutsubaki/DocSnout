// Native Messaging の接続状態と再生状態を管理する状態遷移関数を提供する。
(function initDocSnoutAiVoiceState(globalScope) {
  const INITIAL_STATE = Object.freeze({
    phase: "idle", // idle | connecting | ready | playing | error
    lastError: "",
  });

  function reduce(state, event) {
    const s = state || INITIAL_STATE;
    const type = event?.type || "";

    if (type === "CONNECT_START") return { phase: "connecting", lastError: "" };
    if (type === "CONNECT_OK") return { phase: "ready", lastError: "" };
    if (type === "PLAY_START") return { phase: "playing", lastError: "" };
    if (type === "STOP_OK") return { phase: "ready", lastError: "" };
    if (type === "DISCONNECTED") return { phase: "idle", lastError: "" };

    if (type === "ERROR") {
      const message =
        typeof event?.message === "string" && event.message
          ? event.message
          : "不明なエラー";
      return { phase: "error", lastError: message };
    }

    return s;
  }

  const api = { INITIAL_STATE, reduce };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  globalScope.DocSnoutAiVoiceState = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
