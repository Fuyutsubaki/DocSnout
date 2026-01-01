(function initDocSnoutBackground(globalScope) {
  const NATIVE_HOST_NAME = "com.docsnout.aivoice";
  const REQUEST_TIMEOUT_MS = 15000;

  /** @type {{ connected: boolean, playback: string, lastError: string }} */
  const state = {
    connected: false,
    playback: "idle",
    lastError: "",
  };

  /** @type {chrome.runtime.Port | null} */
  let nativePort = null;
  let nextRequestId = 1;
  /** @type {Map<number, { resolve: Function, reject: Function, timer: number }>} */
  const pendingRequests = new Map();

  function broadcastState() {
    try {
      chrome.runtime.sendMessage({ type: "aivoice/state", state: { ...state } });
    } catch {
      // 受信側がいない場合などは無視する
    }
  }

  function setState(patch) {
    Object.assign(state, patch);
    broadcastState();
  }

  function failAllPending(error) {
    for (const { reject, timer } of pendingRequests.values()) {
      clearTimeout(timer);
      try {
        reject(error);
      } catch {
        // noop
      }
    }
    pendingRequests.clear();
  }

  function onNativeMessage(message) {
    const requestId =
      message && typeof message.requestId === "number" ? message.requestId : null;
    if (requestId != null && pendingRequests.has(requestId)) {
      const pending = pendingRequests.get(requestId);
      pendingRequests.delete(requestId);
      clearTimeout(pending.timer);
      pending.resolve(message);
      return;
    }

    if (message && typeof message === "object") {
      if (typeof message.state === "string") {
        setState({ playback: message.state, lastError: "" });
      }
      if (typeof message.error === "string" && message.error) {
        setState({ playback: "error", lastError: message.error });
      }
    }
  }

  function onNativeDisconnect() {
    const err = chrome.runtime?.lastError;
    nativePort = null;
    setState({
      connected: false,
      playback: state.playback === "playing" ? "unknown" : state.playback,
      lastError: err?.message || state.lastError,
    });
    failAllPending(
      new Error(err?.message || "Native Messaging の接続が切断されました"),
    );
  }

  function ensureNativePort() {
    if (nativePort) return nativePort;

    try {
      nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    } catch (e) {
      setState({
        connected: false,
        playback: "error",
        lastError: String(e?.message || e),
      });
      throw e;
    }

    nativePort.onMessage.addListener(onNativeMessage);
    nativePort.onDisconnect.addListener(onNativeDisconnect);
    setState({ connected: true, lastError: "" });
    return nativePort;
  }

  function sendNativeRequest(payload) {
    const port = ensureNativePort();
    const requestId = nextRequestId;
    nextRequestId += 1;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error("Native Messaging の応答がタイムアウトしました"));
      }, REQUEST_TIMEOUT_MS);

      pendingRequests.set(requestId, {
        resolve,
        reject,
        timer,
      });

      try {
        port.postMessage({ ...payload, requestId });
      } catch (e) {
        clearTimeout(timer);
        pendingRequests.delete(requestId);
        reject(new Error(String(e?.message || e)));
      }
    });
  }

  async function handlePlay(text) {
    if (typeof text !== "string" || !text.trim()) {
      return { ok: false, reason: "読み上げ対象の本文テキストが空です" };
    }

    setState({ playback: "starting", lastError: "" });
    const res = await sendNativeRequest({ action: "play", text });

    if (res && res.ok === true) {
      setState({
        playback: typeof res.state === "string" ? res.state : "playing",
        lastError: "",
      });
      return { ok: true, state: state.playback };
    }

    const reason = res?.reason || res?.error || "再生に失敗しました";
    setState({ playback: "error", lastError: String(reason) });
    return { ok: false, reason: String(reason) };
  }

  async function handleStop() {
    setState({ playback: "stopping", lastError: "" });
    const res = await sendNativeRequest({ action: "stop" });

    if (res && res.ok === true) {
      setState({
        playback: typeof res.state === "string" ? res.state : "stopped",
        lastError: "",
      });

      try {
        nativePort?.disconnect();
      } catch {
        // noop
      }

      return { ok: true, state: state.playback };
    }

    const reason = res?.reason || res?.error || "停止に失敗しました";
    setState({ playback: "error", lastError: String(reason) });
    return { ok: false, reason: String(reason) };
  }

  function getStateSnapshot() {
    return { ok: true, state: { ...state }, host: NATIVE_HOST_NAME };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      try {
        if (!message || typeof message !== "object") {
          sendResponse({ ok: false, reason: "不正なメッセージです" });
          return;
        }

        if (message.type === "aivoice/getState") {
          sendResponse(getStateSnapshot());
          return;
        }

        if (message.type === "aivoice/play") {
          const res = await handlePlay(message.text);
          sendResponse(res);
          return;
        }

        if (message.type === "aivoice/stop") {
          const res = await handleStop();
          sendResponse(res);
          return;
        }

        sendResponse({ ok: false, reason: "未対応のメッセージです" });
      } catch (e) {
        const reason = String(e?.message || e);
        setState({ playback: "error", lastError: reason });
        sendResponse({ ok: false, reason });
      }
    })();

    return true;
  });

  globalScope.DocSnoutBackground = { getState: () => ({ ...state }) };
})(typeof globalThis !== "undefined" ? globalThis : self);

