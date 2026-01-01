# Native Messaging Host（A.I.VOICE）

このディレクトリは、Chrome 拡張から A.I.VOICE Editor API を呼び出すための Native Messaging Host（Windows）を置きます。

## 前提

- Windows で A.I.VOICE Editor がインストール済みであること
- `AI.Talk.Editor.Api.dll` が PC 上に存在すること
  - 既定では、自動検出を試みます
  - 見つからない場合は環境変数 `DOCSNOUT_AIVOICE_API_DLL` で DLL パスを指定します
- 必要に応じて利用する HostName を環境変数で固定できます
  - `DOCSNOUT_AIVOICE_HOSTNAME`（未指定の場合は `GetAvailableHostNames()` の先頭を使用）

## ビルド（例）

`.NET SDK` が入っている環境で以下を実行します。

```powershell
dotnet publish native-host/DocSnout.AiVoiceHost/DocSnout.AiVoiceHost.csproj -c Release -r win-x64 -p:PublishSingleFile=true -p:SelfContained=true
```

出力は `native-host/DocSnout.AiVoiceHost/bin/Release/net8.0/win-x64/publish/` に生成されます。

## インストール（Chrome への登録）

1. 拡張を Chrome に読み込む（`extension/`）
2. `chrome://extensions` で拡張の「拡張機能 ID」を確認する
3. PowerShell で以下を実行する

```powershell
.\native-host\install-host.ps1 -ExtensionId "<拡張機能ID>" -ExePath "<publishしたexeの絶対パス>"
```

## 動作確認（最小）

1. A.I.VOICE Editor を起動（起動していなくても Host が `StartHost` を試みます）
2. 任意ページで拡張のポップアップを開き「読み上げ」を押す

## メッセージ仕様（概要）

- `play`: `text` を Editor に流し込み、`Play()` を呼ぶ
- `stop`: `Stop()` を呼ぶ
- `status`: `Status` を返す

詳細は `native-host/manifest/com.docsnout.aivoice.json.template` と `extension/aivoice-protocol.js` を参照してください。
