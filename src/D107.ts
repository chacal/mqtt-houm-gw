import { combineTemplate, fromPromise } from 'baconjs'
import { ChronoUnit, Duration, LocalTime } from '@js-joda/core'
import { zip } from 'lodash'
import { NetworkDisplay, SensorEvents } from '@chacal/js-utils'
import { CanvasRenderingContext2D } from 'canvas'

import { EnvironmentEventStream } from './index'
import {
  environmentsWithInterval,
  getRandomInt,
  paddedHoursFor,
  renderImage,
  sendBWRImageToDisplay
} from './utils'
import { cityForecastsWithInterval, ForecastItem } from './CityForecasts'
import { getContext, renderCenteredText } from '@chacal/canvas-render-utils'
import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus

const D107_ADDRESS = 'fddd:eeee:ffff:0061:bc64:d945:2096:8f1e'
const REAL_DISPLAY_WIDTH = 128
const REAL_DISPLAY_HEIGHT = 296
const DISPLAY_WIDTH = REAL_DISPLAY_HEIGHT
const DISPLAY_HEIGHT = REAL_DISPLAY_WIDTH

const TEMP_UPDATE_INTERVAL_MS = 60000
const VCC_POLLING_INTERVAL_MS = 5 * 60000 + getRandomInt(20000)
const FORECAST_UPDATE_INTERVAL_MS = 15 * 60000
const RENDER_INTERVAL = 10 * 60000 + getRandomInt(20000)


export default function setupNetworkDisplay(environmentEvents: EnvironmentEventStream, displayStatusCb: (s: IThreadDisplayStatus) => void) {
  const statuses = NetworkDisplay.statusesWithInterval(D107_ADDRESS, VCC_POLLING_INTERVAL_MS)
  const environments = environmentsWithInterval(Duration.ofMillis(TEMP_UPDATE_INTERVAL_MS), environmentEvents)
  const forecasts = cityForecastsWithInterval('espoo', FORECAST_UPDATE_INTERVAL_MS)
  const combined = combineTemplate({
    environmentEvent: environments,
    status: statuses,
    forecasts
  })

  statuses.onValue(displayStatusCb)

  combined
    .first()
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
