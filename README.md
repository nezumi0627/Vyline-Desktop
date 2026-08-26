# Vyline Desktop (Beta)

> [!WARNING]
> **検証用のBeta版です。一般利用・本番利用は推奨しません。**
> LINEのアカウント、トーク履歴、E2EE鍵、送受信データを扱います。必ずバックアップを取り、自己責任で使用してください。

Vyline Desktopは、Vylineを引き継いだ **Windows専用の検証用LINEクライアント**です。
React + Viteの既存UI、Bun + Honoのバックエンド、`@vyline/protocol`を活用し、ElectronでWindows向け`.exe`として配布します。

## 対象

- Windows x64
- installer: `Vyline-Desktop-*-setup.exe`
- portable: portable executable
- 更新: Betaでは更新機能を搭載していますが、配信URL・署名・公開運用が整うまで自動更新は無効です

## 開発

```powershell
bun install
bun run dev
bun run desktop:dev
```

Windows配布物を作成する場合:

```powershell
bun run desktop:sidecar
bun run desktop:build
```

`release/` にinstallerとportable版が生成されます。`desktop:sidecar`はバックエンドを単一のWindows実行ファイルへコンパイルします。

## 低負荷設計

- Chromiumの追加ウィンドウを作らず、メインWindowを1つに限定
- main processで同期I/Oを行わない
- backendは起動時に1プロセスだけ起動し、終了時に確実に停止
- backendが準備できるまでUIを表示せず、不要なリトライを避ける
- `contextIsolation`、`sandbox`、`nodeIntegration: false`を有効化
- React側は既存の仮想リスト・遅延同期を利用
- 不要なElectronメニューを生成しない
- packaged appはASAR化し、不要な解析データ・開発依存物を配布しない

Electron公式の性能指針に従い、起動直後の処理、同期I/O、不要な依存、Rendererの過剰処理を継続的にプロファイルします。

## セキュリティとデータ

秘密鍵、トークン、セッション、`Vyline/backend/data/`はコミットしません。実グループ・実友だちへの送信テストは禁止です。送信テストはVyline本体のAGENTS.mdに定めるテスト対象だけを使用してください。

## 状態

このrepoはVyline Desktop Betaの実験用forkです。互換性、データ保持、更新、ログイン継続性を保証しません。問題を報告する際は、OS、Betaバージョン、再現手順、ログから秘密情報を除いたものを添えてください。

## 引き継ぎ元

- [Vyline](https://github.com/nezumi0627/vyline)
- プロトコル、E2EE、BFF、キャッシュ、バックアップ、メディア処理の実装を引き継ぎます
