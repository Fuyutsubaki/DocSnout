param(
  [Parameter(Mandatory = $true)]
  [string]$ExtensionId,

  [Parameter(Mandatory = $true)]
  [string]$ExePath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ExePath)) {
  throw "ExePath が存在しません: $ExePath"
}

$hostName = "com.docsnout.aivoice"
$manifestTemplate = Join-Path $PSScriptRoot "manifest\com.docsnout.aivoice.json.template"
if (-not (Test-Path -LiteralPath $manifestTemplate)) {
  throw "manifest template が見つかりません: $manifestTemplate"
}

$installDir = Join-Path $env:LOCALAPPDATA "DocSnout\NativeMessagingHosts"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

$manifestPath = Join-Path $installDir "$hostName.json"
$json = Get-Content -LiteralPath $manifestTemplate -Raw
$json = $json.Replace("__EXE_PATH__", $ExePath.Replace("\", "\\"))
$json = $json.Replace("__EXTENSION_ID__", $ExtensionId)
Set-Content -LiteralPath $manifestPath -Value $json -Encoding UTF8

$regPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"
New-Item -Force -Path $regPath | Out-Null
New-ItemProperty -Path $regPath -Name "(default)" -Value $manifestPath -PropertyType String -Force | Out-Null

Write-Host "OK"
Write-Host "manifest: $manifestPath"
Write-Host "registry: $regPath"

