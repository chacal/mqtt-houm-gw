import { combineTemplate, EventStream } from 'baconjs'
import { getRandomInt, sendBWRImageToDisplay } from './utils'
import { getContext } from '@chacal/canvas-render-utils'
import { SpotPrice } from 'pohjoisallas'
import { DisplayStatusStream, EnvironmentEventStream } from './index'
import { getCurrentPrice, getNPricesFromCurrentHourForward } from './ElectricityPrices'
import { renderCurrentPrice, renderDividerAtPrice, renderPriceBars } from './D104_D108'

const D109_ADDRESS = 'fddd:eeee:ffff:61:ac7:f431:9a39:3895'
const REAL_DISPLAY_WIDTH = 128
const REAL_DISPLAY_HEIGHT = 296

const MAX_RANDOM_RENDER_DELAY_MS = 30000
const HOUR_COUNT = 24


export default function setupNetworkDisplay(displayStatuses: DisplayStatusStream, electricityPrices: EventStream<SpotPrice[]>, environmentEvents: EnvironmentEventStream) {
  const combined = combineTemplate({
    status: displayStatuses.filter(s => s.instance === 'D109'),
    prices: electricityPrices,
    environmentEvent: environmentEvents
  })

  combined
    .first()
    .delay(getRandomInt(MAX_RANDOM_RENDER_DELAY_MS))
    .concat(combined.sampledBy(electricityPrices))
    .map(v => render(v.status.vcc, v.status.instance, v.status.parent.latestRssi, v.prices, v.environmentEvent.temperature))
    .onValue(imageData => setTimeout(() => sendBWRImageToDisplay(D109_ADDRESS, imageData), getRandomInt(MAX_RANDOM_RENDER_DELAY_MS)))

}

export function render(vcc: number, instance: string, rssi: number, prices: SpotPrice[], temp: number) {
  const ctx = getContext(REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT, true)
  ctx.antialias = 'default'

  const renderedPrices = getNPricesFromCurrentHourForward(prices, HOUR_COUNT)

  renderPriceBars(ctx, renderedPrices)
  renderCurrentPrice(ctx, 80, getCurrentPrice(renderedPrices))

  ctx.font = '32px OpenSans700'
  ctx.fillText(temp.toFixed(1) + '°', 200 + 6, 34)

  renderDividerAtPrice(ctx, 100)
  renderDividerAtPrice(ctx, 150)

  return ctx.getImageData(0, 0, REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT)
}
