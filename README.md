# DocSnout

最小構成の Chrome 拡張（機能追加の土台）です。

## できること（現状）

- 任意ページから本文候補を抽出し、文字数（Unicodeコードポイント）を表示する
- ポップアップに「文字数 / 抽出元 / ページタイトル」を表示し、再計算できる
- Windows では Native Messaging Host と連携して A.I.VOICE に読み上げを依頼できる（要セットアップ）

## 使い方（Chrome に読み込む）

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパー モード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」を押す
4. このリポジトリの `extension/` ディレクトリを選択する

## 開発メモ

- 拡張の実体は `extension/` 配下
- ワークフロー手順は `vibes/kanban/`
- 拡張のテスト（Node の組み込みテストランナー）:
  - `node --test extension/text-utils.test.js`
  - `node --test extension/page-extract.test.js`
  - `node --test extension/aivoice-protocol.test.js`
  - `node --test extension/aivoice-state.test.js`
- Native Messaging Host（Windows）: `native-host/README.md`
