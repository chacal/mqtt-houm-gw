import { combineTemplate, fromPromise } from 'baconjs'
import { LocalTime, Duration, ChronoUnit } from 'js-joda'
import { zip } from 'lodash'
import { resolve } from 'path'
import { SensorEvents, NetworkDisplay } from '@chacal/js-utils'
import { CanvasRenderingContext2D, registerFont } from 'canvas'

import { TempEventStream } from './index'
import {
  getContext,
  paddedHoursFor,
  renderCenteredText,
  renderImage, renderRightAdjustedText, sendImageToDisplay,
  temperaturesWithInterval
} from './utils'
import { cityForecastsWithInterval, ForecastItem } from './CityForecasts'

import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus

require('js-joda-timezone')


const D101_ADDRESS = '2001:2003:f0a2:9c9b:0a7b:c40f:550a:832f'
const DISPLAY_WIDTH = 296
const DISPLAY_HEIGHT = 128

const TEMP_RENDERING_INTERVAL_MS = 10 * 61000
const VCC_POLLING_INTERVAL_MS = 10 * 60000
const FORECAST_UPDATE_INTERVAL_MS = 15 * 60000

registerFont(resolve(__dirname, '../src/Roboto-Bold.ttf'), { family: 'Roboto', weight: 'bold' })
registerFont(resolve(__dirname, '../src/OpenSans-Bold.ttf'), { family: 'Open Sans', weight: 'bold' })

export default function setupNetworkDisplay(tempEvents: TempEventStream, displayStatusCb: (s: IThreadDisplayStatus) => void) {
  const statuses = NetworkDisplay.statusesWithInterval(D101_ADDRESS, VCC_POLLING_INTERVAL_MS)
  const temperatures = temperaturesWithInterval(Duration.ofMillis(TEMP_RENDERING_INTERVAL_MS), tempEvents)
  const forecasts = cityForecastsWithInterval('espoo', FORECAST_UPDATE_INTERVAL_MS)
  const combined = combineTemplate({
    tempEvent: temperatures,
    status: statuses,
    forecasts
  })

  statuses.onValue(displayStatusCb)

  combined
    .flatMapLatest(v =>
      fromPromise(render(v.tempEvent.temperature, v.status.vcc, v.status.instance, v.status.parent.latestRssi, v.forecasts))
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
  ctx.fillText(instance, 2, 12)
  ctx.fillText(LocalTime.now().truncatedTo(ChronoUnit.MINUTES).toString(), 2, 25)

  renderRightAdjustedText(ctx, `${(vcc / 1000).toFixed(3)}V`, 294, 12)
  renderRightAdjustedText(ctx, `${rssi}dBm`, 294, 25)
}

function renderForecasts(ctx: CanvasRenderingContext2D, forecasts: ForecastItem[]) {
  const forecastColumnXCoords = [30, 110, 190, 266]

  return Promise.all(
    zip(forecastColumnXCoords, forecasts)
      .map(([x, forecast]) => renderForecast(ctx, x, forecast))
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
