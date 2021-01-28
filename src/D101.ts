import { getRandomInt, sendBWRImageToDisplay, } from './utils'
import { DisplayStatusStream, EnvironmentEventStream } from './index'
import { SensorEvents } from '@chacal/js-utils'
import { ChronoUnit, LocalTime } from '@js-joda/core'
import { combineTemplate } from 'baconjs'
import { getContext, renderCenteredText, renderRightAdjustedText } from '@chacal/canvas-render-utils'
import IEnvironmentEvent = SensorEvents.IEnvironmentEvent

const RENDER_INTERVAL = 10 * 60000 + getRandomInt(30000)
const MAX_RENDERED_TEMPERATURE_AGE_S = 5 * 60  // Don't render temperatures older than 3 minutes

const D101_ADDRESS = 'fddd:eeee:ffff:61:949c:bb75:bc24:c0ed'
const REAL_DISPLAY_WIDTH = 128
const REAL_DISPLAY_HEIGHT = 296
const DISPLAY_WIDTH = REAL_DISPLAY_HEIGHT
const DISPLAY_HEIGHT = REAL_DISPLAY_WIDTH

export default function setupNetworkDisplay(environmentEvents: EnvironmentEventStream, displayStatuses: DisplayStatusStream) {
  const d101Statuses = displayStatuses.filter(s => s.instance === 'D101')

  const combined = combineTemplate({
    environmentEvent: environmentEvents,
    status: d101Statuses
  })

  combined
    .first()
    .delay(getRandomInt(30000))
    .concat(combined.sample(RENDER_INTERVAL))
    .map(v => render(v.environmentEvent, v.status.vcc))
    .onValue(imageData => sendBWRImageToDisplay(D101_ADDRESS, imageData))
}

export function render(temperature: IEnvironmentEvent, vcc: number) {
  const sSinceTemperatureEvent = (new Date().getTime() - new Date(temperature.ts).getTime()) / 1000
  const temperatureStr = sSinceTemperatureEvent < MAX_RENDERED_TEMPERATURE_AGE_S ?
    temperature.temperature.toFixed(1) + '°C' : 'N/A'

  const ctx = getContext(REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT, true)
  ctx.antialias = 'default'
  ctx.font = '80px OpenSans700'

  renderCenteredText(ctx, temperatureStr, DISPLAY_WIDTH / 2, 92)

  ctx.font = '20px Roboto700'
  renderRightAdjustedText(ctx, 'Outside', DISPLAY_WIDTH - 2, 18)
  ctx.fillText(LocalTime.now().truncatedTo(ChronoUnit.MINUTES).toString(), 2, 18)

  const voltageStr = `${(vcc / 1000).toFixed(3)}V`
  renderCenteredText(ctx, voltageStr, DISPLAY_WIDTH / 2, DISPLAY_HEIGHT - 2)

  return ctx.getImageData(0, 0, REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT)
}