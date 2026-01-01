## 変更概要
Chrome 拡張のポップアップから、抽出した本文テキストを A.I.VOICE に送って読み上げ（再生/停止）できるようにしました。ポップアップを閉じても制御できるよう、Service Worker（background）で Native Messaging を扱います。

## 変更内容
- `page-extract.js` の抽出結果に本文テキスト（`text`）を追加
- ポップアップに「再生/停止」ボタンと「読み上げ状態」を追加
- Service Worker（`extension/background.js`）を追加し、Native Messaging でローカルホストへ `play/stop` を送信
- `nativeMessaging` 権限と background service worker 設定を `manifest.json` に追加

## 変更理由（タスク背景）
- ブラウザで見ているページの本文を、A.I.VOICE で手軽に読み上げ操作できるようにするためです。
- ポップアップを閉じても読み上げを継続できるよう、UI ではなく Service Worker 側で再生制御を担当します。

## 実装詳細
- 送信先ホスト名: `com.docsnout.aivoice`
- Native Messaging メッセージ例:
  - 再生: `{ action: "play", text }`
  - 停止: `{ action: "stop" }`
- A.I.VOICE Editor API は 10 分無操作で切断されるため、拡張側は「必要なら再接続できる」前提で状態とエラーを扱います（接続は play/stop 時に確立）。

## 動作確認
- Chrome に `extension/` を読み込み
- 任意ページでポップアップを開き「再計算」→「再生/停止」を確認
- Native Messaging ホスト未登録の場合、読み上げ操作がエラー表示になることを確認

---
This PR was written using [Vibe Kanban](https://vibekanban.com)
