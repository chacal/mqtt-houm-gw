import fetch from 'node-fetch'

const HOUM_SITE_KEY = process.env.HOUM_SITE_KEY
const HOUM_URL = `https://houmkolmonen.herokuapp.com/api/site/${HOUM_SITE_KEY}/applyDevice`

if(! HOUM_SITE_KEY) {
  console.error('HOUM site key missing! Set HOUM_SITE_KEY environment variable. Exiting..')
  process.exit()
}


export function turnOn(deviceId: string, brightness: number) {
  postJson({
    id: deviceId,
    state: {
      on: true,
      bri: brightness
    }
  })
}

export function turnOff(deviceId: string) {
  postJson({
    id: deviceId,
    state: {
      on: false,
    }
  })
}

function postJson(json) {
  const start = new Date()
  console.log(`POSTing: ${JSON.stringify(json)}`)

  fetch(HOUM_URL, {
    method: 'POST',
    body: JSON.stringify(json),
    headers: {'Content-Type': 'application/json'},
  })
    .then(() => console.log(`Done in ${new Date().getTime() - start.getTime()}ms.`))
    .catch(e => console.error('Error while POSTing:', e))
}
