import fetch from 'node-fetch'

const HOUM_SITE_KEY = process.env.HOUM_SITE_KEY
const HOUM_BASE_URL = `https://api.mountkelvin.com`
const HOUM_SITE_URL = `${HOUM_BASE_URL}/api/site/${HOUM_SITE_KEY}`
const HOUM_APPLY_DEVICE_URL = HOUM_SITE_URL + '/applyDevice'
const HOUM_APPLY_SCENE_URL = HOUM_SITE_URL + '/applyScene'

if (!HOUM_SITE_KEY) {
  console.error('HOUM site key missing! Set HOUM_SITE_KEY environment variable. Exiting..')
  process.exit()
}

export function turnOn(deviceId: string, brightness: number) {
  postJson(HOUM_APPLY_DEVICE_URL, {
    id: deviceId,
    state: {
      on: true,
      bri: brightness
    }
  })
}

export function turnOff(deviceId: string) {
  postJson(HOUM_APPLY_DEVICE_URL, {
    id: deviceId,
    state: {
      on: false,
    }
  })
}

export function applyScene(sceneId: string) {
  postJson(HOUM_APPLY_SCENE_URL, { id: sceneId })
}

function postJson(url: string, json: {}) {
  const start = new Date()
  // console.log(`POSTing: ${JSON.stringify(json)}`)

  fetch(url, {
    method: 'POST',
    body: JSON.stringify(json),
    headers: { 'Content-Type': 'application/json' },
  })
    // .then(res => console.log(`Done in ${new Date().getTime() - start.getTime()}ms. Response: ${res.status}`))
    .catch(e => console.error('Error while POSTing:', e))
}
