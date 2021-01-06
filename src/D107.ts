import { combineTemplate, fromPromise } from 'baconjs'
import { ChronoUnit, LocalTime } from '@js-joda/core'
import { zip } from 'lodash'
import { CanvasRenderingContext2D } from 'canvas'

import { DisplayStatusStream, EnvironmentEventStream } from './index'
import { getRandomInt, paddedHoursFor, renderImage, sendBWRImageToDisplay } from './utils'
import { cityForecastsWithInterval, ForecastItem } from './CityForecasts'
import { getContext, renderCenteredText } from '@chacal/canvas-render-utils'

const D107_ADDRESS = 'fddd:eeee:ffff:61:c2ca:606:2c7f:feac'
const REAL_DISPLAY_WIDTH = 128
const REAL_DISPLAY_HEIGHT = 296
const DISPLAY_WIDTH = REAL_DISPLAY_HEIGHT
const DISPLAY_HEIGHT = REAL_DISPLAY_WIDTH

const FORECAST_UPDATE_INTERVAL_MS = 15 * 60000
const RENDER_INTERVAL = 10 * 60000 + getRandomInt(30000)


export default function setupNetworkDisplay(environmentEvents: EnvironmentEventStream, displayStatuses: DisplayStatusStream) {
  const d107Statuses = displayStatuses.filter(s => s.instance === 'D107')
  const forecasts = cityForecastsWithInterval('espoo', FORECAST_UPDATE_INTERVAL_MS)
  const combined = combineTemplate({
    environmentEvent: environmentEvents,
    status: d107Statuses,
    forecasts
  })

  combined
    .first()
    .delay(getRandomInt(30000))
    .concat(combined.sample(RENDER_INTERVAL))
    .flatMapLatest(v =>
      fromPromise(render(v.environmentEvent.temperature, v.status.vcc, v.status.instance, v.status.parent.latestRssi, v.forecasts))
    )
    .onValue(imageData => sendBWRImageToDisplay(D107_ADDRESS, imageData))
}

export function render(temperature: number, vcc: number, instance: string, rssi: number, forecasts: ForecastItem[]) {
  const ctx = getContext(REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT, true)
  ctx.antialias = 'default'
  renderTemperature(ctx, temperature)
  renderStatusFields(ctx, vcc, instance, rssi)
  return renderForecasts(ctx, forecasts)
}

function renderTemperature(ctx: CanvasRenderingContext2D, temperature: number) {
  ctx.font = '42px OpenSans700'
  renderCenteredText(ctx, temperature.toFixed(1) + '°C', DISPLAY_WIDTH / 2, 32)
}

function renderStatusFields(ctx: CanvasRenderingContext2D, vcc: number, instance: string, rssi: number) {
  ctx.font = '16px Roboto700'
  ctx.fillText(LocalTime.now().truncatedTo(ChronoUnit.MINUTES).toString(), 2, 14)
}

function renderForecasts(ctx: CanvasRenderingContext2D, forecasts: ForecastItem[]) {
  const forecastColumnXCoords = [30, 110, 190, 266]

  return Promise.all(
    zip(forecastColumnXCoords, forecasts)
      .map(([x, forecast]: [number, ForecastItem]) => renderForecast(ctx, x, forecast))
  )
    .then(() => ctx.getImageData(0, 0, REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT))
}

function renderForecast(ctx: CanvasRenderingContext2D, x: number, forecast: ForecastItem) {
  ctx.font = '20px Roboto700'
  renderCenteredText(ctx, Math.round(forecast.temperature) + '°C', x, 106)

  ctx.font = '15px Roboto700'
  renderCenteredText(ctx, paddedHoursFor(forecast), x, 48)
  ctx.font = '17px Roboto700'
  renderCenteredText(ctx, forecast.precipitation.toFixed(1), x, 125)

  // Render symbol twice with 'multiply' composite to make it appear darker on 4-gray display
  ctx.globalCompositeOperation = 'multiply'
  return renderImage(ctx, forecast.symbolSvg, x - 24, 40, 50, 50)
    .then(() => renderImage(ctx, forecast.symbolSvg, x - 24, 40, 50, 50))
}
