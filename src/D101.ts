import { parse } from 'url'
import { LocalTime, ChronoUnit, Duration } from 'js-joda'
import Bacon = require('baconjs')
import { SensorEvents, Coap, NetworkDisplay } from '@chacal/js-utils'
import ITemperatureEvent = SensorEvents.ITemperatureEvent
import { TempEventStream } from './index'
import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus
import { localTimeFor, temperaturesWithInterval } from './utils'

require('js-joda-timezone')

type CombinedStream = Bacon.EventStream<any, { tempEvent: ITemperatureEvent, status: NetworkDisplay.DisplayStatus }>

const DISPLAY_ADDRESS = '2001:2003:f0a2:9c9b:0a7b:c40f:550a:832f'
const TEMP_RENDERING_INTERVAL_MS = 10 * 61000
const VCC_POLLING_INTERVAL_MS = 10 * 60000


export default function setupNetworkDisplay(tempEvents: TempEventStream, displayStatusCb: (s: IThreadDisplayStatus) => void) {
  const statuses = NetworkDisplay.statusesWithInterval(DISPLAY_ADDRESS, VCC_POLLING_INTERVAL_MS)
  const temperatures = temperaturesWithInterval(Duration.ofMillis(TEMP_RENDERING_INTERVAL_MS), tempEvents)
  const combined = Bacon.combineTemplate({
    tempEvent: temperatures,
    status: statuses
  }) as any as CombinedStream

  statuses.onValue(displayStatusCb)
  combined.onValue(v => renderOutsideTemp(v.tempEvent.temperature, v.status.vcc, v.status.instance, localTimeFor(v.tempEvent.ts)))
}

function renderOutsideTemp(temperature: number, vcc: number, instance: string, timestamp: LocalTime) {
  const tempStr = (temperature > 0 ? '+' : '') + temperature.toPrecision(3)
  const displayData = [
    { c: 'c' },
    { c: 's', i: 1, x: 5, y: 23, font: 18, msg: `Outside` },
    { c: 's', i: 2, x: 50, y: 80, font: 35, msg: `${tempStr}C` },
    { c: 's', i: 3, x: 215, y: 123, font: 18, msg: `${(vcc / 1000).toFixed(3)}V` },
    { c: 's', i: 4, x: 5, y: 123, font: 18, msg: timestamp.truncatedTo(ChronoUnit.MINUTES) },
    { c: 's', i: 5, x: 235, y: 23, font: 18, msg: instance }
  ]
  console.log(`Sending temperature ${tempStr}C to ${DISPLAY_ADDRESS}`)
  Coap.postJson(parse(`coap://[${DISPLAY_ADDRESS}]/api/display`), displayData, false)
}
