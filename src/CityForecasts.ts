import { chunk, sumBy } from 'lodash'
import fetch from 'node-fetch'
import { ChronoUnit, LocalTime, ZonedDateTime, ZoneId } from 'js-joda'
import { CanvasRenderUtils } from '@chacal/js-utils'
import saveToPngFile = CanvasRenderUtils.saveToPngFile
import { render } from './D101'
import { fromPromise, interval, once } from 'baconjs'

require('js-joda-timezone')

export interface ForecastItem {
  time: ZonedDateTime,
  temperature: number,
  precipitation: number,
  symbolSvg: Buffer
}

interface HourlyForecast {
  temperature: number,
  precipitation1h: number,
  weatherSymbol3: number,
  date: string
}

export function cityForecastsWithInterval(city: string, intervalMs: number) {
  return once('')
    .concat(interval(intervalMs, ''))
    .flatMapLatest(() => fromPromise(getCityForecastItems(city)))
    .toProperty()
}

export function getCityForecastItems(city: string): Promise<ForecastItem[]> {
  return fetch(`https://www.tuuleeko.fi/fmiproxy/city-forecast?city=${city}`)
    .then(res => res.json())
    .then((forecast: HourlyForecast[]) => {
      const firstForecastTime = getFirstShownForecastTimes(ZonedDateTime.now(ZoneId.of('Europe/Helsinki'))).withZoneSameInstant(ZoneId.UTC)
      const firstForecastIndex = forecast.findIndex(f => ZonedDateTime.parse(f.date).equals(firstForecastTime))
      const shownForecasts = forecast.slice(firstForecastIndex, firstForecastIndex + 4 * 3)  // Show 4 sets, each combined from 3 separate forecasts
      const forecastGroups = chunk(shownForecasts, 3)
      const combinedForecasts = Promise.all(forecastGroups.map(group => {
        const precipitationSum = sumBy(group, f => f.precipitation1h)
        return fetch(`https://weathersymbol3.s3-eu-west-1.amazonaws.com/${group[0].weatherSymbol3}.svg`)
          .then(res => res.buffer())
          .then(symbolSvg => ({
            time: ZonedDateTime.parse(group[0].date).withZoneSameInstant(ZoneId.of('Europe/Helsinki')),
            precipitation: precipitationSum,
            temperature: group[0].temperature,
            symbolSvg
          }))
      }))
      return combinedForecasts
    })
}

function getFirstShownForecastTimes(now: ZonedDateTime) {
  // Forecasts are shown for every three hours rounding up the first hour
  // For example:
  // current time  9:25  ->  forecast starts at 12:00
  // current time 10:25  ->  forecast starts at 12:00
  // current time 11:25  ->  forecast starts at 12:00
  // current time 12:25  ->  forecast starts at 15:00
  // current time 13:25  ->  forecast starts at 15:00
  const timespanStart = now.truncatedTo(ChronoUnit.HOURS).plusHours(1)  // Next exact hour
  const nextEveryThirdHour = Math.ceil(timespanStart.hour() / 3) * 3
  const firstForecast = timespanStart.plusHours(nextEveryThirdHour - timespanStart.hour())
  return firstForecast
}

// This is only for testing
export function renderForecastToPng(city: string) {
  getCityForecastItems(city)
    .then(forecasts => render(21.457, 2946, 'D101', LocalTime.now(), forecasts))
    .then(imageData => saveToPngFile(imageData, 'test.png'))
    .then(() => console.log('All done!'))
}