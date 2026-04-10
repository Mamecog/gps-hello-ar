// ============================================================
//  app.js  –  GPS Hello AR
//  AR.js (location-based) + A-Frame + 方向矢印
// ============================================================

// ============================================================
//  満月テクスチャを Canvas で生成
// ============================================================
function createBubbleDataURL(_text) {
  const S   = 1024
  const CX  = S / 2, CY = S / 2
  const R   = 460    // 月の半径

  const canvas = document.createElement('canvas')
  canvas.width  = S
  canvas.height = S
  const ctx = canvas.getContext('2d')

  // --- 外側のグロー ---
  const glow = ctx.createRadialGradient(CX, CY, R * 0.85, CX, CY, R * 1.1)
  glow.addColorStop(0, 'rgba(255,240,160,0.55)')
  glow.addColorStop(1, 'rgba(255,240,160,0)')
  ctx.beginPath()
  ctx.arc(CX, CY, R * 1.1, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()

  // --- 月本体（放射グラデーション）---
  const moon = ctx.createRadialGradient(CX - R * 0.25, CY - R * 0.25, R * 0.05, CX, CY, R)
  moon.addColorStop(0.0, '#fffde8')
  moon.addColorStop(0.4, '#fff5b0')
  moon.addColorStop(0.75, '#f5d96b')
  moon.addColorStop(1.0,  '#c8a830')
  ctx.beginPath()
  ctx.arc(CX, CY, R, 0, Math.PI * 2)
  ctx.fillStyle = moon
  ctx.fill()

  // --- クレーター ---
  const craters = [
    { x: CX - 120, y: CY - 140, r: 55, dark: 0.10 },
    { x: CX + 160, y: CY - 60,  r: 40, dark: 0.08 },
    { x: CX - 60,  y: CY + 180, r: 70, dark: 0.09 },
    { x: CX + 100, y: CY + 130, r: 30, dark: 0.07 },
    { x: CX + 30,  y: CY - 220, r: 35, dark: 0.06 },
    { x: CX - 220, y: CY + 60,  r: 45, dark: 0.08 },
  ]
  for (const c of craters) {
    const cg = ctx.createRadialGradient(c.x - c.r * 0.2, c.y - c.r * 0.2, c.r * 0.1, c.x, c.y, c.r)
    cg.addColorStop(0, `rgba(180,140,40,${c.dark * 0.4})`)
    cg.addColorStop(0.6, `rgba(140,100,20,${c.dark})`)
    cg.addColorStop(1,   `rgba(200,170,80,${c.dark * 0.3})`)
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
    ctx.fillStyle = cg
    ctx.fill()
  }

  // --- 月面の模様（海）---
  ctx.globalAlpha = 0.13
  ctx.fillStyle = '#8b6914'
  ctx.beginPath(); ctx.ellipse(CX - 80, CY + 80, 130, 90, -0.3, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(CX + 100, CY - 100, 80, 60, 0.5, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1.0

  // --- 月の縁を軽くシャドウでなじませる ---
  const edge = ctx.createRadialGradient(CX, CY, R * 0.82, CX, CY, R)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.22)')
  ctx.beginPath()
  ctx.arc(CX, CY, R, 0, Math.PI * 2)
  ctx.fillStyle = edge
  ctx.fill()

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

let lastBeta = 90  // デフォルト縦持ち

function onOrientation(e) {
  if (e.webkitCompassHeading != null) {
    deviceHeading = e.webkitCompassHeading
  } else if (e.alpha != null) {
    deviceHeading = (360 - e.alpha) % 360
  }
  if (e.beta != null) lastBeta = e.beta
  updateArrow()

  // カメラ回転（YXZ順）
  if (deviceHeading !== null) {
    const cam = document.querySelector('a-camera')
    if (!cam) return
    const obj = cam.object3D
    obj.rotation.order = 'YXZ'
    obj.rotation.y = -deviceHeading * Math.PI / 180
    obj.rotation.x = (90 - lastBeta) * Math.PI / 180
    obj.rotation.z = 0
  }

  // コンパスが更新されるたびにエンティティ位置も更新
  updateEntityPositions()
}

// ============================================================
//  AR エンティティ（カメラ子要素 + GPS×コンパスで相対座標）
// ============================================================
const arEntities = []   // { el, targetLat, targetLon }
let positionFixed = false
let lastUserLat = null, lastUserLon = null

const createAREntities = () => {
  const LAT_PER_M = 1 / 111000
  const LON_PER_M = 1 / (111000 * Math.cos(CONFIG.latitude * Math.PI / 180))
  const cam = document.querySelector('a-camera')  // ← カメラの子要素にする
  const COLS = 4, ROWS = 10

  const HEIGHTS = []
  for (let h = -10; h <= 10; h++) {
    const y = 2 + h * 2
    if (y >= 0) HEIGHTS.push(y)
  }

  let num = 1
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dx = (c - (COLS - 1) / 2) * 2
      const dy = (r - (ROWS - 1) / 2) * 2
      const targetLat = CONFIG.latitude + dy * LAT_PER_M
      const targetLon = CONFIG.longitude + dx * LON_PER_M

      const entity = document.createElement('a-entity')

      HEIGHTS.forEach((y, hi) => {
        const sphere = document.createElement('a-sphere')
        sphere.setAttribute('radius', '1.5')
        sphere.setAttribute('color', '#f5d96b')
        sphere.setAttribute('material', 'shader: flat; side: double')
        sphere.setAttribute('position', `0 ${y} 0`)

        if (hi === HEIGHTS.length - 1) {
          const label = document.createElement('a-text')
          label.setAttribute('value', String(num))
          label.setAttribute('position', `0 ${y + 0.6} 0`)
          label.setAttribute('align', 'center')
          label.setAttribute('color', 'white')
          label.setAttribute('width', '4')
          label.setAttribute('wrap-count', '3')
          entity.appendChild(label)
        }
        entity.appendChild(sphere)
      })

      cam.appendChild(entity)
      arEntities.push({ el: entity, targetLat, targetLon })
      num++
    }
  }
}

// タップ: エンティティをワールド座標に固定
function fixEntitiesToWorld() {
  const scene = document.querySelector('a-scene')
  const cam   = document.querySelector('a-camera')
  const V3    = new AFRAME.THREE.Vector3()

  arEntities.forEach(({ el }) => {
    el.object3D.getWorldPosition(V3)   // 現在のワールド座標を取得
    cam.removeChild(el)
    scene.appendChild(el)
    el.object3D.position.copy(V3)      // ワールド座標で配置
    el.object3D.rotation.set(0, 0, 0)
  })

  positionFixed = true
  document.getElementById('hint').textContent = '📌 空間に固定（再タップで解除）'
}

// 解除: エンティティを再びカメラ子要素に戻す
function unfixEntities() {
  const scene = document.querySelector('a-scene')
  const cam   = document.querySelector('a-camera')

  arEntities.forEach(({ el }) => {
    scene.removeChild(el)
    cam.appendChild(el)
  })

  positionFixed = false
  document.getElementById('hint').textContent = '▶ コンテンツを探しています...'
  updateEntityPositions()   // 現在位置で再計算
}

// エンティティ位置をカメラ相対座標で更新
// ・カメラの子要素なので、コンパス方位を使って「world → camera-local」に変換する
// ・これにより「向いた方向に球が現れる」動作になる
function updateEntityPositions(userLat, userLon) {
  // 引数があればlastを更新、なければlastを使う
  if (userLat !== undefined) { lastUserLat = userLat; lastUserLon = userLon }
  if (!lastUserLat || deviceHeading === null || positionFixed) return

  const theta  = deviceHeading * Math.PI / 180
  const cosT   = Math.cos(theta)
  const sinT   = Math.sin(theta)
  const cosLat = Math.cos(lastUserLat * Math.PI / 180)

  arEntities.forEach(({ el, targetLat, targetLon }) => {
    const east  = (targetLon - lastUserLon) * 111000 * cosLat
    const north = (targetLat - lastUserLat) * 111000

    // world オフセットをカメラローカル座標に回転
    // （カメラが heading=θ を向いているので R_y(θ) の逆変換）
    const x =  east * cosT - north * sinT
    const z = -east * sinT - north * cosT

    el.object3D.position.set(x, -1.6, z)  // Y=-1.6: カメラ高さ1.6mから地面へのオフセット
  })
}

// ============================================================
//  メイン初期化
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  // コンパス開始（オーバーレイで許可済み）
  startCompass()

  // canvasタップで空間に固定 / 解除
  document.querySelector('a-scene').addEventListener('click', () => {
    if (arEntities.length === 0) return
    if (!positionFixed) {
      fixEntitiesToWorld()
    } else {
      unfixEntities()
    }
  })

  const scene = document.querySelector('a-scene')
  if (scene.hasLoaded) {
    createAREntities()
  } else {
    scene.addEventListener('loaded', createAREntities)
  }

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

  let posCount = 0
  navigator.geolocation.watchPosition(
    pos => {
      clearTimeout(gpsTimeout)
      posCount++
      const { latitude, longitude, accuracy } = pos.coords
      const dist = calcDistance(latitude, longitude, CONFIG.latitude, CONFIG.longitude)
      updateUI(dist)

      // エンティティ位置を更新（latlon引数あり）
      updateEntityPositions(latitude, longitude)

      // 固定前のヒント
      if (!positionFixed) {
        const hint = document.getElementById('hint')
        if (hint.textContent === 'GPS を取得中...') {
          hint.textContent = '矢印の方向を向いてタップして固定'
        }
      }

      // デバッグ表示
      const dbg = document.getElementById('debug-panel')
      if (dbg) {
        // 最近傍エンティティのカメラローカル距離
        let nearestDist = Infinity
        arEntities.forEach(({ el }) => {
          const p = el.object3D.position
          const d = Math.sqrt(p.x * p.x + p.z * p.z)
          if (d < nearestDist) nearestDist = d
        })
        const nearStr = nearestDist === Infinity ? '-' : nearestDist.toFixed(1) + 'm'
        dbg.innerHTML =
          `${VERSION} | 現在地: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br>` +
          `精度: ±${Math.round(accuracy)}m　更新: ${posCount}回<br>` +
          `最近エンティティ: ${nearStr} | heading: ${deviceHeading !== null ? Math.round(deviceHeading) + '°' : '-'}`
      }

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
      const errText = msg[err.code] || 'GPS エラー'
      document.getElementById('hint').textContent = errText
      const dbg = document.getElementById('debug-panel')
      if (dbg) dbg.innerHTML = `❌ GPSエラー code:${err.code}<br>${err.message}`
      console.warn('GPS error:', err)
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  )
})
