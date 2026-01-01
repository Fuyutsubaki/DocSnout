(function initDocSnoutPageExtract(globalScope) {
  const textUtils = globalScope.DocSnoutTextUtils;

  function getText(element) {
    const raw =
      typeof element?.innerText === "string"
        ? element.innerText
        : element?.textContent ?? "";
    return textUtils.normalizeWhitespace(raw);
  }

  function countLinkTextCodePoints(element) {
    let total = 0;
    const anchors = element.querySelectorAll("a");
    const limit = Math.min(anchors.length, 200);
    for (let i = 0; i < limit; i += 1) {
      total += textUtils.countUnicodeCodePoints(getText(anchors[i]));
    }
    return total;
  }

  function elementPriorityBonus(element) {
    const tag = (element?.tagName || "").toLowerCase();
    if (tag === "article") return 5000;
    if (tag === "main") return 2500;
    if (tag === "body") return 0;
    return 0;
  }

  function describeElement(element) {
    if (!element || !element.tagName) return "不明";
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const classNames =
      typeof element.className === "string" ? element.className.trim() : "";
    const classes = classNames
      ? classNames
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((c) => `.${c}`)
          .join("")
      : "";
    return `${tag}${id}${classes}`;
  }

  function pickBestCandidate(candidates) {
    let best = null;
    let bestScore = -Infinity;
    let bestLen = 0;

    for (const element of candidates) {
      if (element?.nodeType !== 1) continue;
      const text = getText(element);
      const length = textUtils.countUnicodeCodePoints(text);
      if (length <= 0) continue;

      const linkTextLen = countLinkTextCodePoints(element);
      const score =
        elementPriorityBonus(element) + length - Math.floor(linkTextLen * 0.5);

      if (score > bestScore || (score === bestScore && length > bestLen)) {
        best = { element, text, length, score };
        bestScore = score;
        bestLen = length;
      }
    }

    return best;
  }

  function extract() {
    if (!textUtils) {
      return {
        ok: false,
        reason: "文字数計算の処理を読み込めませんでした",
      };
    }

    const nodes = Array.from(document.querySelectorAll("article, main, body"));
    const unique = [];
    const seen = new Set();
    for (const node of nodes) {
      if (!node || seen.has(node)) continue;
      seen.add(node);
      unique.push(node);
    }

    const best = pickBestCandidate(unique);
    if (!best) {
      return {
        ok: false,
        reason: "本文候補が見つかりませんでした",
        title: document.title ?? "",
      };
    }

    return {
      ok: true,
      title: document.title ?? "",
      source: describeElement(best.element),
      count: best.length,
    };
  }

  globalScope.DocSnoutPageExtract = { extract };
})(typeof globalThis !== "undefined" ? globalThis : window);
