import { resolve } from 'path'
import { registerFont } from 'canvas'

import {
  environmentsWithInterval,
  getContext,
  getRandomInt,
  renderCenteredText,
  renderRightAdjustedText,
  sendImageToDisplay,
} from './utils'
import { EnvironmentEventStream } from './index'
import { NetworkDisplay, SensorEvents } from '@chacal/js-utils'
import { ChronoUnit, Duration, LocalTime } from 'js-joda'
import { combineTemplate } from 'baconjs'
import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus
import IEnvironmentEvent = SensorEvents.IEnvironmentEvent

require('js-joda-timezone')

const VCC_POLLING_INTERVAL_MS = 5 * 60000 + getRandomInt(20000)
const RENDER_INTERVAL = 10 * 60000 + getRandomInt(20000)
const TEMP_UPDATE_INTERVAL_MS = 60000
const MAX_RENDERED_TEMPERATURE_AGE_S = 3 * 60  // Don't render temperatures older than 3 minutes

const D104_ADDRESS = '2001:2003:f0a2:9c9b:cf01:f04b:705c:f94b'
const REAL_DISPLAY_WIDTH = 128
const REAL_DISPLAY_HEIGHT = 250
const DISPLAY_WIDTH = 250
const DISPLAY_HEIGHT = 122

registerFont(resolve(__dirname, './OpenSans-Bold.ttf'), { family: 'Open Sans', weight: 'bold' })

export default function setupNetworkDisplay(environmentEvents: EnvironmentEventStream, displayStatusCb: (s: IThreadDisplayStatus) => void) {
  const statuses = NetworkDisplay.statusesWithInterval(D104_ADDRESS, VCC_POLLING_INTERVAL_MS)
  const environments = environmentsWithInterval(Duration.ofMillis(TEMP_UPDATE_INTERVAL_MS), environmentEvents)

  const combined = combineTemplate({
    environmentEvent: environments,
    status: statuses
  })

  statuses.onValue(displayStatusCb)

  combined
    .first()
    .concat(combined.sample(RENDER_INTERVAL))
    .map(v => render(v.environmentEvent))
    .onValue(imageData => sendImageToDisplay(D104_ADDRESS, imageData))
}

export function render(carTemperature: IEnvironmentEvent) {
  const sSinceTemperatureEvent = (new Date().getTime() - new Date(carTemperature.ts).getTime()) / 1000
  const temperatureStr = sSinceTemperatureEvent < MAX_RENDERED_TEMPERATURE_AGE_S ?
    carTemperature.temperature.toFixed(1) + '°C' :
    'N/A'

  const ctx = getContext(REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT)
  ctx.translate(0, REAL_DISPLAY_HEIGHT)
  ctx.rotate(-90 * Math.PI / 180)

  ctx.font = 'bold 70px Open Sans'
  renderCenteredText(ctx, temperatureStr, DISPLAY_WIDTH / 2, 88)

  ctx.font = '20px Open Sans'
  renderRightAdjustedText(ctx, 'Car', 248, 18)
  ctx.fillText(LocalTime.now().truncatedTo(ChronoUnit.MINUTES).toString(), 2, 17)

  return ctx.getImageData(0, 0, REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT)
}