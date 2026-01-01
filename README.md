# DocSnout

最小構成の Chrome 拡張（機能追加の土台）です。

## できること（現状）

- 任意ページから本文候補を抽出し、文字数（Unicodeコードポイント）を表示する
- ポップアップに「文字数 / 抽出元 / ページタイトル」を表示し、再計算できる
- 抽出した本文テキストを A.I.VOICE に送って読み上げ（再生/停止）できる（Native Messaging）

## 使い方（Chrome に読み込む）

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパー モード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」を押す
4. このリポジトリの `extension/` ディレクトリを選択する

## A.I.VOICE 読み上げ（Native Messaging）

この拡張は A.I.VOICE Editor API を直接呼びません。ローカルにインストールした Native Messaging ホスト（別途実装/配布）経由で再生/停止を制御します。

- Native Messaging ホスト名: `com.docsnout.aivoice`
- 拡張側の送信先: `extension/background.js`（Service Worker）

### メッセージ仕様（拡張 → ホスト）

拡張は `chrome.runtime.connectNative()` でホストに接続し、以下の形式で送信します。

- 再生: `{ requestId: number, action: "play", text: string }`
- 停止: `{ requestId: number, action: "stop" }`

### メッセージ仕様（ホスト → 拡張）

ホストは `requestId` を返し、成功/失敗を返します。

- 成功例: `{ requestId: number, ok: true, state?: "playing" | "stopped" }`
- 失敗例: `{ requestId: number, ok: false, reason?: string, error?: string }`
- 任意イベント（任意）: `{ state: "playing" | "stopped" | "error", error?: string }`

### セットアップの注意

- Chrome 拡張の `nativeMessaging` 権限だけでは動きません。OS 側に「Native Messaging ホストの登録」が必要です。
- ホストマニフェストの雛形は `extension/native-host-manifest.example.json` です（`path` と `allowed_origins` を環境に合わせて書き換えてください）。
- `allowed_origins` の `<EXTENSION_ID>` は、拡張を読み込んだ後に `chrome://extensions` で確認できます（パッケージ化されていない拡張でも固有IDが付きます）。
- ホストマニフェストの配置場所は OS ごとに異なります（例: Windows はレジストリ登録、macOS/Linux は所定ディレクトリに JSON を配置）。
- ホスト側は A.I.VOICE Editor API の「10分無操作で切断」を考慮し、必要に応じて接続/再接続する実装にしてください。

### 動作確認（手動）

1. `extension/` を Chrome に読み込み（上記の手順）
2. 任意ページでポップアップを開き「再計算」を押す
3. 「再生」を押す（ホスト未登録ならエラー表示になる）
4. ホスト登録済みなら「停止」で止まることを確認する

## 開発メモ

- 拡張の実体は `extension/` 配下
- ワークフロー手順は `kanban/`（互換用に `vibes/kanban/` にも同内容を配置）
- 文字数ユーティリティの簡易テスト: `node --test extension/text-utils.test.js`
