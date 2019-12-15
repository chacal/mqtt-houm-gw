import { HourlyForecast } from './CityForecasts'
import _ = require('lodash')
import { nextReadyInstant } from './HeatingInstantCalculations'
import { addHours, isAfter, isBefore, startOfHour, subHours } from 'date-fns'

const HEATING_START_TEMP = 5
const FULL_HEATING_TEMP = -15
const MIN_HEATING_TIME = 15
const MAX_HEATING_TIME = 90

export default function calculateHeatingMinutes(readyTime: string, forecasts: HourlyForecast[]): number {
  const end = nextReadyInstant(readyTime)

  // Calculate 5 hour period before ready time
  const forecastPeriodStart = subHours(end, 5)
  const forecastPeriodEnd = startOfHour(addHours(end, 1))

  // Find relevant forecasts for the period before ready time and calculate avg temperature for them
  const relevantForecasts = _(forecasts)
    .dropWhile(f => isBefore(new Date(f.date), forecastPeriodStart))
    .dropRightWhile(f => isAfter(new Date(f.date), forecastPeriodEnd))
    .value()
  const avgTemperature = _.sumBy(relevantForecasts, f => f.temperature) / relevantForecasts.length
  console.log(`Using avg temp ${avgTemperature}°C from ${relevantForecasts.length} forecasts.`)

  // Determine heating duration. Scale linearly between min and full heating times depending on avg temperature.
  if (avgTemperature > HEATING_START_TEMP) {
    return 0
  } else if (avgTemperature < FULL_HEATING_TEMP) {
    return MAX_HEATING_TIME
  } else {
    const tempPercent = (avgTemperature - HEATING_START_TEMP) / (FULL_HEATING_TEMP - HEATING_START_TEMP)
    const heatingMinutes = tempPercent * (MAX_HEATING_TIME - MIN_HEATING_TIME) + MIN_HEATING_TIME
    return !isNaN(heatingMinutes) ? Math.round(heatingMinutes) : 0
  }
}
