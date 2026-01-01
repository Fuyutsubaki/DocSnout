const $ = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`要素が見つかりません: #${id}`);
  return element;
};

let lastExtractedText = "";

function setStatus(text) {
  $("status").textContent = text;
}

function setPlaybackStatus(text) {
  $("playbackStatus").textContent = text;
}

function setError(message) {
  const error = $("error");
  if (!message) {
    error.textContent = "";
    error.setAttribute("aria-hidden", "true");
    return;
  }
  error.textContent = message;
  error.setAttribute("aria-hidden", "false");
}

function formatReadingTime(minutes) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) return "—";
  return `約${minutes}分`;
}

function setResult({ count, source, title, readingMinutes }) {
  $("count").textContent = typeof count === "number" ? String(count) : "—";
  $("readingTime").textContent = formatReadingTime(readingMinutes);
  $("source").textContent = source || "—";
  $("title").textContent = title || "—";
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(new Error(err.message || "拡張機能への送信に失敗しました"));
        return;
      }
      resolve(response ?? null);
    });
  });
}

function normalizePlaybackLabel(state) {
  const playback = state?.playback;
  const connected = Boolean(state?.connected);
  const lastError = typeof state?.lastError === "string" ? state.lastError : "";

  if (lastError) return "読み上げ: エラー";
  if (!connected) return "読み上げ: 未接続";
  if (playback === "playing") return "読み上げ: 再生中";
  if (playback === "stopped") return "読み上げ: 停止中";
  if (playback === "starting") return "読み上げ: 開始中…";
  if (playback === "stopping") return "読み上げ: 停止中…";
  if (playback === "idle") return "読み上げ: 待機中";
  if (playback === "unknown") return "読み上げ: 不明";
  return `読み上げ: ${String(playback || "—")}`;
}

function applyPlaybackUi(state, { hasText }) {
  setPlaybackStatus(normalizePlaybackLabel(state));

  const lastError = typeof state?.lastError === "string" ? state.lastError : "";
  if (lastError) setError(`読み上げ: ${lastError}`);

  const playback = state?.playback;
  const canPlay =
    Boolean(hasText) && playback !== "starting" && playback !== "stopping";
  const canStop = playback === "playing" || playback === "starting";

  $("play").disabled = !canPlay;
  $("stop").disabled = !canStop;
}

function queryActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(new Error(err.message || "タブ情報の取得に失敗しました"));
        return;
      }
      resolve(tabs?.[0] ?? null);
    });
  });
}

function executeFiles(tabId, files) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript({ target: { tabId }, files }, () => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(
          new Error(err.message || "ページへのスクリプト注入に失敗しました"),
        );
        return;
      }
      resolve();
    });
  });
}

function executeFunc(tabId, func) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript({ target: { tabId }, func }, (results) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(new Error(err.message || "ページ側の処理実行に失敗しました"));
        return;
      }
      resolve(results?.[0]?.result ?? null);
    });
  });
}

async function recalc() {
  setError("");
  setStatus("計測中…");
  $("recalc").disabled = true;
  $("play").disabled = true;
  $("stop").disabled = true;
  lastExtractedText = "";

  try {
    const speedCpm =
      (await globalThis.DocSnoutSettings?.loadReadingSpeedCpm?.()) ?? 500;
    const tab = await queryActiveTab();
    if (!tab?.id) {
      setResult({ count: null, source: "", title: "", readingMinutes: null });
      setError("対象タブが見つかりませんでした");
      setStatus("失敗");
      return;
    }

    const isReady = await executeFunc(tab.id, () => {
      return Boolean(
        globalThis.DocSnoutTextUtils &&
          globalThis.DocSnoutPageExtract?.extract,
      );
    });
    if (!isReady) {
      await executeFiles(tab.id, ["text-utils.js", "page-extract.js"]);
    }
    const result = await executeFunc(tab.id, () => {
      try {
        const extractor = globalThis.DocSnoutPageExtract;
        if (!extractor?.extract) {
          return { ok: false, reason: "本文抽出の処理を読み込めませんでした" };
        }
        return extractor.extract();
      } catch (e) {
        return {
          ok: false,
          reason:
            typeof e?.message === "string" && e.message
              ? e.message
              : "本文抽出中にエラーが発生しました",
        };
      }
    });

    if (!result || result.ok !== true) {
      setResult({
        count: null,
        source: "",
        title: result?.title || "",
        readingMinutes: null,
      });
      const reason =
        result?.reason ||
        "このページでは計測できません（対象ページ不可の可能性）";
      setError(reason);
      setStatus("失敗");
      setPlaybackStatus("読み上げ: —");
      return;
    }

    const extractedText = typeof result.text === "string" ? result.text : "";
    setResult({
      count: result.count,
      source: result.source,
      title: result.title,
      readingMinutes:
        globalThis.DocSnoutTextUtils?.estimateReadingMinutes?.({
          characterCount: result.count,
          speedCpm,
          difficultyFactor: 1.0,
        }) ?? null,
    });
    lastExtractedText = extractedText;
    setStatus("完了");

    try {
      const playbackState = await sendRuntimeMessage({ type: "aivoice/getState" });
      if (playbackState?.ok === true) {
        applyPlaybackUi(playbackState.state, {
          hasText: Boolean(extractedText.trim()),
        });
      } else {
        $("play").disabled = !Boolean(extractedText.trim());
        $("stop").disabled = true;
        setPlaybackStatus("読み上げ: 未接続");
      }
    } catch {
      $("play").disabled = !Boolean(extractedText.trim());
      $("stop").disabled = true;
      setPlaybackStatus("読み上げ: 未接続");
    }
  } catch (e) {
    setResult({ count: null, source: "", title: "", readingMinutes: null });
    setError(
      `このページでは計測できません（${String(e?.message || e)}）`,
    );
    setStatus("失敗");
    setPlaybackStatus("読み上げ: —");
  } finally {
    $("recalc").disabled = false;
  }
}

async function refreshPlaybackState() {
  try {
    const res = await sendRuntimeMessage({ type: "aivoice/getState" });
    if (res?.ok === true) {
      applyPlaybackUi(res.state, { hasText: Boolean(lastExtractedText.trim()) });
      return;
    }
    setPlaybackStatus("読み上げ: 未接続");
  } catch {
    setPlaybackStatus("読み上げ: 未接続");
  }
}

async function onPlay() {
  setError("");
  $("play").disabled = true;
  $("stop").disabled = true;
  setPlaybackStatus("読み上げ: 送信中…");

  const text = String(lastExtractedText || "");
  if (!text.trim()) {
    setError("読み上げ: 本文テキストが空です（先に再計算してください）");
    await refreshPlaybackState();
    return;
  }

  try {
    const res = await sendRuntimeMessage({ type: "aivoice/play", text });
    if (res?.ok !== true) {
      setError(`読み上げ: ${String(res?.reason || "再生に失敗しました")}`);
    }
  } catch (e) {
    setError(`読み上げ: ${String(e?.message || e)}`);
  } finally {
    await refreshPlaybackState();
  }
}

async function onStop() {
  setError("");
  $("play").disabled = true;
  $("stop").disabled = true;
  setPlaybackStatus("読み上げ: 送信中…");

  try {
    const res = await sendRuntimeMessage({ type: "aivoice/stop" });
    if (res?.ok !== true) {
      setError(`読み上げ: ${String(res?.reason || "停止に失敗しました")}`);
    }
  } catch (e) {
    setError(`読み上げ: ${String(e?.message || e)}`);
  } finally {
    await refreshPlaybackState();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("recalc").addEventListener("click", () => {
    void recalc();
  });
  $("openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  $("play").addEventListener("click", () => void onPlay());
  $("stop").addEventListener("click", () => void onStop());

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") return;
    if (message.type !== "aivoice/state") return;
    applyPlaybackUi(message.state, { hasText: Boolean(lastExtractedText.trim()) });
  });

  void refreshPlaybackState();
  void recalc();
});
