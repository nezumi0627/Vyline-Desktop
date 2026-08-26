# Vyline Desktop

Windows向けVyline DesktopのWebView2配布層です。

このrepoにはVyline本体、backend、protocol、plugin、themeを常駐コピーしません。GitHub Actionsの手動release時に、指定したVylineのrefとsubmoduleを取得して、rendererとbackend sidecarを組み立てます。

> [!WARNING]
> 本アプリは検証用Betaです。通常利用・本番利用は推奨しません。LINE公式クライアントではなく、アカウント停止やデータ損失などのリスクがあります。

## 構成

- `host/`: WebView2 host。backendをユーザー領域で起動し、動的loopbackポートへ接続
- `installer/`: Windows installer定義
- `scripts/prepare-vyline-webview.ps1`: release時のVyline ref準備と最小patch
- `.github/workflows/windows-webview-beta.yml`: 手動build・draft release

Web版のbackendは `127.0.0.1:3001` を維持します。Desktop版は起動ごとにOSから空きポートを取得し、backendとWebView2で共有します。固定ポート競合や同時起動時の衝突を避ける設計です。

## Release

GitHub Actionsの `Windows WebView2 Beta Draft` を手動実行し、`vyline_ref` とversionを指定してください。draft prereleaseに以下が添付されます。

- `Vyline-Desktop-<version>-WebView2.zip`
- `Vyline-Desktop-Setup-<version>.exe`

WebView2 Evergreen Runtimeを利用します。未導入環境ではMicrosoftのWebView2 Runtimeが必要です。

## 注意

配布物には認証token、Cookie、password、E2EE鍵を含めません。未署名Betaのため、信頼できる検証環境でのみ使用してください。
