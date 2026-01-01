## 変更概要
Chrome 拡張と Native Messaging Host を一体として実装し、A.I.VOICE Editor API による読み上げを End-to-End で動かせるようにしました。あわせて、本文抽出・メッセージ構築・状態遷移のテストを追加し、回帰を防ぎます。

## 変更内容
- 拡張（MV3）
  - Service Worker（`extension/background.js`）で Native Messaging Host へ接続し、`play/stop/status` を中継
  - ポップアップに「読み上げ / 停止」ボタンと TTS 状態表示を追加
  - 本文抽出を拡張し、読み上げ用の本文テキスト（最大 12000 code points）を返す
  - `nativeMessaging` 権限を追加
- Native Messaging Host（Windows/.NET）
  - `native-host/DocSnout.AiVoiceHost/` を追加（`AI.Talk.Editor.Api.dll` をリフレクションで読み込み）
  - 10分無操作切断に備え、定期的に `Status` を参照して再接続を試行
  - Chrome 登録用の PowerShell スクリプトと manifest template を追加
- テスト（拡張側）
  - `extension/page-extract.test.js`
  - `extension/aivoice-protocol.test.js`
  - `extension/aivoice-state.test.js`

## 変更理由（タスク背景）
Webページ本文を A.I.VOICE で読み上げるユースケースを、拡張単体ではなく「拡張 + Native Host + Editor API」まで含めて End-to-End で成立させるためです。

## 実装詳細
- Native Messaging の Host 名: `com.docsnout.aivoice`
- リクエスト/レスポンス
  - request: `{ id, type: "play" | "stop" | "status", ... }`
  - response: `{ id, ok, data?, error? }`
- A.I.VOICE Editor API
  - `AI.Talk.Editor.Api.TtsControl` を利用（ビルド時参照はせず、実行時に DLL を読み込む）
  - 利用可能な `HostName` は `GetAvailableHostNames()` の先頭を採用
  - `Status` が `NotConnected/NotRunning` の場合は `StartHost`→`Connect` を試行

## 動作確認
- 拡張テスト: `node --test extension/*.test.js`
- Native Host: `native-host/README.md` の手順で Windows 上で確認

---
This PR was written using [Vibe Kanban](https://vibekanban.com)
