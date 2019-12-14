import { HourlyForecast } from './CityForecasts'
import { ChronoUnit, Duration, LocalTime, nativeJs, ZonedDateTime } from 'js-joda'
import _ = require('lodash')
import { nextReadyInstant } from './HeatingInstantCalculations'

const HEATING_START_TEMP = 10
const FULL_HEATING_TEMP = -15
const MIN_HEATING_TIME = Duration.ofMinutes(15)
const MAX_HEATING_TIME = Duration.ofMinutes(90)

export default function calculateHeatingDuration(readyTime: LocalTime, forecasts: HourlyForecast[]): Duration {
  const end = ZonedDateTime.from(nativeJs(nextReadyInstant(readyTime.toString())))

  // Calculate 5 hour period before ready time
  const calculatePeriodLength = Duration.ofHours(5)
  const calculatePeriodStart = end.minusTemporalAmount(calculatePeriodLength)

  // Find relevant forecasts for the period before ready time and calculate avg temperature for them
  const relevantForecasts = _(forecasts)
    .dropWhile(f => isEarlier(f.date, calculatePeriodStart))
    .dropRightWhile(f => isLater(f.date, end.truncatedTo(ChronoUnit.HOURS).plusHours(1)))
    .value()
  const avgTemperature = _.sumBy(relevantForecasts, f => f.temperature) / relevantForecasts.length
  console.log(`Using avg temp ${avgTemperature}°C from ${relevantForecasts.length} forecasts.`)

  // Determine heating duration. Scale linearly between min and full heating times depending on avg temperature.
  if (avgTemperature > HEATING_START_TEMP) {
    return Duration.ofSeconds(0)
  } else if (avgTemperature < FULL_HEATING_TEMP) {
    return MAX_HEATING_TIME
  } else {
    const tempPercent = (avgTemperature - HEATING_START_TEMP) / (FULL_HEATING_TEMP - HEATING_START_TEMP)
    const heatingMinutes = tempPercent * (MAX_HEATING_TIME.toMinutes() - MIN_HEATING_TIME.toMinutes()) + MIN_HEATING_TIME.toMinutes()
    return !isNaN(heatingMinutes) ? Duration.ofMinutes(Math.round(heatingMinutes)) : Duration.ofMinutes(0)
  }
}

function isEarlier(date: string, compare: ZonedDateTime) {
  return ZonedDateTime.parse(date).isBefore(compare)
}

function isLater(date: string, compare: ZonedDateTime) {
  return ZonedDateTime.parse(date).isAfter(compare)
}
