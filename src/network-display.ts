import {getJson, postJson} from './coap'
import {parse} from 'url'
import {ZonedDateTime, LocalTime, ZoneId, ChronoUnit} from 'js-joda'
import Bacon = require('baconjs')
import {SensorEvents} from '@chacal/js-utils'
import ITemperatureEvent = SensorEvents.ITemperatureEvent
import {TempEventStream} from './index'

require('js-joda-timezone')

type VoltageStream = Bacon.EventStream<any, number>
type CombinedStream = Bacon.EventStream<any, { tempEvent: ITemperatureEvent, vcc: number }>

const DISPLAY_ADDRESS = '2001:2003:f0a2:9c9b:e3d2:e57d:c507:d253'
const TEMP_RENDERING_INTERVAL_MS = 2 * 60000
const VCC_POLLING_INTERVAL_MS = 10 * 60000


export function setupNetworkDisplay(tempEvents: TempEventStream) {
  const voltages = voltagesWithInterval()
  const temperatures = temperaturesWithInterval(tempEvents)
  const combined = Bacon.combineTemplate({
    tempEvent: temperatures,
    vcc: voltages
  }) as any as CombinedStream

  combined.onValue(v => renderOutsideTemp(v.tempEvent.temperature, v.vcc, localTimeFor(v.tempEvent.ts)))
}

function renderOutsideTemp(temperature: number, vcc: number, timestamp: LocalTime) {
  const tempStr = (temperature > 0 ? '+' : '-') + temperature
  const displayData = [
    {c: 's', i: 0, x: 0, y: 8, font: 8, msg: `Outside`},
    {c: 's', i: 1, x: 0, y: 40, font: 24, msg: `${tempStr}C`},
    {c: 's', i: 2, x: 94, y: 64, font: 8, msg: `${vcc / 1000}V`},
    {c: 's', i: 3, x: 0, y: 64, font: 8, msg: timestamp.truncatedTo(ChronoUnit.MINUTES)}
  ]
  console.log(`Sending temperature: ${tempStr}C`)
  postJson(parse(`coap://[${DISPLAY_ADDRESS}]/api/display`), displayData, false)
}

function voltagesWithInterval(): VoltageStream {
  return Bacon.once('').concat(Bacon.interval(VCC_POLLING_INTERVAL_MS, ''))
    .flatMapLatest(() => Bacon.fromPromise(getJson(parse(`coap://[${DISPLAY_ADDRESS}]/api/status`))))
    .map(res => JSON.parse(res.payload).vcc)
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