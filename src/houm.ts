import fetch from 'node-fetch'

const HOUM_SITE_KEY = process.env.HOUM_SITE_KEY
const HOUM_BASE_URL = `https://houmkolmonen.herokuapp.com/api/site/${HOUM_SITE_KEY}`
const HOUM_APPLY_DEVICE_URL = HOUM_BASE_URL + '/applyDevice'

if(!HOUM_SITE_KEY) {
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

function postJson(url: string, json: {}) {
  const start = new Date()
  console.log(`POSTing: ${JSON.stringify(json)}`)

  fetch(url, {
    method: 'POST',
    body: JSON.stringify(json),
    headers: {'Content-Type': 'application/json'},
  })
    .then(() => console.log(`Done in ${new Date().getTime() - start.getTime()}ms.`))
    .catch(e => console.error('Error while POSTing:', e))
}
