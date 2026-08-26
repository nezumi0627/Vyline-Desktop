# vyline-plugin

Vyline プラグイン基盤。プラグイン SDK（`@vyline/plugin-sdk`）とサンプルプラグインを提供します。

## 構成

```
├── sdk/                 @vyline/plugin-sdk — 型定義と definePlugin
└── examples/            サンプルプラグイン
    ├── example-plugin/  最小構成のサンプル
    ├── message-logger/  受信メッセージのログ記録
    └── settings-demo/   プラグイン設定ストレージのデモ
```

## プラグインの作り方

```bash
bun add @vyline/plugin-sdk
```

```ts
import { definePlugin } from "@vyline/plugin-sdk";

export default definePlugin({
  id: "my-plugin",
  name: "My Plugin",
  version: "0.1.0",
  description: "...",
  permissions: ["messages:read"],

  activate(ctx) {
    ctx.messages.on("message", (message) => {
      ctx.logger.info(`received: ${message.id}`);
    });
  },

  deactivate() {},
});
```

`manifest.json`（id / name / version / permissions）を同じフォルダに置きます。

## インストール

1. プラグインフォルダごと `Vyline/backend/data/plugins/` にコピー
2. 設定 > API/プラグイン、または `POST /line/{accountId}/plugins/{pluginId}/enable` で有効化

## 設計方針

- プラグインはコアコードを変更せず拡張だけを行う
- 権限は明示宣言し、アカウントスコープで実行される
- 無効化されたプラグインのランタイムコストはほぼゼロ
- クラッシュしたプラグインが Vyline 本体を落とさない

## ライセンス

MIT
