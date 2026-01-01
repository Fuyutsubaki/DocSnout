// このファイルは aivoice-protocol のリクエスト構築をテストします。
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  HOST_NAME,
  buildPlayRequest,
  buildStopRequest,
  buildStatusRequest,
} = require("./aivoice-protocol.js");

test("aivoice-protocol: HOST_NAME が固定値である", () => {
  assert.equal(HOST_NAME, "com.docsnout.aivoice");
});

test("aivoice-protocol: play リクエストを構築する", () => {
  const req = buildPlayRequest({ text: "hello", title: "t", url: "u" });
  assert.equal(req.type, "play");
  assert.equal(typeof req.id, "string");
  assert.equal(req.text, "hello");
  assert.deepEqual(req.meta, { title: "t", url: "u" });
});

test("aivoice-protocol: stop/status リクエストを構築する", () => {
  const stop = buildStopRequest();
  assert.equal(stop.type, "stop");
  assert.equal(typeof stop.id, "string");

  const status = buildStatusRequest();
  assert.equal(status.type, "status");
  assert.equal(typeof status.id, "string");
});
