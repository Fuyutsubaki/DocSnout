// 設定値を正規化し、Chrome ストレージに保存して読み出す。
(function initDocSnoutSettings(globalScope) {
  const STORAGE_KEY_READING_SPEED_CPM = "readingSpeedCpm";
  const DEFAULT_READING_SPEED_CPM = 500;

  function normalizeReadingSpeedCpm(value) {
    const speed = Number(value);
    if (!Number.isFinite(speed) || speed <= 0) return null;
    return Math.floor(speed);
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

        const speed = normalizeReadingSpeedCpm(
          items?.[STORAGE_KEY_READING_SPEED_CPM],
        );
        resolve(speed ?? DEFAULT_READING_SPEED_CPM);
      });
    });
  }

  function saveReadingSpeedCpm(speedCpm) {
    return new Promise((resolve, reject) => {
      if (!chrome?.storage?.local) {
        reject(new Error("設定の保存に必要なAPIを利用できません"));
        return;
      }

      chrome.storage.local.set(
        { [STORAGE_KEY_READING_SPEED_CPM]: speedCpm },
        () => {
          const err = chrome.runtime?.lastError;
          if (err) {
            reject(new Error(err.message || "保存に失敗しました"));
            return;
          }
          resolve();
        },
      );
    });
  }

  const api = {
    STORAGE_KEY_READING_SPEED_CPM,
    DEFAULT_READING_SPEED_CPM,
    normalizeReadingSpeedCpm,
    loadReadingSpeedCpm,
    saveReadingSpeedCpm,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  globalScope.DocSnoutSettings = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
