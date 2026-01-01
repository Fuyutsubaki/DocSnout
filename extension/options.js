const STORAGE_KEY_READING_SPEED_CPM = "readingSpeedCpm";
const DEFAULT_READING_SPEED_CPM = 500;

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

function load() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY_READING_SPEED_CPM], (items) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        resolve(DEFAULT_READING_SPEED_CPM);
        return;
      }

      const raw = items?.[STORAGE_KEY_READING_SPEED_CPM];
      const speed = Number(raw);
      if (Number.isFinite(speed) && speed > 0) {
        resolve(speed);
        return;
      }
      resolve(DEFAULT_READING_SPEED_CPM);
    });
  });
}

function save(speedCpm) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      { [STORAGE_KEY_READING_SPEED_CPM]: speedCpm },
      () => {
        const err = chrome.runtime?.lastError;
        if (err) {
          reject(new Error(err.message || "保存に失敗しました"));
          return;
        }
        resolve();
      },
    );
  });
}

function parseSpeedCpmFromInput() {
  const raw = $("speedCpm").value;
  const speed = Number(raw);
  if (!Number.isFinite(speed) || speed <= 0) {
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
    await save(parsed.value);
    setStatus("保存しました");
  } catch (e) {
    setError(String(e?.message || e));
  }
}

async function onReset() {
  $("speedCpm").value = String(DEFAULT_READING_SPEED_CPM);
  await onSave();
}

document.addEventListener("DOMContentLoaded", async () => {
  const speed = await load();
  $("speedCpm").value = String(speed);

  $("save").addEventListener("click", () => void onSave());
  $("reset").addEventListener("click", () => void onReset());
});
