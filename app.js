// ============================================================
//  app.js  –  GPS Hello AR
//  AR.js (location-based) + A-Frame + 方向矢印
// ============================================================

// ============================================================
//  吹き出しテクスチャを Canvas で生成
// ============================================================
function createBubbleDataURL(text) {
  const W = 1024, H = 640
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const R      = 70
  const PTR    = 90
  const BODY_H = 460

  ctx.shadowColor   = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur    = 18
  ctx.shadowOffsetY = 6

  ctx.beginPath()
  ctx.moveTo(R, 0)
  ctx.lineTo(W - R, 0)
  ctx.quadraticCurveTo(W, 0, W, R)
  ctx.lineTo(W, BODY_H - R)
  ctx.quadraticCurveTo(W, BODY_H, W - R, BODY_H)
  ctx.lineTo(W / 2 + PTR, BODY_H)
  ctx.lineTo(W / 2, H)
  ctx.lineTo(W / 2 - PTR, BODY_H)
  ctx.lineTo(R, BODY_H)
  ctx.quadraticCurveTo(0, BODY_H, 0, BODY_H - R)
  ctx.lineTo(0, R)
  ctx.quadraticCurveTo(0, 0, R, 0)
  ctx.closePath()

  const grad = ctx.createLinearGradient(0, 0, 0, BODY_H)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(1, '#e8f4ff')
  ctx.fillStyle = grad
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = '#4aa8ff'
  ctx.lineWidth   = 6
  ctx.stroke()

  ctx.fillStyle    = '#1a1a2e'
  ctx.font         = 'bold 220px Arial, sans-serif'
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
//  方位角計算（現在地 → 目的地、度数法、北=0、時計回り）
// ============================================================
function calcBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const lat1R = lat1 * Math.PI / 180
  const lat2R = lat2 * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2R)
  const x = Math.cos(lat1R) * Math.sin(lat2R)
            - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

// ============================================================
//  方向矢印を更新
// ============================================================
let currentBearing = null   // 目的地への方位角
let deviceHeading  = null   // デバイスのコンパス方位

function updateArrow() {
  if (currentBearing === null || deviceHeading === null) return
  // 矢印の回転 = 目的地方位 - 端末方位
  const angle = (currentBearing - deviceHeading + 360) % 360
  document.getElementById('arrow-svg').style.transform = `rotate(${angle}deg)`
  document.getElementById('direction-indicator').classList.add('visible')
}

// ============================================================
//  UI 更新
// ============================================================
function updateUI(distMeters) {
  const hint  = document.getElementById('hint')
  const badge = document.getElementById('distance-badge')

  badge.textContent = `📍 ${Math.round(distMeters)} m`

  if (distMeters <= CONFIG.arrivedThreshold) {
    hint.textContent = '🎉 到着！カメラを向けてください'
  } else if (distMeters < 200) {
    hint.textContent = `もうすぐ！あと約 ${Math.round(distMeters)} m`
  } else {
    hint.textContent = `目的地まで約 ${Math.round(distMeters)} m`
  }
}

// ============================================================
//  コンパス（DeviceOrientationEvent）セットアップ
// ============================================================
function startCompass() {
  window.addEventListener('deviceorientationabsolute', onOrientation, true)
  window.addEventListener('deviceorientation', onOrientation, true)
}

function onOrientation(e) {
  // iOS: webkitCompassHeading（北=0、時計回り）
  // Android absolute: 360 - alpha（補正して北=0、時計回りに変換）
  if (e.webkitCompassHeading != null) {
    deviceHeading = e.webkitCompassHeading
  } else if (e.absolute && e.alpha != null) {
    deviceHeading = (360 - e.alpha) % 360
  } else if (e.alpha != null) {
    deviceHeading = (360 - e.alpha) % 360
  }
  updateArrow()
}

function requestCompassPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    // iOS 13+ はユーザー操作から許可が必要
    const btn = document.getElementById('compass-btn')
    btn.style.display = 'block'
    btn.addEventListener('click', () => {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === 'granted') {
          startCompass()
          btn.style.display = 'none'
        }
      }).catch(console.warn)
    })
  } else {
    // Android / 古いiOS は許可不要
    startCompass()
  }
}

// ============================================================
//  メイン初期化
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  // 吹き出し画像をセット
  const img = document.getElementById('bubble-img')
  img.src   = createBubbleDataURL(CONFIG.label)

  // GPS座標をセット
  const place = document.getElementById('ar-place')
  place.setAttribute('gps-entity-place',
    `latitude: ${CONFIG.latitude}; longitude: ${CONFIG.longitude}`)

  // コンパス開始
  requestCompassPermission()

  // GPS 取得
  if (!navigator.geolocation) {
    document.getElementById('hint').textContent = 'このブラウザはGPS非対応です'
    return
  }

  const gpsTimeout = setTimeout(() => {
    const hint = document.getElementById('hint')
    if (hint.textContent === 'GPS を取得中...') {
      hint.textContent = '⚙ 設定 → Safari → 位置情報 → 許可 を確認してください'
    }
  }, 10000)

  navigator.geolocation.watchPosition(
    pos => {
      clearTimeout(gpsTimeout)
      const { latitude, longitude } = pos.coords
      const dist = calcDistance(latitude, longitude, CONFIG.latitude, CONFIG.longitude)
      updateUI(dist)

      // 方位角を更新
      currentBearing = calcBearing(latitude, longitude, CONFIG.latitude, CONFIG.longitude)
      updateArrow()
    },
    err => {
      clearTimeout(gpsTimeout)
      const msg = {
        1: '⚙ 設定 → Safari → 位置情報 → 許可 を確認してください',
        2: 'GPS シグナルが弱いです。屋外に出てください',
        3: 'GPS タイムアウト。再読み込みしてください',
      }
      document.getElementById('hint').textContent = msg[err.code] || 'GPS エラー'
      console.warn('GPS error:', err)
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  )
})
