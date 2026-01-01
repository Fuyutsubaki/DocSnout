// このファイルは page-extract の本文抽出ロジックをテストします。
const test = require("node:test");
const assert = require("node:assert/strict");

global.DocSnoutTextUtils = require("./text-utils.js");
const { extract } = require("./page-extract.js");

function createEl({ tagName, text = "", anchors = [] }) {
  return {
    nodeType: 1,
    tagName,
    innerText: text,
    textContent: text,
    id: "",
    className: "",
    querySelectorAll(selector) {
      if (selector !== "a") return [];
      return anchors.map((t) => ({
        innerText: t,
        textContent: t,
      }));
    },
  };
}

test("page-extract: article/main/body から本文候補を選ぶ", () => {
  const article = createEl({
    tagName: "ARTICLE",
    text: "本文本文本文",
    anchors: ["リンク", "リンク"],
  });
  const main = createEl({ tagName: "MAIN", text: "短い" });
  const body = createEl({ tagName: "BODY", text: "body本文" });

  global.document = {
    title: "タイトル",
    querySelectorAll(selector) {
      assert.equal(selector, "article, main, body");
      return [article, main, body];
    },
  };

  const result = extract({ includeText: true, maxTextCodePoints: 50 });
  assert.equal(result.ok, true);
  assert.equal(result.title, "タイトル");
  assert.equal(typeof result.count, "number");
  assert.equal(typeof result.text, "string");
  assert.ok(result.text.includes("本文"));
});

test("page-extract: includeText を false にすると text は空", () => {
  global.document = {
    title: "",
    querySelectorAll() {
      return [createEl({ tagName: "BODY", text: "abc" })];
    },
  };

  const result = extract();
  assert.equal(result.ok, true);
  assert.equal(result.text, "");
});
