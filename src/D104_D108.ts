import { combineTemplate, EventStream } from 'baconjs'
import { CanvasRenderingContext2D } from 'canvas'
import { getRandomInt, sendBWRImageToDisplay } from './utils'
import { getContext, renderCenteredText, renderRightAdjustedText } from '@chacal/canvas-render-utils'
import { SpotPrice } from 'pohjoisallas'
import { getHours } from 'date-fns'
import { format, utcToZonedTime } from 'date-fns-tz'
import { DisplayStatusStream } from './index'
import { getCurrentPrice, getNPricesFromCurrentHourForward, retailPrice } from './ElectricityPrices'

const D104_ADDRESS = 'fddd:eeee:ffff:0061:4e11:5d19:7b5a:a5ee'
const D108_ADDRESS = 'fddd:eeee:ffff:0061:d698:601f:f4a6:f5e3'
const REAL_DISPLAY_WIDTH = 128
const REAL_DISPLAY_HEIGHT = 296
const DISPLAY_WIDTH = REAL_DISPLAY_HEIGHT
const DISPLAY_HEIGHT = REAL_DISPLAY_WIDTH

const MAX_RANDOM_RENDER_DELAY_MS = 30000

const HOUR_COUNT = 24
const BAR_GAP_PIXELS = 2
const GRAPH_MAX_PRICE = 650
const GRAPH_START_PRICE = 50
const GRAPH_HEIGHT_PIXELS = 110
const GRAPH_WIDTH_PIXELS = 200
const SLOT_WIDTH = Math.floor(GRAPH_WIDTH_PIXELS / HOUR_COUNT)
const GRAPH_MARGIN = (GRAPH_WIDTH_PIXELS - HOUR_COUNT * SLOT_WIDTH) / 2 + BAR_GAP_PIXELS / 2

const TZ = 'Europe/Helsinki'

export default function setupNetworkDisplay(displayStatuses: DisplayStatusStream, electricityPrices: EventStream<SpotPrice[]>) {
  setupPriceDisplay(electricityPrices, D104_ADDRESS, displayStatuses.filter(s => s.instance === 'D104'))
  setupPriceDisplay(electricityPrices, D108_ADDRESS, displayStatuses.filter(s => s.instance === 'D108'))
}

function setupPriceDisplay(prices: EventStream<SpotPrice[]>, displayAddress: string, displayStatuses: DisplayStatusStream) {
  const combined = combineTemplate({
    status: displayStatuses,
    prices
  })

  combined
    .first()
    .delay(getRandomInt(MAX_RANDOM_RENDER_DELAY_MS))
    .concat(combined.sampledBy(prices))
    .map(v => render(v.status.vcc, v.status.instance, v.status.parent.latestRssi, v.prices))
    .onValue(imageData => setTimeout(() => sendBWRImageToDisplay(displayAddress, imageData), getRandomInt(MAX_RANDOM_RENDER_DELAY_MS)))
}

export function render(vcc: number, instance: string, rssi: number, prices: SpotPrice[]) {
  const ctx = getContext(REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT, true)
  ctx.antialias = 'default'

  const renderedPrices = getNPricesFromCurrentHourForward(prices, HOUR_COUNT)

  renderPriceBars(ctx, renderedPrices)
  renderCurrentPrice(ctx, 60, getCurrentPrice(renderedPrices))

  renderDividerAtPrice(ctx, 100)
  renderDividerAtPrice(ctx, 200)
  renderDividerAtPrice(ctx, 300)
  renderDividerAtPrice(ctx, 400)
  renderDividerAtPrice(ctx, 500)
  renderDividerAtPrice(ctx, 600)

  return ctx.getImageData(0, 0, REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT)
}

export function renderPriceBars(ctx: CanvasRenderingContext2D, prices: SpotPrice[]) {
  ctx.font = '18px Roboto700'

  prices
    .forEach((price, i) => {
      const barHeight = ((retailPrice(price) - GRAPH_START_PRICE) / (GRAPH_MAX_PRICE - GRAPH_START_PRICE)) * GRAPH_HEIGHT_PIXELS
      ctx.fillRect(GRAPH_MARGIN + i * SLOT_WIDTH, GRAPH_HEIGHT_PIXELS, SLOT_WIDTH - BAR_GAP_PIXELS, -barHeight)

      const localPriceTime = utcToZonedTime(price.start, TZ)
      if (getHours(localPriceTime) % 3 === 0) {
        renderCenteredText(ctx, getHours(localPriceTime).toString(), GRAPH_MARGIN + i * SLOT_WIDTH + (SLOT_WIDTH - BAR_GAP_PIXELS) / 2, DISPLAY_HEIGHT - 2)
      }
    })
}

export function renderCurrentPrice(ctx: CanvasRenderingContext2D, y: number, currentPrice: SpotPrice | undefined) {
  ctx.font = '18px Roboto700'
  ctx.fillText('c/kWh', GRAPH_WIDTH_PIXELS + 9, y + 20)
  renderRightAdjustedText(ctx, format(new Date(), 'HH:mm'), DISPLAY_WIDTH - 4, DISPLAY_HEIGHT - 4)

  const currentPriceStr = currentPrice ? (retailPrice(currentPrice) / 10).toFixed(1) : 'N/A'
  ctx.font = currentPriceStr.length > 3 ? '42px Roboto700' : '56px Roboto700'
  ctx.fillText(currentPriceStr, GRAPH_WIDTH_PIXELS + 9, y)
}

export function renderDividerAtPrice(ctx: CanvasRenderingContext2D, price: number) {
  ctx.strokeStyle = '#000000'
  ctx.beginPath()
  ctx.setLineDash([5, 3])
  const lineY = Math.round(GRAPH_HEIGHT_PIXELS - (price - GRAPH_START_PRICE) * GRAPH_HEIGHT_PIXELS / (GRAPH_MAX_PRICE - GRAPH_START_PRICE))
  ctx.moveTo(GRAPH_MARGIN, lineY)
  ctx.lineTo(GRAPH_WIDTH_PIXELS - GRAPH_MARGIN, lineY)
  ctx.stroke()

  ctx.save()
  ctx.rotate(-Math.PI / 2)
  ctx.font = '12px Roboto'
  renderCenteredText(ctx, Math.round(price / 10).toString(), -lineY, GRAPH_WIDTH_PIXELS + 5)
  ctx.restore()
}

