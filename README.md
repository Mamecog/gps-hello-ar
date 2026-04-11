# 顔AR ❤️ — Face Detection Heart AR

インカメラで顔を検出し、頭の上にハートを表示するWebARアプリ。
サーバー不要・インストール不要。スマホのブラウザだけで動作。

## デモ

https://mamecog.github.io/gps-hello-ar/

## 使い方

1. スマホのブラウザでURLを開く
2. 「タップして開始」をタップ
3. カメラ許可ダイアログで「許可」
4. インカメに顔を向けると ❤️ が出現

## ローカルで動かす

カメラAPIはHTTPS必須。ローカルではngrokを使う。

```bash
npx serve .
# 別ターミナルで
ngrok http 3000
# → 発行された https://xxxx.ngrok.io をスマホで開く
```

## デプロイ手順

1. このリポジトリをGitHubにpush
2. GitHub → Settings → Pages → Source: main / root
3. 数分後に `https://<username>.github.io/<repo>/` で公開

## ディレクトリ構成

```
/
├── index.html        # アプリ本体（HTML + CSS + JS 一体）
└── models/
    ├── tiny_face_detector_model-shard1               # MLモデル重みファイル（189KB）
    └── tiny_face_detector_model-weights_manifest.json
```

## 使用技術

| 技術 | バージョン | 用途 |
|---|---|---|
| face-api.js | 0.22.2 | ブラウザ内顔検出MLライブラリ（CDN） |
| TinyFaceDetector | - | 軽量顔検出モデル（models/ に同梱） |
| Canvas 2D API | - | ハート描画・パーティクル |
| getUserMedia API | - | インカメラ映像取得 |
| GitHub Pages | - | 静的ホスティング（HTTPS） |

## よくあるトラブル

**画面が真っ暗になる**
iOSはタップのユーザージェスチャー直後にカメラを起動する必要がある。
ページをリロードして「タップして開始」を押しなおす。

**「failed to fetch」エラー**
`models/` フォルダが GitHub Pages に反映されていない可能性がある。
`git status` で `models/` が追跡されているか確認する。

**カメラが起動しない**
HTTPSでない環境では `getUserMedia` が動かない。
ローカル開発時は ngrok を使う。

**顔を検出しない（Android Chrome など）**
`index.html` 内の `scoreThreshold: 0.45` を `0.35` 程度に下げる。
