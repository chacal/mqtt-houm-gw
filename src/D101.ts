import { combineTemplate, fromPromise } from 'baconjs'
import { ChronoUnit, Duration, LocalTime } from 'js-joda'
import { zip } from 'lodash'
import { resolve } from 'path'
import { NetworkDisplay, SensorEvents } from '@chacal/js-utils'
import { CanvasRenderingContext2D, registerFont } from 'canvas'

import { EnvironmentEventStream } from './index'
import {
  environmentsWithInterval,
  getContext,
  getRandomInt,
  paddedHoursFor,
  renderCenteredText,
  renderImage,
  sendImageToDisplay
} from './utils'
import { cityForecastsWithInterval, ForecastItem } from './CityForecasts'
import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus

require('js-joda-timezone')


const D101_ADDRESS = '2001:2003:f0a2:9c9b:df57:1c0e:d67e:7e28'
const DISPLAY_WIDTH = 296
const DISPLAY_HEIGHT = 128

const TEMP_UPDATE_INTERVAL_MS = 60000
const VCC_POLLING_INTERVAL_MS = 5 * 60000 + getRandomInt(20000)
const FORECAST_UPDATE_INTERVAL_MS = 15 * 60000
const RENDER_INTERVAL = 10 * 60000 + getRandomInt(20000)

registerFont(resolve(__dirname, './Roboto-Bold.ttf'), { family: 'Roboto', weight: 'bold' })
registerFont(resolve(__dirname, './OpenSans-Bold.ttf'), { family: 'Open Sans', weight: 'bold' })

export default function setupNetworkDisplay(environmentEvents: EnvironmentEventStream, displayStatusCb: (s: IThreadDisplayStatus) => void) {
  const statuses = NetworkDisplay.statusesWithInterval(D101_ADDRESS, VCC_POLLING_INTERVAL_MS)
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
    .onValue(imageData => sendImageToDisplay(D101_ADDRESS, imageData))
}

export function render(temperature: number, vcc: number, instance: string, rssi: number, forecasts: ForecastItem[]) {
  const ctx = getContext(DISPLAY_WIDTH, DISPLAY_HEIGHT)
  renderTemperature(ctx, temperature)
  renderStatusFields(ctx, vcc, instance, rssi)
  return renderForecasts(ctx, forecasts)
}

function renderTemperature(ctx: CanvasRenderingContext2D, temperature: number) {
  ctx.font = 'bold 40px "Open Sans"'
  renderCenteredText(ctx, temperature.toFixed(1) + '°C', DISPLAY_WIDTH / 2, 31)
}

function renderStatusFields(ctx: CanvasRenderingContext2D, vcc: number, instance: string, rssi: number) {
  ctx.font = 'bold 14px Roboto'
  ctx.fillText(LocalTime.now().truncatedTo(ChronoUnit.MINUTES).toString(), 2, 12)
}

function renderForecasts(ctx: CanvasRenderingContext2D, forecasts: ForecastItem[]) {
  const forecastColumnXCoords = [30, 110, 190, 266]

  return Promise.all(
    zip(forecastColumnXCoords, forecasts)
      .map(([x, forecast]: [number, ForecastItem]) => renderForecast(ctx, x, forecast))
  )
    .then(() => ctx.getImageData(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT))
}

function renderForecast(ctx: CanvasRenderingContext2D, x: number, forecast: ForecastItem) {
  ctx.font = 'bold 20px Helvetica'
  renderCenteredText(ctx, Math.round(forecast.temperature) + '°C', x, 106)

  ctx.font = 'bold 15px Helvetica'
  renderCenteredText(ctx, paddedHoursFor(forecast), x, 48)
  ctx.font = 'bold 16px Helvetica'
  renderCenteredText(ctx, forecast.precipitation.toFixed(1), x, 125)

  return renderImage(ctx, forecast.symbolSvg, x - 24, 40, 50, 50)
}
