# DocSnout

最小構成の Chrome 拡張（機能追加の土台）です。

## できること（現状）

- 任意ページから本文候補を抽出し、文字数（Unicodeコードポイント）を表示する
- ポップアップに「文字数 / 抽出元 / ページタイトル」を表示し、再計算できる

## 使い方（Chrome に読み込む）

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパー モード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」を押す
4. このリポジトリの `extension/` ディレクトリを選択する

## 開発メモ

- 拡張の実体は `extension/` 配下
- ワークフロー手順は `kanban/`（互換用に `vibes/kanban/` にも同内容を配置）
- 文字数ユーティリティの簡易テスト: `node --test extension/text-utils.test.js`
