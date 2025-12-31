const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeWhitespace,
  countUnicodeCodePoints,
} = require("./text-utils.js");

test("normalizeWhitespace: collapses and trims whitespace", () => {
  assert.equal(normalizeWhitespace("  a\n\t b  "), "a b");
  assert.equal(normalizeWhitespace(""), "");
  assert.equal(normalizeWhitespace(null), "");
});

test("countUnicodeCodePoints: counts unicode code points", () => {
  assert.equal(countUnicodeCodePoints("abc"), 3);
  assert.equal(countUnicodeCodePoints("a\u0301"), 2); // combining mark
  assert.equal(countUnicodeCodePoints("😀"), 1); // surrogate pair
  assert.equal(countUnicodeCodePoints(""), 0);
  assert.equal(countUnicodeCodePoints(null), 0);
});

