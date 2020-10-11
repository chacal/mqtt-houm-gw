import { combineTemplate, EventStream, fromBinder } from 'baconjs'
import { identity, noop, range } from 'lodash'
import { NetworkDisplay, SensorEvents } from '@chacal/js-utils'
import { CanvasRenderingContext2D } from 'canvas'
import { getRandomInt, sendBWRImageToDisplay } from './utils'
import { getContext, renderCenteredText, renderRightAdjustedText } from '@chacal/canvas-render-utils'
import { fetchNordPoolSpotPrices, SpotPrice } from 'pohjoisallas'
import { addHours, getHours, isEqual, startOfHour } from 'date-fns'
import { format, utcToZonedTime } from 'date-fns-tz'
import { CronJob } from 'cron'
import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus

const D104_ADDRESS = 'fddd:eeee:ffff:0061:4579:2df8:83c4:88fa'
const D108_ADDRESS = 'fddd:eeee:ffff:0061:eb89:0d6b:5f92:c7d2'
const REAL_DISPLAY_WIDTH = 128
const REAL_DISPLAY_HEIGHT = 296
const DISPLAY_WIDTH = REAL_DISPLAY_HEIGHT
const DISPLAY_HEIGHT = REAL_DISPLAY_WIDTH

const VCC_POLLING_INTERVAL_MS = () => 5 * 60000 + getRandomInt(20000)
const RENDER_CRON_EXPRESSION = '1,6,20,40 * * * *'
const MAX_RANDOM_RENDER_DELAY_MS = 60000

const HOUR_COUNT = 24
const BAR_GAP_PIXELS = 2
const GRAPH_MAX_PRICE = 120
const GRAPH_HEIGHT_PIXELS = 110
const GRAPH_WIDTH_PIXELS = 200
const SLOT_WIDTH = Math.floor(GRAPH_WIDTH_PIXELS / HOUR_COUNT)
const GRAPH_MARGIN = (GRAPH_WIDTH_PIXELS - HOUR_COUNT * SLOT_WIDTH) / 2 + BAR_GAP_PIXELS / 2

const TZ = 'Europe/Helsinki'

export default function setupNetworkDisplay(displayStatusCb: (s: IThreadDisplayStatus) => void) {
  const prices = createPricesStream()
  setupPriceDisplay(prices, D104_ADDRESS, displayStatusCb)
  setupPriceDisplay(prices, D108_ADDRESS, displayStatusCb)
}

function setupPriceDisplay(prices: EventStream<SpotPrice[]>, displayAddress: string, displayStatusCb: (s: IThreadDisplayStatus) => void) {
  const statuses = NetworkDisplay.statusesWithInterval(displayAddress, VCC_POLLING_INTERVAL_MS())
  const combined = combineTemplate({
    status: statuses,
    prices
  })

  statuses.onValue(displayStatusCb)

  combined
    .first()
    .concat(combined.sampledBy(prices))
    .map(v => render(v.status.vcc, v.status.instance, v.status.parent.latestRssi, v.prices))
    .onValue(imageData => setTimeout(() => sendBWRImageToDisplay(displayAddress, imageData), getRandomInt(MAX_RANDOM_RENDER_DELAY_MS)))
}

function createPricesStream() {
  return fromBinder<SpotPrice[]>(sink => {
    const job = new CronJob(RENDER_CRON_EXPRESSION, fetchPrices, noop, true, 'UTC', null, true)
    return () => {
      job.stop()
    }

    function fetchPrices() {
      fetchNordPoolSpotPrices()
        .then(prices => sink(prices))
    }
  })
}


export function render(vcc: number, instance: string, rssi: number, prices: SpotPrice[]) {
  const ctx = getContext(REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT, true)
  ctx.antialias = 'default'

  const startOfCurrentHour = startOfHour(utcToZonedTime(new Date(), TZ))
  const renderedPrices = getRenderedPrices(prices, startOfCurrentHour)

  renderPriceBars(ctx, renderedPrices)
  renderCurrentPrice(ctx, priceForDate(renderedPrices, startOfCurrentHour))

  renderDividerAtPrice(ctx, 50)
  renderDividerAtPrice(ctx, 100)

  return ctx.getImageData(0, 0, REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT)
}

function renderPriceBars(ctx: CanvasRenderingContext2D, prices: SpotPrice[]) {
  ctx.font = '18px Roboto700'

  prices
    .forEach((price, i) => {
      const barHeight = (retailPrice(price) / GRAPH_MAX_PRICE) * GRAPH_HEIGHT_PIXELS
      ctx.fillRect(GRAPH_MARGIN + i * SLOT_WIDTH, GRAPH_HEIGHT_PIXELS, SLOT_WIDTH - BAR_GAP_PIXELS, -barHeight)

      const localPriceTime = utcToZonedTime(price.start, TZ)
      if (getHours(localPriceTime) % 3 === 0) {
        renderCenteredText(ctx, getHours(localPriceTime).toString(), GRAPH_MARGIN + i * SLOT_WIDTH + (SLOT_WIDTH - BAR_GAP_PIXELS) / 2, DISPLAY_HEIGHT - 2)
      }
    })
}

function renderCurrentPrice(ctx: CanvasRenderingContext2D, currentPrice: SpotPrice | undefined) {
  ctx.font = '18px Roboto700'
  ctx.fillText('c/kWh', GRAPH_WIDTH_PIXELS + 6, 80)
  renderRightAdjustedText(ctx, format(new Date(), 'HH:mm'), DISPLAY_WIDTH - 4, DISPLAY_HEIGHT - 4)

  const currentPriceStr = currentPrice ? (retailPrice(currentPrice) / 10).toFixed(1) : 'N/A'
  ctx.font = currentPriceStr.length > 3 ? '42px Roboto700' : '56px Roboto700'
  ctx.fillText(currentPriceStr, GRAPH_WIDTH_PIXELS + 6, 60)
}

function renderDividerAtPrice(ctx: CanvasRenderingContext2D, price: number) {
  ctx.strokeStyle = '#000000'
  ctx.beginPath()
  ctx.setLineDash([5, 3])
  const lineY = Math.round(GRAPH_HEIGHT_PIXELS - price * GRAPH_HEIGHT_PIXELS / GRAPH_MAX_PRICE)
  ctx.moveTo(GRAPH_MARGIN, lineY)
  ctx.lineTo(GRAPH_WIDTH_PIXELS - GRAPH_MARGIN, lineY)
  ctx.stroke()
}

function getRenderedPrices(prices: SpotPrice[], startOfCurrentHour: Date) {
  return range(HOUR_COUNT)
    .map(i => priceForDate(prices, addHours(startOfCurrentHour, i)))
    .filter(identity) as SpotPrice[]
}

function retailPrice(spotPrice: SpotPrice) {
  return 1.24 * spotPrice.price + 3 // 24% VAT + 3 EUR/MWh commission
}

function priceForDate(prices: SpotPrice[], date: Date) {
  return prices.find(p => isEqual(p.start, date))
}

