# vyline-theme

Vyline のテーマ（VyTheme）プリセット集です。

`@vyline/themes` パッケージとして `THEME_PRESETS` と `VyTheme` 型を提供し、Vyline 本体はこれを読み込むだけ。テーマの追加・変更はこのリポジトリで行います。

## テーマの追加

1. `src/index.ts` の `THEME_PRESETS` にエントリを追加
2. 必須トークン: `id`, `name`, `accent`, `accentContrast`, `bg`, `surface`, `surface2`, `sidebar`, `text`, `textDim`, `border`, `msgIn`, `msgOut`, `msgInText`, `msgOutText`, `radius`, `chatBg`, `pattern`

## ライセンス

MIT
