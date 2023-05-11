import { fromBinder } from 'baconjs'
import { fetchNordPoolSpotPrices, SpotPrice } from 'pohjoisallas'
import { CronJob } from 'cron'
import { identity, noop, range } from 'lodash'
import { addHours, isEqual, startOfHour } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'

const PRICE_FETCH_CRON_EXPRESSION = '0,30 * * * *'
const TZ = 'Europe/Helsinki'

export function createElectricityPricesStream() {
  return fromBinder<SpotPrice[]>(sink => {
    const job = new CronJob(PRICE_FETCH_CRON_EXPRESSION, fetchPrices, noop, true, 'UTC', null, true)
    return () => {
      job.stop()
    }

    function fetchPrices() {
      fetchNordPoolSpotPrices()
        .then(prices => sink(prices))
    }
  })
}

export function getCurrentPrice(prices: SpotPrice[]): SpotPrice | undefined {
  return priceForDate(prices, startOfCurrentHour())
}

export function getNPricesFromCurrentHourForward(prices: SpotPrice[], count: number) {
  return range(count)
    .map(i => priceForDate(prices, addHours(startOfCurrentHour(), i)))
    .filter(identity) as SpotPrice[]
}

export function retailPrice(spotPrice: SpotPrice) {
  // 24% VAT + 0.4c/kWh commission + 3.14 c/kWh transfer + 2,79372 c/kWh electricity tax
  return 1.24 * (spotPrice.price / 10) + 0.4 + 3.14 + 2.79372
}

function priceForDate(prices: SpotPrice[], date: Date) {
  return prices.find(p => isEqual(p.start, date))
}

function startOfCurrentHour(): Date {
  return startOfHour(utcToZonedTime(new Date(), TZ))
}