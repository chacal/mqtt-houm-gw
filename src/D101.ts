import { environmentsWithInterval, getRandomInt, sendBWRImageToDisplay, sendImageToDisplay, } from './utils'
import { EnvironmentEventStream } from './index'
import { NetworkDisplay, SensorEvents } from '@chacal/js-utils'
import { ChronoUnit, Duration, LocalTime } from '@js-joda/core'
import { combineTemplate } from 'baconjs'
import { getContext, renderCenteredText, renderRightAdjustedText } from '@chacal/canvas-render-utils'
import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus
import IEnvironmentEvent = SensorEvents.IEnvironmentEvent

const VCC_POLLING_INTERVAL_MS = 5 * 60000 + getRandomInt(20000)
const RENDER_INTERVAL = 10 * 60000 + getRandomInt(20000)
const TEMP_UPDATE_INTERVAL_MS = 60000
const MAX_RENDERED_TEMPERATURE_AGE_S = 5 * 60  // Don't render temperatures older than 3 minutes

const D101_ADDRESS = 'fddd:eeee:ffff:0061:8543:9184:2e26:d063'
const DISPLAY_WIDTH = 296
const DISPLAY_HEIGHT = 128

export default function setupNetworkDisplay(environmentEvents: EnvironmentEventStream, displayStatusCb: (s: IThreadDisplayStatus) => void) {
  const statuses = NetworkDisplay.statusesWithInterval(D101_ADDRESS, VCC_POLLING_INTERVAL_MS)
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
    .onValue(imageData => sendImageToDisplay(D101_ADDRESS, imageData))
}

export function render(temperature: IEnvironmentEvent, vcc: number) {
  const sSinceTemperatureEvent = (new Date().getTime() - new Date(temperature.ts).getTime()) / 1000
  const temperatureStr = sSinceTemperatureEvent < MAX_RENDERED_TEMPERATURE_AGE_S ?
    temperature.temperature.toFixed(1) + '°C' : 'N/A'

  const ctx = getContext(DISPLAY_WIDTH, DISPLAY_HEIGHT)
  ctx.antialias = 'default'
  ctx.font = '70px OpenSans700'

  renderCenteredText(ctx, temperatureStr, DISPLAY_WIDTH / 2, 88)

  ctx.font = '20px Roboto700'
  renderRightAdjustedText(ctx, 'Outside', DISPLAY_WIDTH - 2, 18)
  ctx.fillText(LocalTime.now().truncatedTo(ChronoUnit.MINUTES).toString(), 2, 18)

  const voltageStr = `${(vcc / 1000).toFixed(3)}V`
  renderCenteredText(ctx, voltageStr, DISPLAY_WIDTH / 2, DISPLAY_HEIGHT - 2)

  return ctx.getImageData(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT)
}