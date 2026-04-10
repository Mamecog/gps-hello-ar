// ============================================================
//  app.js  –  GPS Hello AR  v1.8
//  カメラ向きを毎フレーム(tick)でコンパス値に上書きする方式
// ============================================================

// ============================================================
//  A-Frame コンポーネント: 毎フレームカメラ回転を強制セット
//  AR.js が tick 内でリセットしてくる場合も上書きできる
// ============================================================
AFRAME.registerComponent('compass-camera', {
  tick: function () {
    if (deviceHeading === null) return
    const obj = this.el.object3D
    obj.rotation.order = 'YXZ'
    obj.rotation.y = -deviceHeading * Math.PI / 180
    obj.rotation.x = (90 - lastBeta) * Math.PI / 180
    obj.rotation.z = 0
  }
})

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
let currentBearing = null
let deviceHeading  = null

function updateArrow() {
  if (currentBearing === null || deviceHeading === null) return
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
//  コンパス（DeviceOrientationEvent）
//  ここではヘッディング値の取得のみ。カメラ回転は compass-camera tick が担当
// ============================================================
function startCompass() {
  window.addEventListener('deviceorientationabsolute', onOrientation, true)
  window.addEventListener('deviceorientation', onOrientation, true)
}

let lastBeta = 90

function onOrientation(e) {
  if (e.webkitCompassHeading != null) {
    deviceHeading = e.webkitCompassHeading
  } else if (e.alpha != null) {
    deviceHeading = (360 - e.alpha) % 360
  }
  if (e.beta != null) lastBeta = e.beta
  updateArrow()
  // ← カメラ rotation は compass-camera tick() が毎フレームセットする
}

// ============================================================
//  AR エンティティ（ワールド座標: 北=-Z, 東=+X）
// ============================================================
const arEntities = []
let positionFixed = false
let lastUserLat = null, lastUserLon = null

const createAREntities = () => {
  const LAT_PER_M = 1 / 111000
  const LON_PER_M = 1 / (111000 * Math.cos(CONFIG.latitude * Math.PI / 180))
  const scene = document.querySelector('a-scene')
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
          label.setAttribute('position', `0 ${y + 2} 0`)
          label.setAttribute('align', 'center')
          label.setAttribute('color', 'white')
          label.setAttribute('width', '8')
          entity.appendChild(label)
        }
        entity.appendChild(sphere)
      })

      scene.appendChild(entity)
      arEntities.push({ el: entity, targetLat, targetLon })
      num++
    }
  }
}

// ワールド座標でエンティティ位置を更新（東=+X, 北=-Z）
function updateEntityPositions(userLat, userLon) {
  if (userLat !== undefined) { lastUserLat = userLat; lastUserLon = userLon }
  if (!lastUserLat || positionFixed) return

  const cosLat = Math.cos(lastUserLat * Math.PI / 180)

  arEntities.forEach(({ el, targetLat, targetLon }) => {
    const east  = (targetLon - lastUserLon) * 111000 * cosLat
    const north = (targetLat - lastUserLat) * 111000
    el.object3D.position.set(east, 0, -north)
  })
}

function fixEntitiesToWorld() {
  positionFixed = true
  document.getElementById('hint').textContent = '📌 空間に固定（再タップで解除）'
}

function unfixEntities() {
  positionFixed = false
  document.getElementById('hint').textContent = '▶ コンテンツを探しています...'
  updateEntityPositions()
}

// ============================================================
//  メイン初期化
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  startCompass()

  document.querySelector('a-scene').addEventListener('click', () => {
    if (arEntities.length === 0) return
    if (!positionFixed) fixEntitiesToWorld()
    else unfixEntities()
  })

  const scene = document.querySelector('a-scene')
  if (scene.hasLoaded) {
    createAREntities()
  } else {
    scene.addEventListener('loaded', createAREntities)
  }

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
      updateEntityPositions(latitude, longitude)

      if (!positionFixed) {
        const hint = document.getElementById('hint')
        if (hint.textContent === 'GPS を取得中...') {
          hint.textContent = '矢印の方向を向いてタップして固定'
        }
      }

      const dbg = document.getElementById('debug-panel')
      if (dbg) {
        let nearestDist = Infinity
        let nearX = 0, nearZ = 0
        arEntities.forEach(({ el }) => {
          const p = el.object3D.position
          const d = Math.sqrt(p.x * p.x + p.z * p.z)
          if (d < nearestDist) { nearestDist = d; nearX = p.x; nearZ = p.z }
        })
        const nearStr = nearestDist === Infinity ? '-'
          : `${nearestDist.toFixed(1)}m (E${nearX.toFixed(0)} N${(-nearZ).toFixed(0)})`

        // カメラの実際の rotation.y を表示（AR.js が上書きしてないか確認用）
        const cam = document.querySelector('a-camera')
        const camRotY = cam ? Math.round(cam.object3D.rotation.y * 180 / Math.PI) : '-'

        dbg.innerHTML =
          `${VERSION} | 現在地: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br>` +
          `精度: ±${Math.round(accuracy)}m　更新: ${posCount}回<br>` +
          `最近: ${nearStr} | heading: ${deviceHeading !== null ? Math.round(deviceHeading) + '°' : '-'}` +
          ` | camY: ${camRotY}°`
      }

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
      const dbg = document.getElementById('debug-panel')
      if (dbg) dbg.innerHTML = `❌ GPSエラー code:${err.code}<br>${err.message}`
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  )
})
