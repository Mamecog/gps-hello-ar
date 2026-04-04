// ============================================================
//  app.js  –  GPS Hello AR
//  AR.js (location-based) + A-Frame
// ============================================================

// ============================================================
//  吹き出しテクスチャを Canvas で生成
// ============================================================
function createBubbleDataURL(text) {
  const W = 512, H = 320
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const R      = 40    // 角丸半径
  const PTR    = 50    // 下向き三角の幅
  const BODY_H = 230   // 本体の高さ

  // ドロップシャドウ
  ctx.shadowColor   = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur    = 18
  ctx.shadowOffsetY = 6

  // 吹き出し本体（角丸矩形 + 下向き三角）
  ctx.beginPath()
  ctx.moveTo(R, 0)
  ctx.lineTo(W - R, 0)
  ctx.quadraticCurveTo(W, 0, W, R)
  ctx.lineTo(W, BODY_H - R)
  ctx.quadraticCurveTo(W, BODY_H, W - R, BODY_H)
  ctx.lineTo(W / 2 + PTR, BODY_H)
  ctx.lineTo(W / 2, H)            // 三角の頂点
  ctx.lineTo(W / 2 - PTR, BODY_H)
  ctx.lineTo(R, BODY_H)
  ctx.quadraticCurveTo(0, BODY_H, 0, BODY_H - R)
  ctx.lineTo(0, R)
  ctx.quadraticCurveTo(0, 0, R, 0)
  ctx.closePath()

  // 背景グラデーション
  const grad = ctx.createLinearGradient(0, 0, 0, BODY_H)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(1, '#e8f4ff')
  ctx.fillStyle = grad
  ctx.fill()

  // 枠線
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = '#4aa8ff'
  ctx.lineWidth   = 6
  ctx.stroke()

  // テキスト
  ctx.fillStyle    = '#1a1a2e'
  ctx.font         = 'bold 110px Arial, sans-serif'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, W / 2, BODY_H / 2)

  return canvas.toDataURL('image/png')
}

// ============================================================
//  Haversine 距離計算（メートル）
// ============================================================
function calcDistance(lat1, lon1, lat2, lon2) {
  const R    = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
              + Math.cos(lat1 * Math.PI / 180)
              * Math.cos(lat2 * Math.PI / 180)
              * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// ============================================================
//  UI 更新
// ============================================================
function updateUI(distMeters) {
  const hint  = document.getElementById('hint')
  const badge = document.getElementById('distance-badge')

  badge.textContent = `📍 ${Math.round(distMeters)} m`

  if (distMeters <= CONFIG.arrivedThreshold) {
    hint.textContent = '🎉 到着！ARを見てください'
  } else if (distMeters < 200) {
    hint.textContent = `もうすぐ！あと約 ${Math.round(distMeters)} m`
  } else {
    hint.textContent = `目的地まで約 ${Math.round(distMeters)} m`
  }
}

// ============================================================
//  メイン初期化
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  // 吹き出し画像をセット
  const img = document.getElementById('bubble-img')
  img.src   = createBubbleDataURL(CONFIG.label)

  // A-Frame シーンにGPS座標をセット
  const place = document.getElementById('ar-place')
  place.setAttribute('gps-entity-place',
    `latitude: ${CONFIG.latitude}; longitude: ${CONFIG.longitude}`)

  // GPS 監視
  if (!navigator.geolocation) {
    document.getElementById('hint').textContent = 'このブラウザはGPS非対応です'
    return
  }

  document.getElementById('hint').textContent = 'GPS を取得中...'

  navigator.geolocation.watchPosition(
    pos => {
      const dist = calcDistance(
        pos.coords.latitude, pos.coords.longitude,
        CONFIG.latitude, CONFIG.longitude
      )
      updateUI(dist)
    },
    err => {
      document.getElementById('hint').textContent = 'GPS の許可が必要です'
      console.warn('GPS error:', err)
    },
    { enableHighAccuracy: true, maximumAge: 3000 }
  )
})
