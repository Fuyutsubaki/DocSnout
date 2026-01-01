// ポップアップで本文計測と読み上げ操作のユーザーインターフェースを提供する。
const $ = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`要素が見つかりません: #${id}`);
  return element;
};

function setStatus(text) {
  $("status").textContent = text;
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

function setTtsStatus(text) {
  const el = document.getElementById("ttsStatus");
  if (!el) return;
  el.textContent = text || "—";
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

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (resp) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(new Error(err.message || "バックグラウンドへの送信に失敗しました"));
        return;
      }
      resolve(resp ?? null);
    });
  });
}

async function recalc() {
  setError("");
  setStatus("計測中…");
  $("recalc").disabled = true;

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
      return;
    }

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
    setStatus("完了");
  } catch (e) {
    setResult({ count: null, source: "", title: "", readingMinutes: null });
    setError(
      `このページでは計測できません（${String(e?.message || e)}）`,
    );
    setStatus("失敗");
  } finally {
    $("recalc").disabled = false;
  }
}

async function ensureExtractorReady(tabId) {
  const isReady = await executeFunc(tabId, () => {
    return Boolean(
      globalThis.DocSnoutTextUtils && globalThis.DocSnoutPageExtract?.extract,
    );
  });
  if (!isReady) {
    await executeFiles(tabId, ["text-utils.js", "page-extract.js"]);
  }
}

async function extractTextFromTab(tabId) {
  await ensureExtractorReady(tabId);
  return executeFunc(tabId, () => {
    try {
      const extractor = globalThis.DocSnoutPageExtract;
      if (!extractor?.extract) {
        return { ok: false, reason: "本文抽出の処理を読み込めませんでした" };
      }
      return extractor.extract({ includeText: true, maxTextCodePoints: 12000 });
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
}

async function onPlay() {
  setError("");
  setTtsStatus("準備中…");
  $("play").disabled = true;
  $("stop").disabled = true;

  try {
    const tab = await queryActiveTab();
    if (!tab?.id) throw new Error("対象タブが見つかりませんでした");

    const extracted = await extractTextFromTab(tab.id);
    if (!extracted || extracted.ok !== true) {
      throw new Error(extracted?.reason || "本文を抽出できませんでした");
    }
    const text = extracted.text || "";
    if (!text.trim()) throw new Error("読み上げる本文が空です");

    const req = globalThis.DocSnoutAiVoiceProtocol?.buildPlayRequest?.({
      text,
      title: extracted.title || "",
      url: tab.url || "",
    });
    if (!req) throw new Error("リクエストの構築に失敗しました");

    const resp = await sendMessage({ type: "aivoice.request", payload: req });
    if (!resp?.ok) {
      throw new Error(resp?.error?.message || "読み上げに失敗しました");
    }
    setTtsStatus(resp?.data?.status || "OK");
  } catch (e) {
    setTtsStatus("失敗");
    setError(String(e?.message || e));
  } finally {
    $("play").disabled = false;
    $("stop").disabled = false;
  }
}

async function onStop() {
  setError("");
  setTtsStatus("停止中…");
  $("play").disabled = true;
  $("stop").disabled = true;

  try {
    const req = globalThis.DocSnoutAiVoiceProtocol?.buildStopRequest?.();
    if (!req) throw new Error("リクエストの構築に失敗しました");

    const resp = await sendMessage({ type: "aivoice.request", payload: req });
    if (!resp?.ok) {
      throw new Error(resp?.error?.message || "停止に失敗しました");
    }
    setTtsStatus(resp?.data?.status || "停止");
  } catch (e) {
    setTtsStatus("失敗");
    setError(String(e?.message || e));
  } finally {
    $("play").disabled = false;
    $("stop").disabled = false;
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
  void recalc();
});
