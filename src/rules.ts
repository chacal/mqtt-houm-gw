import Bacon = require('baconjs')
import {SensorEvents} from "@chacal/js-utils"
import ISensorEvent = SensorEvents.ISensorEvent
import IPirEvent = SensorEvents.IPirEvent
import {turnOn, turnOff} from "./houm"
import {Lights} from "./Lights"


type SensorEventStream = Bacon.EventStream<any, ISensorEvent>

const PIR_TURN_ON_DEBOUNCE_MS = 15000
const PIR_TURN_OFF_DELAY_MS = 60000


export function setupUpstairsToilet(sensorEvents: SensorEventStream) {
  const INSTANCE1 = 'P300'
  const INSTANCE2 = 'P301'
  const TAG = 'k'

  const pirEvents = recentEventsByInstanceAndTag(sensorEvents, INSTANCE1, TAG)
    .merge(recentEventsByInstanceAndTag(sensorEvents, INSTANCE2, TAG)) as Bacon.EventStream<any, IPirEvent>

  pirEvents
    .filter(e => e.motionDetected)
    .debounceImmediate(PIR_TURN_ON_DEBOUNCE_MS)
    .doAction(e => console.log(`ON: ${JSON.stringify(e)}`))
    .onValue(() => turnOn(Lights.Upstairs.Toilet.LEDStrip, 255))


  pirEvents
    .filter(e => e.motionDetected)
    .flatMapLatest(e => Bacon.later(PIR_TURN_OFF_DELAY_MS, e))
    .doAction(e => console.log(`OFF: ${JSON.stringify(e)}`))
    .onValue(() => turnOff(Lights.Upstairs.Toilet.LEDStrip))
}


function recentEventsByInstanceAndTag(sensorEvents: SensorEventStream, instance: string, tag: string): SensorEventStream {
  return sensorEvents.filter(e => e.instance === instance && e.tag === tag && isRecentEnough(e))

  function isRecentEnough(e: ISensorEvent) {
    return new Date(e.ts).getTime() > new Date().getTime() - 30000
  }
}
