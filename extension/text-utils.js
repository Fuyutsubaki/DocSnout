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

  const api = { normalizeWhitespace, countUnicodeCodePoints };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  globalScope.DocSnoutTextUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window);

