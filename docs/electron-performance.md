# Electron / Windows 軽量化方針

## 採用判断

ElectronはChromiumとNode.jsをアプリへ同梱するため、Tauriより基礎消費量は大きい。一方、Vylineの既存React/Vite/Bun資産、Windowsでの配布、Tray・Updater・Node互換性を優先し、Electronを採用する。

## 実装した対策

1. BrowserWindowを通常1つだけ生成する。
2. `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`を有効にする。
3. main processで同期I/Oを避け、backendを別プロセスとして起動する。
4. backendの準備を`/healthz`で確認してからUIを表示する。
5. 不要なApplication Menuを無効にする。
6. ViteでRendererをbundleし、ASARで配布する。
7. 自動更新確認は起動直後に強制せず、Betaの更新URLが設定された場合だけ行う。

## 検証項目

- 起動直後、アイドル時、チャット表示時、画像表示時のCPU
- Electron全プロセス合計のPrivate Working Set
- backend停止時のUI挙動
- installer初回起動、アンインストール、portable起動
- updaterの署名検証とロールバック手順

数値目標は実機計測後に設定する。環境差が大きいため、根拠のない固定値を「保証値」として宣言しない。

## 参照

- Electron Performance: https://www.electronjs.org/docs/latest/tutorial/performance
- Electron Process Model: https://www.electronjs.org/docs/latest/tutorial/process-model
- Electron Process Sandboxing: https://www.electronjs.org/docs/latest/tutorial/sandbox
- Electron Updating Applications: https://www.electronjs.org/docs/latest/tutorial/updates
