const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeWhitespace,
  countUnicodeCodePoints,
  estimateReadingMinutes,
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

test("estimateReadingMinutes: 文字数と読書速度から読了時間(分)を切り上げで推定する", () => {
  assert.equal(estimateReadingMinutes({ characterCount: 1, speedCpm: 500 }), 1);
  assert.equal(
    estimateReadingMinutes({ characterCount: 500, speedCpm: 500 }),
    1,
  );
  assert.equal(
    estimateReadingMinutes({ characterCount: 501, speedCpm: 500 }),
    2,
  );
  assert.equal(
    estimateReadingMinutes({ characterCount: 1000, speedCpm: 500 }),
    2,
  );
  assert.equal(
    estimateReadingMinutes({ characterCount: 1001, speedCpm: 500 }),
    3,
  );
});
