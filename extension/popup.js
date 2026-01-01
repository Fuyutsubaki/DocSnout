const $ = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`要素が見つかりません: #${id}`);
  return element;
};

const STORAGE_KEY_READING_SPEED_CPM = "readingSpeedCpm";
const DEFAULT_READING_SPEED_CPM = 500;

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

function loadReadingSpeedCpm() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve(DEFAULT_READING_SPEED_CPM);
      return;
    }

    chrome.storage.local.get([STORAGE_KEY_READING_SPEED_CPM], (items) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        resolve(DEFAULT_READING_SPEED_CPM);
        return;
      }

      const raw = items?.[STORAGE_KEY_READING_SPEED_CPM];
      const speed = Number(raw);
      if (Number.isFinite(speed) && speed > 0) {
        resolve(speed);
        return;
      }

      resolve(DEFAULT_READING_SPEED_CPM);
    });
  });
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

  try {
    const speedCpm = await loadReadingSpeedCpm();
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

document.addEventListener("DOMContentLoaded", () => {
  $("recalc").addEventListener("click", () => {
    void recalc();
  });
  $("openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  void recalc();
});
