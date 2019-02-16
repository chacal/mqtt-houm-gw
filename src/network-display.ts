import {getJson, postJson} from './coap'
import {parse} from 'url'
import {ZonedDateTime, LocalTime, ZoneId, ChronoUnit} from 'js-joda'
import Bacon = require('baconjs')
import {SensorEvents} from '@chacal/js-utils'
import ITemperatureEvent = SensorEvents.ITemperatureEvent
import {TempEventStream} from './index'

require('js-joda-timezone')

type DisplayStatus = { instance: string, vcc: number }
type StatusStream = Bacon.EventStream<any, DisplayStatus>
type CombinedStream = Bacon.EventStream<any, { tempEvent: ITemperatureEvent, status: DisplayStatus }>

const DISPLAY_ADDRESS = '2001:2003:f0a2:9c9b:e3d2:e57d:c507:d253'
const TEMP_RENDERING_INTERVAL_MS = 2 * 60000
const VCC_POLLING_INTERVAL_MS = 10 * 60000


export function setupNetworkDisplay(tempEvents: TempEventStream) {
  const statuses = statusesWithInterval()
  const temperatures = temperaturesWithInterval(tempEvents)
  const combined = Bacon.combineTemplate({
    tempEvent: temperatures,
    status: statuses
  }) as any as CombinedStream

  combined.onValue(v => renderOutsideTemp(v.tempEvent.temperature, v.status.vcc, v.status.instance, localTimeFor(v.tempEvent.ts)))
}

function renderOutsideTemp(temperature: number, vcc: number, instance: string, timestamp: LocalTime) {
  const tempStr = (temperature > 0 ? '+' : '-') + temperature
  const displayData = [
    {c: 's', i: 0, x: 0, y: 8, font: 8, msg: `Outside`},
    {c: 's', i: 1, x: 0, y: 40, font: 24, msg: `${tempStr}C`},
    {c: 's', i: 2, x: 94, y: 64, font: 8, msg: `${(vcc / 1000).toPrecision(4)}V`},
    {c: 's', i: 3, x: 0, y: 64, font: 8, msg: timestamp.truncatedTo(ChronoUnit.MINUTES)},
    {c: 's', i: 4, x: 104, y: 8, font: 8, msg: instance}
  ]
  console.log(`Sending temperature: ${tempStr}C`)
  postJson(parse(`coap://[${DISPLAY_ADDRESS}]/api/display`), displayData, false)
}

function statusesWithInterval(): StatusStream {
  return Bacon.once('').concat(Bacon.interval(VCC_POLLING_INTERVAL_MS, ''))
    .flatMapLatest(() => Bacon.fromPromise(getJson(parse(`coap://[${DISPLAY_ADDRESS}]/api/status`))))
    .map(res => JSON.parse(res.payload))
}

function temperaturesWithInterval(tempEvents: TempEventStream): TempEventStream {
  return tempEvents
    .first()
    .merge(tempEvents
      .toProperty()
      .sample(TEMP_RENDERING_INTERVAL_MS)
    )
}

function localTimeFor(timestamp: string): LocalTime {
  return ZonedDateTime
    .parse(timestamp)
    .withZoneSameInstant(ZoneId.of('Europe/Helsinki'))
    .toLocalTime()
}