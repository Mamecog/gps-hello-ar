# 処理フロー

## 初期化からAR表示まで

### 1. ページロード
- `index.html` が読み込まれる
- CDN から `face-api.js` を取得・実行
- 起動オーバーレイ（`#start-overlay`）が全画面表示
- JS はスタンバイ状態で待機

### 2. ユーザーがタップ（`#start-btn` click）
- `init()` 関数が呼ばれる
- オーバーレイを非表示（`display: none`）

### 3. カメラ起動（iOSジェスチャー対応）
- `navigator.mediaDevices.getUserMedia({ facingMode: 'user' })` を呼ぶ
- **タップ直後に呼ぶことが重要** — iOSはジェスチャーコンテキストが失効すると拒否する
- 許可されれば `video.srcObject = stream` でインカメ映像を流す
- `video.play()` を呼ぶ（`await` しない — ジェスチャー消費を避けるため）

### 4. モデル読み込み（カメラと並行）
- `faceapi.nets.tinyFaceDetector.loadFromUri('./models')` で重みを取得
- `models/tiny_face_detector_model-weights_manifest.json` を最初に読み込む
- 記載パスの `tiny_face_detector_model-shard1` を取得して推論エンジン初期化

### 5. canvas 寸法の同期
- `video.oncanplay` 待機後、`overlay.width/height = video.videoWidth/Height`
- これにより顔座標と描画座標が一致する

### 6. ループ起動
- `renderLoop()` → `requestAnimationFrame` で 60fps 描画開始
- `detectLoop()` → `async while(true)` で 15fps 検出開始

---

## 顔検出ループ（15fps）

```
while(true)
  ↓
  video.readyState >= 2 を確認
  ↓
  faceapi.detectAllFaces(video, TinyFaceDetectorOptions)
  → bounding box 配列（{ x, y, width, height }）
  ↓
  faceapi.resizeResults(dets, { width: overlay.width, height: overlay.height })
  → canvas サイズに座標スケール変換
  ↓
  latestDets = 変換後の検出結果
  ↓
  350ms 経過 かつ 顔あり → spawnHearts() でパーティクル生成
  ↓
  66ms sleep（次フレームへ）
```

## 描画ループ（60fps）

```
requestAnimationFrame
  ↓
  canvas 全体クリア
  ↓
  latestDets をループ
    → 各顔の bounding box 上部に ❤️ を描画
    → サイズ = width × 0.6（顔の大きさに比例）
  ↓
  particles[] をループ（末尾から走査）
    → x += vx, y += vy（上方向に移動）
    → life -= 0.017（約60フレームで消滅）
    → life <= 0 → splice で削除
    → globalAlpha = life × 0.85（徐々に透明に）
    → ❤️ を描画
  ↓
  次フレームへ
```

## ユーザー操作フロー

```
スマホを持つ → 顔をカメラに向ける
  → detectLoop が顔を検出
  → latestDets に座標セット
  → renderLoop が顔の上に ❤️ を描画
  → 350ms 毎にパーティクル生成
  → パーティクルが上へ浮かんで消える
```

## エラー時の挙動

| エラー | 原因 | 表示 |
|---|---|---|
| カメラ拒否（NotAllowedError） | ユーザーが許可しなかった | 画面中央に赤オーバーレイでエラーメッセージ |
| モデル取得失敗（Failed to fetch） | `models/` フォルダがない・ネット切れ | 同上 |
| カメラ非対応（NotFoundError） | インカメなし | 同上 |
| detectLoop 内のエラー | 推論失敗など | `catch(_) {}` で無視してループ継続 |
