// このファイルは空白正規化、文字数カウント、読了時間推定などの文字列ユーティリティを提供します。
(function initDocSnoutTextUtils(globalScope) {
  function normalizeWhitespace(text) {
    return String(text ?? "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function countUnicodeCodePoints(text) {
    let count = 0;
    for (const _ch of String(text ?? "")) count += 1;
    return count;
  }

  function estimateReadingMinutes({
    characterCount,
    speedCpm,
    difficultyFactor = 1.0,
  }) {
    const count = Number(characterCount);
    const speed = Number(speedCpm);
    const factor = Number(difficultyFactor);

    if (!Number.isFinite(count) || count < 0) return null;
    if (!Number.isFinite(speed) || speed <= 0) return null;
    if (!Number.isFinite(factor) || factor <= 0) return null;

    const minutes = Math.ceil((count / speed) * factor);
    return Math.max(1, minutes);
  }

  const api = { normalizeWhitespace, countUnicodeCodePoints, estimateReadingMinutes };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  globalScope.DocSnoutTextUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
