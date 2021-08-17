import { fromPromise, interval, once } from 'baconjs'
import { getRandomInt, sendBWRImageToDisplay } from './utils'
import { getContext, renderCenteredText } from '@chacal/canvas-render-utils'
import { getStopArrivals, HslArrival } from './HslTimetables'
import { differenceInMinutes, format, getMinutes, isAfter, isBefore, parse, startOfMinute } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'

const D110_ADDRESS = 'fddd:eeee:ffff:61:43a2:7c55:f229:85ef'
const REAL_DISPLAY_WIDTH = 128
const REAL_DISPLAY_HEIGHT = 296

const RASTASKUKKULA_STOP_ID = 'HSL:2133219'
const FAST_RENDER_START_TIME = '7:15'
const FAST_RENDER_END_TIME = '9:15'
const TZ = 'Europe/Helsinki'


export default function setupNetworkDisplay() {
  once('')
    .delay(getRandomInt(30000))
    .concat(interval(60000, ''))
    .filter(shouldRender)
    .flatMapLatest(() => fromPromise(getStopArrivals(RASTASKUKKULA_STOP_ID)))
    .map(arrivals => render(arrivals))
    .onValue(imageData => sendBWRImageToDisplay(D110_ADDRESS, imageData))
}


export function render(arrivals: HslArrival[]) {
  const ctx = getContext(REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT, false)
  ctx.antialias = 'default'
  ctx.font = '23px Roboto700'

  let y = 30
  const x = 4
  const now = new Date()

  arrivals.forEach(arr => {
    renderArrival(ctx, arr, now, x, y)
    y += 33
  })

  ctx.font = '20px Roboto700'
  renderCenteredText(ctx, format(now, 'HH:mm'), REAL_DISPLAY_WIDTH / 2, REAL_DISPLAY_HEIGHT - 6)

  return ctx.getImageData(0, 0, REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT)
}

function renderArrival(ctx: CanvasRenderingContext2D, arr: HslArrival, now: Date, x: number, y: number) {
  const ts = startOfMinute(arr.arriveTs)
  const realtimeMarker = arr.realtime && arr.realtimeState === 'UPDATED' ? '°' : ''

  if (differenceInMinutes(ts, now) < 10 && isInFastRenderingPeriod(now)) {
    ctx.fillText(`${Math.max(0, differenceInMinutes(ts, now))} min${realtimeMarker}`, x, y)
  } else {
    ctx.fillText(format(startOfMinute(arr.arriveTs), `HH:mm${realtimeMarker}`), x, y)
  }
  ctx.fillText(arr.route, x + 79, y)
}

function isInFastRenderingPeriod(ts: Date) {
  const fastRenderStart = zonedTimeToUtc(parse(FAST_RENDER_START_TIME, 'HH:mm', new Date()), TZ)
  const fastRenderEnd = zonedTimeToUtc(parse(FAST_RENDER_END_TIME, 'HH:mm', new Date()), TZ)
  return isBefore(fastRenderStart, ts) && isAfter(fastRenderEnd, ts)
}

function shouldRender() {
  const now = new Date()
  // Don't skip rendering during fast render period
  if (isInFastRenderingPeriod(now)) {
    return true
  } else { // Render every 10 minutes outside the fast render period
    return getMinutes(now) % 10 === 0
  }
}

