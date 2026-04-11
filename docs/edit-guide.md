# 改修ガイド

## ハートの絵文字を変えたい

`index.html` 内の `ctx.fillText('❤️', ...)` を探す（2箇所ある）。
好きな絵文字に変えるだけでよい。

```js
ctx.fillText('⭐', ...)   // 星に変える例
```

---

## ハートのサイズを変えたい

顔の幅に対する比率で決まる。

```js
// 固定ハート（顔の上）
const size = Math.round(width * 0.6)   // 0.6 → 大きくするなら 0.9 など

// パーティクル
size: faceW * (0.18 + Math.random() * 0.18)   // 0.18〜0.36 の範囲
```

---

## パーティクルの動きを変えたい

`spawnHearts()` 関数を編集する。

```js
{
  vx: (Math.random() - 0.5) * 1.8,    // 横方向の速さ（大きくすると広がる）
  vy: -(1.8 + Math.random() * 2.5),   // 上方向の速さ（マイナスが上）
  size: faceW * (0.18 + ...),         // サイズ
  life: 1.0,                          // 寿命（1.0スタート、0で消える）
}
```

消えるまでの時間は `renderLoop` 内の `p.life -= 0.017` で調整（大きくすると速く消える）。

パーティクルの個数は `spawnHearts()` 内:
```js
const n = 2 + Math.floor(Math.random() * 3)   // 2〜4個 → 増やすなら上限を上げる
```

---

## 顔検出の感度を変えたい

```js
const DET_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,          // 検出解像度（128/160/224/320/416/512/608）大きいほど精度高く重い
  scoreThreshold: 0.45,   // 検出しきい値（低くすると検出しやすいが誤検知増）
})
```

暗い環境・小さい顔で検出しない → `scoreThreshold` を `0.3` まで下げてみる。

---

## カメラをリアカメラに変えたい

```js
// getUserMedia の facingMode を変える
video: { facingMode: 'environment', ... }  // 'user'=インカメ、'environment'=リアカメ
```

あわせて鏡像反転も外す（リアカメラでは不要）:
```css
/* 以下2箇所の transform を削除 */
#video  { transform: scaleX(-1); }
#overlay { transform: scaleX(-1); }
```

---

## 背景・UIの色を変えたい

`<style>` ブロック内のCSSを編集する。

- 起動ボタンの色: `#start-btn { background: #ff4d80; }`
- ステータステキストの背景: `#status { background: rgba(0,0,0,0.72); }`
- 画面背景色: `body { background: #000; }`

---

## 検出速度を変えたい

```js
await new Promise(r => setTimeout(r, 66))   // 66ms = 約15fps
// 33 にすれば約30fps（CPU負荷増）
// 100 にすれば約10fps（軽量化）
```

---

## デプロイ先を変えたい

静的ファイルのみなので、HTTPS対応の静的ホスティングならどこでも動く。

- **Netlify**: リポジトリを接続してDeploy
- **Vercel**: `vercel deploy` コマンド
- **Cloudflare Pages**: リポジトリを接続

注意: **カメラAPIはHTTPS必須**。HTTPサーバーでは動かない。

GitHub Pagesのリポジトリ名を変えた場合は `Settings → Pages → Source` を再設定するだけでよい。
HTMLファイル内はすべて相対パス（`./models`）のため変更不要。

---

## モデルを差し替えたい

face-api.js には他のモデルも用意されている。
差し替える場合はモデルファイルを `models/` に配置して、
`loadFromUri` と `detectAllFaces` の第2引数のOptionsクラスを変更する。

例: SsdMobilenetV1（より精度が高いが重い）
```js
await faceapi.nets.ssdMobilenetv1.loadFromUri('./models')
const dets = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
```

モデルファイルは以下から取得できる:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights
