// オプション画面で読み上げ速度の設定を表示し、保存する。
const $ = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`要素が見つかりません: #${id}`);
  return element;
};

function setStatus(text) {
  $("status").textContent = text || "";
}

function setError(text) {
  $("error").textContent = text || "";
}

function parseSpeedCpmFromInput() {
  const raw = $("speedCpm").value;
  const speed = globalThis.DocSnoutSettings?.normalizeReadingSpeedCpm?.(raw);
  if (speed == null) {
    return { ok: false, value: null, reason: "1以上の数値を入力してください" };
  }
  return { ok: true, value: Math.floor(speed), reason: "" };
}

async function onSave() {
  setError("");
  setStatus("");

  const parsed = parseSpeedCpmFromInput();
  if (!parsed.ok) {
    setError(parsed.reason);
    return;
  }

  try {
    await globalThis.DocSnoutSettings.saveReadingSpeedCpm(parsed.value);
    setStatus("保存しました");
  } catch (e) {
    setError(String(e?.message || e));
  }
}

async function onReset() {
  $("speedCpm").value = String(globalThis.DocSnoutSettings.DEFAULT_READING_SPEED_CPM);
  await onSave();
}

document.addEventListener("DOMContentLoaded", async () => {
  const speed = await globalThis.DocSnoutSettings.loadReadingSpeedCpm();
  $("speedCpm").value = String(speed);

  $("save").addEventListener("click", () => void onSave());
  $("reset").addEventListener("click", () => void onReset());
});
