# アーキテクチャ

## システム構成

静的ファイルのみ。バックエンドサーバー・データベース・認証は一切不要。

```
ブラウザ（クライアント）
  ├── index.html（アプリ全体）
  ├── models/（ローカルMLモデル）
  └── CDN: face-api.js@0.22.2（jsDelivr）
```

## ファイルごとの責務

| ファイル | 責務 |
|---|---|
| `index.html` | UIレイアウト・スタイル・全JS処理を一ファイルに集約 |
| `models/tiny_face_detector_model-shard1` | TinyFaceDetectorの重みデータ本体（189KB） |
| `models/tiny_face_detector_model-weights_manifest.json` | 重みファイルのパス・量子化設定のメタ情報 |

## モジュール関係（index.html 内）

```
init()
 ├─ getUserMedia()           ← ブラウザ Camera API
 ├─ faceapi.nets.load()      ← face-api.js
 ├─ renderLoop()             ← Canvas 2D API（rAF 60fps）
 │    ├─ 固定ハート描画（latestDets を参照）
 │    └─ パーティクル更新・描画（particles[] を更新）
 └─ detectLoop()             ← face-api.js（async loop 15fps）
      ├─ faceapi.detectAllFaces()
      ├─ faceapi.resizeResults()   ← video/canvas 座標スケール変換
      ├─ latestDets[] に格納       ← renderLoop と共有
      └─ spawnHearts()             ← particles[] に追加

spawnHearts()
 └─ particles[] にパーティクルオブジェクトを push
     { x, y, vx, vy, size, life }
```

## 状態管理

グローバル変数で管理（フレームワーク不使用）:

| 変数 | 型 | 役割 |
|---|---|---|
| `latestDets` | Array | 最新の顔検出結果。detectLoop → renderLoop の橋渡し |
| `particles` | Array | 浮遊ハートのパーティクルリスト |

## XR表示の仕組み

このアプリはWebXR APIを使用していない。
ビデオパススルー + Canvas 重ね合わせによる疑似AR。

```
<video>  ← インカメ映像（鏡像表示）
<canvas> ← 同サイズで重ね、顔座標にハートを描画
```

両要素に `transform: scaleX(-1)` を適用し、鏡のように見せている。
顔の bounding box 座標も同じ反転が適用されているため、描画位置がずれることはない。

## 外部依存

| 依存 | 取得方法 | オフライン対応 |
|---|---|---|
| face-api.js | CDN（jsDelivr） | 不可（JSファイル自体はCDN） |
| TinyFaceDetectorモデル | ローカル（models/） | 可 |

face-api.js のJSライブラリ本体はCDNから取得するため初回はネット接続必須。
モデルファイルはリポジトリに同梱済みのためCDN不要。
