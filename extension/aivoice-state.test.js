// aivoice-state の状態遷移をテストする。
const test = require("node:test");
const assert = require("node:assert/strict");

const { INITIAL_STATE, reduce } = require("./aivoice-state.js");

test("aivoice-state: 初期状態は idle", () => {
  assert.equal(INITIAL_STATE.phase, "idle");
  assert.equal(INITIAL_STATE.lastError, "");
});

test("aivoice-state: 代表的な状態遷移", () => {
  let state = INITIAL_STATE;
  state = reduce(state, { type: "CONNECT_START" });
  assert.equal(state.phase, "connecting");

  state = reduce(state, { type: "CONNECT_OK" });
  assert.equal(state.phase, "ready");

  state = reduce(state, { type: "PLAY_START" });
  assert.equal(state.phase, "playing");

  state = reduce(state, { type: "STOP_OK" });
  assert.equal(state.phase, "ready");

  state = reduce(state, { type: "ERROR", message: "x" });
  assert.equal(state.phase, "error");
  assert.equal(state.lastError, "x");

  state = reduce(state, { type: "DISCONNECTED" });
  assert.equal(state.phase, "idle");
});
