import { getRandomInt, sendBWRImageToDisplay, } from './utils'
import { DisplayStatusStream, EnvironmentEventStream } from './index'
import { SensorEvents } from '@chacal/js-utils'
import { ChronoUnit, LocalTime } from '@js-joda/core'
import { combineTemplate } from 'baconjs'
import { getContext, renderCenteredText, renderRightAdjustedText } from '@chacal/canvas-render-utils'
import IEnvironmentEvent = SensorEvents.IEnvironmentEvent

const MAX_RENDERED_TEMPERATURE_AGE_S = 5 * 60  // Don't render temperatures older than 5 minutes

const REAL_DISPLAY_WIDTH = 128
const REAL_DISPLAY_HEIGHT = 296
const DISPLAY_WIDTH = REAL_DISPLAY_HEIGHT
const DISPLAY_HEIGHT = REAL_DISPLAY_WIDTH

export default function setupNetworkDisplay(
  instance: string,
  name: string,
  environmentEvents: EnvironmentEventStream,
  displayStatuses: DisplayStatusStream,
  address: string,
  renderIntervalMinutes: number) {
  const statuses = displayStatuses.filter(s => s.instance === instance)

  const combined = combineTemplate({
    environmentEvent: environmentEvents,
    status: statuses
  })

  combined
    .first()
    .delay(getRandomInt(30000))
    .concat(combined.sample(renderIntervalMinutes * 60000 + getRandomInt(30000)))
    .map(v => render(v.environmentEvent, v.status.vcc, name))
    .onValue(imageData => sendBWRImageToDisplay(address, imageData))
}

export function render(temperature: IEnvironmentEvent, vcc: number, name: string) {
  const sSinceTemperatureEvent = (new Date().getTime() - new Date(temperature.ts).getTime()) / 1000
  const temperatureStr = sSinceTemperatureEvent < MAX_RENDERED_TEMPERATURE_AGE_S ?
    temperature.temperature.toFixed(1) + '°C' : 'N/A'

  const ctx = getContext(REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT, true)
  ctx.antialias = 'default'
  ctx.font = '80px OpenSans700'

  renderCenteredText(ctx, temperatureStr, DISPLAY_WIDTH / 2, 92)

  ctx.font = '20px Roboto700'
  renderRightAdjustedText(ctx, name, DISPLAY_WIDTH - 2, 18)
  ctx.fillText(LocalTime.now().truncatedTo(ChronoUnit.MINUTES).toString(), 2, 18)

  const voltageStr = `${(vcc / 1000).toFixed(3)}V`
  renderCenteredText(ctx, voltageStr, DISPLAY_WIDTH / 2, DISPLAY_HEIGHT - 2)

  return ctx.getImageData(0, 0, REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT)
}