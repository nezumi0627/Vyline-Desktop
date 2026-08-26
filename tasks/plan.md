# Vyline Desktop Windows Beta

## Overview

VylineのReact/Vite UI、Bun/Hono backend、Vyline protocolをElectronで包み、Windows x64向けの検証用Beta installerとportable実行形式を提供する。

## Architecture Decisions

- ElectronのBrowserWindowは通常1つ。Rendererはsandbox + contextIsolation + nodeIntegration無効。
- backendはBun compileしたWindows sidecarとして起動し、UIと責務を分離する。
- 配布はelectron-builderのNSIS installerとportable target。ASARと日本語・英語のみでサイズを抑える。
- UpdaterはBetaで自動インストールせず、署名済み配信URLが設定された場合だけ明示操作に使う。

## Acceptance Criteria

- [x] `bun run typecheck` が成功する
- [x] `bun run desktop:sidecar` がWindows backend exeを生成する
- [x] `bun run desktop:build` がinstallerを生成する
- [x] READMEにBeta・検証用・非推奨警告がある
- [x] Windows向けinstaller/updater CIがある

## Known Limitations

- Electron/Chromiumの基礎サイズにより、installerは軽量WebView製品より大きい。
- コード署名証明書と公開Updater URLは未設定。未署名Betaの一般配布は推奨しない。
- 実LINEへの送信テストは行わない。
