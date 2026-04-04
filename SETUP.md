# GPS Hello AR – セットアップガイド

スキャン不要。GPS座標を指定するだけで、その場所に「Hello」の吹き出しARが表示されます。

---

## GPS座標の設定方法

`config.js` を開いて座標を書き換えるだけです。

```js
const CONFIG = {
  latitude:  35.6812,   // ← 緯度
  longitude: 139.7671,  // ← 経度
  label: 'Hello!',      // ← 表示テキスト
}
```

**Google マップでの座標取得：**
1. Google マップを開く
2. 表示したい場所を**長押し**
3. 上部に `35.xxxx, 139.xxxx` と表示される → コピー

---

## 使い方

1. スマートフォンで GitHub Pages の URL を開く
2. カメラとGPSを許可する
3. 設定した場所へ移動
4. カメラを向けると「Hello!」の吹き出しが浮かぶ

---

## ローカルで動かす（HTTPS必須）

```bash
# mkcert がある場合
npx serve . --ssl-cert localhost+1.pem --ssl-key localhost+1-key.pem
```

---

## GitHub Pages でデプロイ

1. GitHubにpush
2. Settings → Pages → Source: `main` / `/ (root)`
3. `https://<username>.github.io/<repo>/` でアクセス

---

## 技術スタック

| ライブラリ | 用途 |
|---|---|
| [A-Frame](https://aframe.io) | 3D/ARシーン |
| [AR.js (location-based)](https://ar-js-org.github.io/AR.js-Docs/) | GPS連動ARトラッキング |
| Canvas API | 吹き出しテクスチャ生成 |

**8th Wall 不要・スキャン不要・CDN のみで動作**
