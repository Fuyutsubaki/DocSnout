const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeWhitespace,
  countUnicodeCodePoints,
} = require("./text-utils.js");

test("normalizeWhitespace: 空白を正規化する", () => {
  assert.equal(normalizeWhitespace("  a\n\t b  "), "a b");
  assert.equal(normalizeWhitespace(""), "");
  assert.equal(normalizeWhitespace(null), "");
});

test("countUnicodeCodePoints: Unicodeコードポイントを数える", () => {
  assert.equal(countUnicodeCodePoints("abc"), 3);
  assert.equal(countUnicodeCodePoints("a\u0301"), 2); // 結合文字
  assert.equal(countUnicodeCodePoints("😀"), 1); // サロゲートペア
  assert.equal(countUnicodeCodePoints(""), 0);
  assert.equal(countUnicodeCodePoints(null), 0);
});
