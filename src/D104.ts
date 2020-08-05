import {
  environmentsWithInterval,
  getContext,
  getRandomInt,
  renderCenteredText,
  renderRightAdjustedText,
  sendBWRImageToDisplay,
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

const D104_ADDRESS = 'fddd:eeee:ffff:0061:4579:2df8:83c4:88fa'
const REAL_DISPLAY_WIDTH = 128
const REAL_DISPLAY_HEIGHT = 296
const DISPLAY_WIDTH = REAL_DISPLAY_HEIGHT
const DISPLAY_HEIGHT = REAL_DISPLAY_WIDTH

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
    .map(v => render(v.environmentEvent, v.status.vcc))
    .onValue(imageData => sendBWRImageToDisplay(D104_ADDRESS, imageData))
}

export function render(carTemperature: IEnvironmentEvent, vcc: number) {
  const sSinceTemperatureEvent = (new Date().getTime() - new Date(carTemperature.ts).getTime()) / 1000
  const temperatureStr = sSinceTemperatureEvent < MAX_RENDERED_TEMPERATURE_AGE_S ?
    carTemperature.temperature.toFixed(1) + '°C' : 'N/A'

  const ctx = getContext(REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT, true)
  ctx.antialias = 'default'
  ctx.font = 'bold 70px Open Sans'

  renderCenteredText(ctx, temperatureStr, DISPLAY_WIDTH / 2, 88)

  ctx.font = '20px Open Sans'
  renderRightAdjustedText(ctx, 'Car', DISPLAY_WIDTH - 2, 18)
  ctx.fillText(LocalTime.now().truncatedTo(ChronoUnit.MINUTES).toString(), 2, 18)

  const voltageStr = `${(vcc / 1000).toFixed(3)}V`
  renderCenteredText(ctx, voltageStr, DISPLAY_WIDTH / 2, DISPLAY_HEIGHT - 2)

  return ctx.getImageData(0, 0, REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT)
}