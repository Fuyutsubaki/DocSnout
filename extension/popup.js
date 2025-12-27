async function queryActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] ?? null;
}

function isRestrictedUrl(url) {
  if (!url) return false;
  const restrictedPrefixes = [
    "chrome://",
    "chrome-extension://",
    "edge://",
    "about:",
    "view-source:",
  ];
  if (restrictedPrefixes.some((prefix) => url.startsWith(prefix))) return true;
  if (url.startsWith("https://chrome.google.com/webstore")) return true;
  if (url.startsWith("https://chromewebstore.google.com/")) return true;
  return false;
}

async function extractFromTab(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const normalizeWhitespaceInPage = (text) => text.replace(/\s+/g, " ").trim();
      const countCodePointsInPage = (text) => [...text].length;

      const scoreElement = (element, baseBonus) => {
        const rawText = element?.innerText ?? "";
        const text = normalizeWhitespaceInPage(rawText);
        const length = countCodePointsInPage(text);
        const paragraphCount = element?.querySelectorAll?.("p")?.length ?? 0;
        const score = length + paragraphCount * 50 + baseBonus;
        return { element, text, length, paragraphCount, score };
      };

      const buildSourceLabel = (element) => {
        if (!element) return "unknown";
        const tag = element.tagName?.toLowerCase?.() ?? "unknown";
        const id = element.id ? `#${element.id}` : "";
        const className =
          element.classList && element.classList.length
            ? "." + [...element.classList].slice(0, 2).join(".")
            : "";
        return `${tag}${id}${className}`;
      };

      const candidates = [];
      document.querySelectorAll("article").forEach((el) => candidates.push(scoreElement(el, 1500)));
      document.querySelectorAll("main").forEach((el) => candidates.push(scoreElement(el, 1000)));
      if (document.body) candidates.push(scoreElement(document.body, 0));

      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];

      if (!best || best.length === 0) {
        return {
          ok: false,
          reason: "本文を抽出できませんでした",
          pageTitle: document.title || "",
        };
      }

      return {
        ok: true,
        pageTitle: document.title || "",
        source: buildSourceLabel(best.element),
        charCount: best.length,
      };
    },
  });

  return result;
}

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

function setError(message) {
  setText("status", message);
  setText("charCount", "—");
  setText("source", "—");
}

function setLoading(isLoading) {
  const button = document.getElementById("recalc");
  if (button) button.disabled = isLoading;
  setText("status", isLoading ? "計算中…" : "");
}

async function recalc() {
  setLoading(true);
  try {
    const tab = await queryActiveTab();
    if (!tab?.id) {
      setError("対象タブを取得できませんでした");
      return;
    }

    if (isRestrictedUrl(tab.url || "")) {
      setError("このページでは実行できません（Chrome の制限）");
      return;
    }

    setText("pageTitle", tab.title || "");

    const result = await extractFromTab(tab.id);
    if (!result || result.ok !== true) {
      const reason = result?.reason || "対象ページでは実行できませんでした";
      setError(reason);
      return;
    }

    setText("pageTitle", result.pageTitle || tab.title || "");
    setText("charCount", String(result.charCount));
    setText("source", result.source || "unknown");
    setText("status", "");
  } catch (error) {
    const lastError = chrome.runtime.lastError?.message;
    setError(lastError || error?.message || "対象ページでは実行できませんでした");
  } finally {
    setLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("recalc")?.addEventListener("click", recalc);
  recalc();
});
