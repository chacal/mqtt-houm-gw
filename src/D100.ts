import { parse } from 'url'
import { combineTemplate, EventStream } from 'baconjs'
import { ChronoUnit, Duration, LocalTime } from 'js-joda'
import { Coap, NetworkDisplay, SensorEvents } from '@chacal/js-utils'
import { EnvironmentEventStream } from './index'
import { environmentsWithInterval, localTimeFor } from './utils'
import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus
import IEnvironmentEvent = SensorEvents.IEnvironmentEvent

require('js-joda-timezone')

type CombinedStream = EventStream<{ environmentEvent: IEnvironmentEvent, status: NetworkDisplay.DisplayStatus }>

const DISPLAY_ADDRESS = '2001:2003:f0a2:9c9b:e3d2:e57d:c507:d253'
const TEMP_RENDERING_INTERVAL_MS = 2 * 60000
const VCC_POLLING_INTERVAL_MS = 10 * 60000


export default function setupNetworkDisplay(environmentEvents: EnvironmentEventStream, displayStatusCb: (s: IThreadDisplayStatus) => void) {
  const statuses = NetworkDisplay.statusesWithInterval(DISPLAY_ADDRESS, VCC_POLLING_INTERVAL_MS)
  const environments = environmentsWithInterval(Duration.ofMillis(TEMP_RENDERING_INTERVAL_MS), environmentEvents)
  const combined = combineTemplate({
    environmentEvent: environments,
    status: statuses
  }) as any as CombinedStream

  statuses.onValue(displayStatusCb)
  combined.onValue(v => renderOutsideTemp(v.environmentEvent.temperature, v.status.vcc, v.status.instance, localTimeFor(v.environmentEvent.ts)))
}

function renderOutsideTemp(temperature: number, vcc: number, instance: string, timestamp: LocalTime) {
  const tempStr = (temperature > 0 ? '+' : '') + temperature.toPrecision(3)
  const displayData = [
    { c: 'c' },
    { c: 's', i: 1, x: 0, y: 8, font: 8, msg: `Outside` },
    { c: 's', i: 2, x: 0, y: 33, font: 18, msg: `${tempStr}C` },
    { c: 's', i: 3, x: 50, y: 48, font: 8, msg: `${(vcc / 1000).toFixed(3)}V` },
    { c: 's', i: 4, x: 0, y: 48, font: 8, msg: timestamp.truncatedTo(ChronoUnit.MINUTES) },
    { c: 's', i: 5, x: 60, y: 8, font: 8, msg: instance }
  ]
  console.log(`Sending temperature ${tempStr}C to ${DISPLAY_ADDRESS}`)
  Coap.postJson(parse(`coap://[${DISPLAY_ADDRESS}]/api/display`), displayData, false)
}
