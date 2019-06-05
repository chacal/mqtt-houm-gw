import {getJson} from './coap'
import {parse} from 'url'
import {ZonedDateTime, LocalTime, ZoneId, ChronoUnit, Duration} from 'js-joda'
import Bacon = require('baconjs')
import {SensorEvents} from '@chacal/js-utils'
import {TempEventStream} from './index'
import IThreadParentInfo = SensorEvents.IThreadParentInfo

require('js-joda-timezone')

type DisplayTag = 'd'
export type DisplayStatus = { instance: string, tag: DisplayTag, vcc: number, ts: string, parent: IThreadParentInfo }
export type StatusStream = Bacon.EventStream<any, DisplayStatus>

export function statusesWithInterval(displayAddress: string, interval: Duration): StatusStream {
  return Bacon.once('').concat(Bacon.interval(interval.toMillis(), ''))
    .flatMapLatest(() => Bacon.fromPromise(getJson(parse(`coap://[${displayAddress}]/api/status`))))
    .map(res => JSON.parse(res.payload))
    .map(ds => ({
      instance: ds.instance,
      tag: 'd' as DisplayTag,
      vcc: ds.vcc,
      ts: new Date().toISOString(),
      parent: ds.parent
    }))
}

export function temperaturesWithInterval(interval: Duration, tempEvents: TempEventStream): TempEventStream {
  return tempEvents
    .first()
    .merge(tempEvents
      .toProperty()
      .sample(interval.toMillis())
    )
}

export function localTimeFor(timestamp: string): LocalTime {
  return ZonedDateTime
    .parse(timestamp)
    .withZoneSameInstant(ZoneId.of('Europe/Helsinki'))
    .toLocalTime()
}