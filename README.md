# Vyline Desktop (Beta)

> [!WARNING]
> **検証用のBeta版です。一般利用・本番利用は推奨しません。**
> LINEのアカウント、トーク履歴、E2EE鍵、送受信データを扱います。必ずバックアップを取り、自己責任で使用してください。

Vyline Desktopは、Vylineを引き継いだ **Windows専用の検証用LINEクライアント**です。React + ViteのUI、Bun + Honoのbackend、`@vyline/protocol`をElectronで包み、Windows x64向け`.exe`として配布します。

## 対象

- Windows x64
- installer: `Vyline-Desktop-*-setup.exe`
- portable: `Vyline-Desktop-*-x64.exe`
- 更新: Betaでは更新APIを搭載していますが、配信URL・署名・公開運用が整うまで自動更新は無効です

## 開発

```powershell
bun install
bun run dev
bun run desktop:dev
```

Windows配布物:

```powershell
bun run desktop:sidecar
bun run desktop:build
```

`Vyline/apps/desktop/release/` にinstallerとportable版が生成されます。

## 低負荷設計

- BrowserWindowは通常1つだけ
- main processの同期I/Oを避ける
- Bun backendはsidecar 1プロセスとして起動・終了
- `contextIsolation`、`sandbox`、`nodeIntegration: false`
- 既存の仮想リスト・遅延同期を利用
- 不要なElectronメニューを生成しない
- Vite bundle + ASAR + 日本語/英語のみ同梱

## 重要な注意

秘密鍵、トークン、セッション、`Vyline/backend/data/`はコミットしません。実グループ・実友だちへの送信テストは禁止です。未署名Betaのため、Windows SmartScreen警告が出る可能性があります。

## 状態

このrepoはVyline Desktop Betaの実験用forkです。互換性、データ保持、更新、ログイン継続性を保証しません。

## 引き継ぎ元

- [Vyline](https://github.com/nezumi0627/vyline)
