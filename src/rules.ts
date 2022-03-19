import { EventStream, later } from 'baconjs'
import { SensorEvents } from '@chacal/js-utils'
import { LocalTime } from '@js-joda/core'
import ISensorEvent = SensorEvents.ISensorEvent
import IPirEvent = SensorEvents.IPirEvent
import { turnOn, turnOff, applyScene } from './houm'
import { Lights } from './Lights'
import { Scenes } from './Scenes'


type SensorEventStream = EventStream<ISensorEvent>
type PirEventStream = EventStream<IPirEvent>

const PIR_TURN_ON_DEBOUNCE_MS = 15000
const PIR_TURN_OFF_DELAY_MS = 120000


export function setupUpstairsToilet(sensorEvents: SensorEventStream) {
  const INSTANCE1 = 'P304'
  const INSTANCE2 = 'P308'
  const TAG = 'k'

  const pirEvents = recentEventsByInstanceAndTag(sensorEvents, INSTANCE1, TAG)
    .merge(recentEventsByInstanceAndTag(sensorEvents, INSTANCE2, TAG)) as PirEventStream

  setupPirLights(pirEvents,
    () => turnOn(Lights.Upstairs.Toilet.LEDStrip, 255),
    () => turnOff(Lights.Upstairs.Toilet.LEDStrip)
  )
}

export function setupDownstairsToilet(sensorEvents: SensorEventStream) {
  const INSTANCE1 = 'P302'
  const INSTANCE2 = 'P303'
  const INSTANCE3 = 'P306'
  const INSTANCE4 = 'P307'
  const TAG = 'k'

  const dayModeStart = () => LocalTime.of(6, 15)
  const dayModeEnd = () => LocalTime.of(23, 0)
  const isDayTime = () => LocalTime.now().isAfter(dayModeStart()) && LocalTime.now().isBefore(dayModeEnd())

  const pirEvents = recentEventsByInstanceAndTag(sensorEvents, INSTANCE1, TAG)
    .merge(recentEventsByInstanceAndTag(sensorEvents, INSTANCE2, TAG))
    .merge(recentEventsByInstanceAndTag(sensorEvents, INSTANCE3, TAG))
    .merge(recentEventsByInstanceAndTag(sensorEvents, INSTANCE4, TAG)) as PirEventStream
  const dayPirEvents = pirEvents.filter(isDayTime)
  const nightPirEvents = pirEvents.filter(() => !isDayTime())

  setupPirLights(dayPirEvents,
    () => applyScene(Scenes.Downstairs.Toilet.Bright),
    () => applyScene(Scenes.Downstairs.Toilet.Off)
  )

  setupPirLights(nightPirEvents,
    () => applyScene(Scenes.Downstairs.Toilet.Dim),
    () => applyScene(Scenes.Downstairs.Toilet.Off)
  )
}

export function setupStorage(sensorEvents: SensorEventStream) {
  const INSTANCE1 = 'P301'
  const INSTANCE2 = 'P309'
  const TAG = 'k'

  const pirEvents = recentEventsByInstanceAndTag(sensorEvents, INSTANCE1, TAG)
    .merge(recentEventsByInstanceAndTag(sensorEvents, INSTANCE2, TAG)) as PirEventStream

  setupPirLights(pirEvents,
    () => turnOn(Lights.Upstairs.Storage.Ceiling, 255),
    () => turnOff(Lights.Upstairs.Storage.Ceiling)
  )
}

function setupPirLights(pirEvents: PirEventStream, onHandler: () => void, offHandler: () => void) {
  pirEvents
    .filter(e => e.motionDetected)
    .debounceImmediate(PIR_TURN_ON_DEBOUNCE_MS)
    // .doAction(e => console.log(`ON: ${JSON.stringify(e)}`))
    .onValue(onHandler)

  pirEvents
    .filter(e => e.motionDetected)
    .flatMapLatest(e => later(PIR_TURN_OFF_DELAY_MS, e))
    // .doAction(e => console.log(`OFF: ${JSON.stringify(e)}`))
    .onValue(offHandler)
}


function recentEventsByInstanceAndTag(sensorEvents: SensorEventStream, instance: string, tag: string): SensorEventStream {
  return sensorEvents.filter(e => e.instance === instance && e.tag === tag && isRecentEnough(e))

  function isRecentEnough(e: ISensorEvent) {
    return new Date(e.ts).getTime() > new Date().getTime() - 30000
  }
}
