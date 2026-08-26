[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $SourceRoot,
  [Parameter(Mandatory = $true)] [string] $DesktopRoot,
  [Parameter(Mandatory = $true)] [string] $VylineRef,
  [Parameter(Mandatory = $true)] [string] $ReleaseVersion
)

$ErrorActionPreference = "Stop"
$source = (Resolve-Path -LiteralPath $SourceRoot).Path
$desktop = (Resolve-Path -LiteralPath $DesktopRoot).Path
$repoRoot = if (Test-Path -LiteralPath (Join-Path $source "Vyline\apps\desktop") -PathType Container) {
  Join-Path $source "Vyline"
} else {
  $source
}
$appRoot = Join-Path $repoRoot "apps\desktop"

if (-not (Test-Path -LiteralPath $appRoot -PathType Container)) {
  throw "Vyline source does not contain apps/desktop: $source"
}

$callPath = Join-Path $appRoot "src\hooks\useCall.ts"
$call = Get-Content -LiteralPath $callPath -Raw
$oldCall = @'
const WS_BASE =
  typeof location !== "undefined"
    ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:3001`
    : "ws://localhost:3001";
'@
$newCall = @'
const WS_BASE = (() => {
  if (typeof location === "undefined") return "ws://localhost:3001";
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  const port = location.port === "5173" ? "3001" : location.port || "3001";
  return `${scheme}://${location.hostname}:${port}`;
})();
'@
if ($call.Contains($oldCall)) {
  $call.Replace($oldCall, $newCall) | Set-Content -LiteralPath $callPath -Encoding utf8
}

$backendPath = Join-Path $repoRoot "backend\src\index.ts"
$backend = Get-Content -LiteralPath $backendPath -Raw
$backend = $backend.Replace(
  'const PORT = Number(process.env.PORT ?? 3001);',
  ('// Web uses 3001; the WebView2 host supplies its dynamically reserved port.' + [Environment]::NewLine + 'const PORT = Number(process.env.VYLINE_BACKEND_PORT ?? process.env.PORT ?? 3001);'))
$backend = $backend.Replace(
  '// Web uses 3001; the WebView2 host supplies its dynamically reserved port.\nconst PORT = Number(process.env.VYLINE_BACKEND_PORT ?? process.env.PORT ?? 3001);',
  ('// Web uses 3001; the WebView2 host supplies its dynamically reserved port.' + [Environment]::NewLine + 'const PORT = Number(process.env.VYLINE_BACKEND_PORT ?? process.env.PORT ?? 3001);'))
$backend | Set-Content -LiteralPath $backendPath -Encoding utf8

$loggerPath = Join-Path $repoRoot "backend\src\logger.ts"
$logger = Get-Content -LiteralPath $loggerPath -Raw
$logger = $logger.Replace(
  'const isDev = process.env.NODE_ENV !== "production";',
  ('// Compiled sidecars must not resolve the optional pretty transport at runtime.' + [Environment]::NewLine + 'const usePrettyLogs = process.env.VYLINE_BACKEND_PRETTY_LOGS === "true";'))
$logger = $logger.Replace(
  'isDev ? pino.transport({ target: "pino-pretty", options: { colorize: true } }) : undefined,',
  'usePrettyLogs ? pino.transport({ target: "pino-pretty", options: { colorize: true } }) : undefined,')
$logger = $logger.Replace(
  '// Compiled sidecars must not resolve the optional pretty transport at runtime.\nconst usePrettyLogs = process.env.VYLINE_BACKEND_PRETTY_LOGS === "true";',
  ('// Compiled sidecars must not resolve the optional pretty transport at runtime.' + [Environment]::NewLine + 'const usePrettyLogs = process.env.VYLINE_BACKEND_PRETTY_LOGS === "true";'))
$logger | Set-Content -LiteralPath $loggerPath -Encoding utf8

$persistPath = Join-Path $repoRoot "packages\protocol\src\desktop\persist.ts"
$persist = Get-Content -LiteralPath $persistPath -Raw
$persist = $persist.Replace(
  'const FALLBACK_PATH = join(_here, "../../data/desktop-profile.fallback.json");',
  'const FALLBACK_PATH = process.env.VYLINE_PROFILE_PATH ?? join(_here, "../../data/desktop-profile.fallback.json");')
$persist | Set-Content -LiteralPath $persistPath -Encoding utf8

function Set-PackageVersion([string] $path, [string] $version) {
  $json = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $json.version = $version
  $json | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $path -Encoding utf8
}

Set-PackageVersion (Join-Path $source "package.json") $ReleaseVersion
Set-PackageVersion (Join-Path $appRoot "package.json") $ReleaseVersion

$sha = (git -C $source rev-parse HEAD).Trim()
$metadata = [ordered]@{
  repository = "https://github.com/nezumi0627/vyline"
  ref = $VylineRef
  commit = $sha
  host = "WebView2"
  releaseVersion = $ReleaseVersion
}
$metadataPath = Join-Path $appRoot "resources\vyline-source.json"
New-Item -ItemType Directory -Path (Split-Path -Parent $metadataPath) -Force | Out-Null
$metadata | ConvertTo-Json | Set-Content -LiteralPath $metadataPath -Encoding utf8

Write-Host "Prepared Vyline $sha for WebView2 release $ReleaseVersion"
