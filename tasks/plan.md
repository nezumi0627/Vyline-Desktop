# Vyline Desktop Windows Beta — WebView2 host release

## Overview

Desktop repo は WebView2 host と配布設定だけを所有する。リリース時に指定した Vyline repo/ref を取得し、その UI/backend/protocol を build workspace で組み立て、Windows x64 向けの検証用 Beta draft release を手動生成する。

## Architecture Decisions

- WebView2 host は通常1つのWebViewを表示し、ナビゲーションを自分のloopback originに限定する。
- backendはBun compileしたWindows sidecarとして起動し、UIと責務を分離する。
- WebView2 Evergreen Runtimeを利用し、固定版Runtimeを同梱せず配布サイズを抑える。
- Betaでは自動更新を行わず、Actionsの手動実行でdraft releaseを作る。
- Vyline の取得 ref は workflow_dispatch の入力で固定し、生成物に source repository/ref/sha を記録する。
- Desktop host はWebView2起動・loopback制限・sidecar監視だけを所有し、VylineのUI/backend/protocolをコピーして保守しない。
- Web版は loopback の `3001` を維持し、Desktop host は `127.0.0.1` の空き TCP ポートを OS から取得して backend と WebView2 に同じポートを渡す。固定 `3101` は採用しない。

## Acceptance Criteria

- [x] WebView2 hostのRelease buildが成功する
- [x] 本家Vyline renderer buildとWindows backend sidecar buildが成功する
- [x] READMEにBeta・検証用・非推奨警告がある
- [x] Windows向けWebView2 draft release CIがある
- [ ] Desktop repo のrelease workflowは手動実行だけでVyline refを取得できる
- [ ] releaseはdraftとしてportable ZIPを添付する（installerはhost動作確認後に追加）
- [ ] Vyline の変更は Desktop repo の backend/protocol コピーを必要としない
- [ ] source ref/sha とWebView2 hostの適用結果をrelease artifactに記録する

## Known Limitations

- WebView2 Evergreen Runtimeが未導入の環境では、別途Runtime導入が必要になる。
- コード署名証明書とinstaller/updaterは未設定。未署名Betaの一般配布は推奨しない。
- 実LINEへの送信テストは行わない。
