# Vyline PR動画をTellaで仕上げる

`/pr-demo` は、Vyline本体と同じ `ChatShell` / `Sidebar` / `ChatArea` /
`MessageInput` / `SettingsSections` を、個人情報のない仮データで表示する撮影専用モードです。
`accountId` は常に `null` で、デモ中の送信もローカルストアにだけ追加されます。
実際のPR動画は、この画面をPlaywrightで操作し、OpenScreenでウィンドウ録画する `pr:video` を使います。

## 1. 素材を自動生成

```powershell
cd E:\projects\Vyline\Vyline\apps\desktop
# OpenScreen v1.10.0 をインストール済みの場合
$env:OPENSCREEN_BIN = "C:\Users\<ユーザー名>\AppData\Local\Programs\Openscreen\Openscreen.exe"
bun run pr:video
```

生成物:

- `recordings/openscreen/vyline-01-*.openscreen` 〜 `vyline-29-*.openscreen` — 再編集できるOpenScreenプロジェクト
- `recordings/openscreen/vyline-01-*.mp4` 〜 `vyline-29-*.mp4` — 1408×792 / H.264 High / 60fpsの短編
- `recordings/openscreen/vyline-01-*.srt` 〜 `vyline-29-*.srt` — Tellaや動画プレイヤーで再利用できる字幕

バックエンド、ログイン、LINEアカウントは不要です。録画時はローカルViteと仮データだけを使い、
Playwrightはlocalhost以外のURLを遮断します。実アカウントのチャット・名前・MID・画像は読み込みません。

29本は表示だけでなく、クリック、入力、送信、編集、状態遷移と結果表示まで実行します。

| # | シナリオ | 実際に行う操作 |
|---:|---|---|
| 01 | `chat-navigation` | チャット切替、カテゴリ、並び順 |
| 02 | `chat-search-send` | 検索、文字入力、メッセージ送信 |
| 03 | `reply` | 引用リプライ送信 |
| 04 | `reaction-readers` | リアクション追加、既読者表示 |
| 05 | `edit-message` | 送信済みメッセージ編集 |
| 06 | `revoke-restore` | 送信取消、ローカル復元 |
| 07 | `sticker-emoji` | スタンプ、LINE絵文字送信 |
| 08 | `combination-sticker` | 組み合わせスタンプ配置、送信 |
| 09 | `mention-muted-send` | メンション、ミュート送信 |
| 10 | `in-chat-search` | トーク内検索、前後移動 |
| 11 | `chat-management` | ピン、通知ミュート、非表示 |
| 12 | `profile-members` | チャット詳細、メンバー表示 |
| 13 | `media-gallery` | 画像、音声、ファイル、位置、Flex |
| 15 | `image-send` | 添付、プレビュー、画像送信、拡大 |
| 16 | `voice-recording` | 録音開始、キャンセル |
| 17 | `create-group` | 友だち選択、グループ作成 |
| 17–28 | `settings-*` / `ios-backup` | 全設定タブ、QR、同期/復元、ストレージ削除、ベータ同意、iOS復元進捗 |

実アカウントを使った動作確認が必要な場合だけ、個別に次を実行します。

```powershell
bun run pr:video:live
```

このコマンドは実データを表示し得るため、PR素材の作成には使用しないでください。

OpenScreenの録画対象を絞る場合:

```powershell
$env:VYLINE_PR_SCENARIOS = "chat-navigation,chat-search-send,sticker-emoji,settings-theme"
bun run pr:video
```

現在のシナリオIDを指定する例:

```powershell
$env:VYLINE_PR_SCENARIOS = "reply,image-send,settings-privacy,ios-backup"
bun run pr:video
```

録画せず、すべての導線と外部通信遮断だけを検証する場合:

```powershell
$env:VYLINE_PR_DRY_RUN = "1"
Remove-Item Env:VYLINE_PR_SCENARIOS -ErrorAction SilentlyContinue
bun run pr:video
```

## 2. Tellaへアップロード

Tellaで `Upload existing videos` を選び、MP4をアップロードします。MP4がない場合はWebMを試し、必要ならTella側で書き出します。

推奨設定:

- Layout: Screen recordingを主役にするFull screenまたはSide-by-side
- Background: Vylineの青 (`#2AABEE`) と濃紺 (`#09111C`)
- Zoom: クリック位置が分かる程度に自動ズームを有効化
- Captions: ナレーションを録音した場合はTellaのTranscriptから自動字幕を生成
- Export: 16:9、HDまたは4K、60fps

字幕を音声なしで確実に出す場合は、画面左側に表示されるシーン字幕をそのまま残します。ナレーションを録音する場合は、SRTの文面を読み上げるとTellaの自動字幕と一致します。

## 3. ドキュメントに動画を表示

Markdownから相対パスで短編を表示できます。例:

```html
<video controls preload="metadata" width="900">
  <source src="../../recordings/openscreen/vyline-02-chat-search-send.mp4" type="video/mp4">
</video>
```

機能説明の近くに対応する番号のMP4を置きます。GitHub Pages等へ公開する場合は、
`recordings/openscreen` を配信対象へコピーするか、Tellaへアップロードした埋め込みURLへ置き換えてください。

## 注意

このモードは実LINEの送信API、プロフィールAPI、スタンプAPI、サブデバイスAPIを呼びません。
スタンプと絵文字はリポジトリ内のデモSVGを使用します。したがってネットワーク状態や
個人アカウントの内容に左右されず、PR素材に個人情報が混入しません。
